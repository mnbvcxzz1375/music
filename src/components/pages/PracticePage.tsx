import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ScoreRenderer from '../ScoreRenderer/ScoreRenderer';
import PitchIndicator from '../PitchIndicator/PitchIndicator';
import PartSelector from '../PartSelector/PartSelector';
import { Calibration } from '../Calibration';
import { Button } from '../UI';
import { ScoreRendererHandle } from '../ScoreRenderer/types';
import { AudioCapture } from '@/audio/AudioCapture';
import { PitchDetector } from '@/audio/detection/PitchDetector';
import { PracticeEngine } from '@/engine/practice/PracticeEngine';
import { getSettingsManager } from '@/services/settings/SettingsManager';
import { CalibrationManager } from '@/services/calibration/CalibrationManager';
import { MusicXMLParser } from '@/services/parser/MusicXMLParser';
import { useStatisticsStore } from '@/services/statistics';
import type { PracticeSession } from '@/services/statistics/types';
import { useAchievementStore } from '@/services/achievements';
import { usePieceStore } from '@/services/piece';
import { useSubscriptionStore } from '@/services/subscription';
import { Score } from '@/types/score';

export interface PracticePageProps {
  xmlContent?: string;
  onComplete?: () => void;
}

export function PracticePage({ xmlContent, onComplete }: PracticePageProps) {
  const { pieceId } = useParams<{ pieceId: string }>();
  const navigate = useNavigate();

  const [isPlaying, setIsPlaying] = useState(false);
  const [showCalibration, setShowCalibration] = useState(false);
  const [showCalibrationPrompt, setShowCalibrationPrompt] = useState(false);
  const [skipAutoCalibrationPrompt, setSkipAutoCalibrationPrompt] = useState(false);
  const [score, setScore] = useState<Score | null>(null);
  const [selectedPartId, setSelectedPartId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'controls' | 'parts' | 'stats'>('controls');

  const [detectedPitch, setDetectedPitch] = useState<number | null>(null);
  const [expectedPitch, setExpectedPitch] = useState<number | null>(null);
  const [centsDeviation, setCentsDeviation] = useState<number | null>(null);
  const [confidence, setConfidence] = useState<number>(0);
  const [fetchedXml, setFetchedXml] = useState<string>('');

  const [progressInfo, setProgressInfo] = useState({
    position: 0,
    accuracy: 100,
    errorCount: 0,
    totalNotes: 0,
    correctNotes: 0,
    pitchErrors: 0,
    rhythmErrors: 0,
  });
  const [tempo, setTempo] = useState(120);
  const [practiceStartTime, setPracticeStartTime] = useState<Date | null>(null);
  const [pieceTitle, setPieceTitle] = useState<string>('未选择曲目');

  const scoreRef = useRef<ScoreRendererHandle>(null);
  const audioCaptureRef = useRef<AudioCapture | null>(null);
  const pitchDetectorRef = useRef<PitchDetector | null>(null);

  const settingsManager = useMemo(() => getSettingsManager(), []);
  const practiceEngine = useMemo(() => new PracticeEngine(), []);

  const { addSession, stats } = useStatisticsStore();
  const { checkAchievements } = useAchievementStore();
  const { fetchPieceById, currentPiece } = usePieceStore();
  const { isPremium } = useSubscriptionStore();

  const defaultXml = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <part-list>
    <score-part id="P1">
      <part-name>Piano</part-name>
    </score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <key><fifths>0</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
      <note><pitch><step>F</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
    </measure>
    <measure number="2">
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
      <note><pitch><step>A</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
      <note><pitch><step>B</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>1</duration><type>quarter</type></note>
    </measure>
  </part>
</score-partwise>`;

  useEffect(() => {
    if (pieceId) {
      fetchPieceById(pieceId);
    }
  }, [pieceId, fetchPieceById]);

  useEffect(() => {
    if (currentPiece) {
      setPieceTitle(currentPiece.title);
      if (currentPiece.musicXmlUrl) {
        fetch(currentPiece.musicXmlUrl)
          .then(res => res.text())
          .then(xml => {
            const parser = new MusicXMLParser();
            const parsedScore = parser.parse(xml);
            setScore(parsedScore);
            setFetchedXml(xml);
            if (parsedScore.parts.length > 0) {
              setSelectedPartId(parsedScore.parts[0].id);
            }
          })
          .catch(e => console.error('Failed to load piece XML', e));
      }
    }
  }, [currentPiece]);

  useEffect(() => {
    if (!pieceId && !xmlContent) {
      const parser = new MusicXMLParser();
      const xml = defaultXml;
      try {
        const parsedScore = parser.parse(xml);
        setScore(parsedScore);
        setPieceTitle('示例曲目');
        if (parsedScore.parts.length > 0) {
          setSelectedPartId(parsedScore.parts[0].id);
        }
      } catch (e) {
        console.error('Failed to parse default score', e);
      }
    } else if (xmlContent) {
      const parser = new MusicXMLParser();
      try {
        const parsedScore = parser.parse(xmlContent);
        setScore(parsedScore);
        if (parsedScore.parts.length > 0) {
          setSelectedPartId(parsedScore.parts[0].id);
        }
      } catch (e) {
        console.error('Failed to parse score', e);
      }
    }

    const calibManager = new CalibrationManager();
    const promptDisabled = localStorage.getItem('resonance:disable-auto-calibration-prompt') === 'true';
    if (calibManager.needsCalibration() && !promptDisabled) {
      setShowCalibrationPrompt(true);
    }
  }, [xmlContent, pieceId, defaultXml]);

  const dismissCalibrationPrompt = () => {
    if (skipAutoCalibrationPrompt) {
      localStorage.setItem('resonance:disable-auto-calibration-prompt', 'true');
    }
    setShowCalibrationPrompt(false);
  };

  const startCalibrationFromPrompt = () => {
    if (skipAutoCalibrationPrompt) {
      localStorage.setItem('resonance:disable-auto-calibration-prompt', 'true');
    }
    setShowCalibrationPrompt(false);
    setShowCalibration(true);
  };

  const recordPracticeSession = useCallback(() => {
    if (!practiceStartTime) return;

    const endTime = new Date();
    const durationSeconds = Math.floor((endTime.getTime() - practiceStartTime.getTime()) / 1000);

    if (durationSeconds < 10) return;

    const sessionData: PracticeSession = {
      id: `session-${Date.now()}`,
      userId: 'current-user',
      pieceId: pieceId || 'demo',
      pieceTitle: pieceTitle,
      startTime: practiceStartTime,
      endTime,
      durationSeconds,
      totalNotes: progressInfo.totalNotes,
      correctNotes: progressInfo.correctNotes,
      pitchErrors: progressInfo.pitchErrors,
      rhythmErrors: progressInfo.rhythmErrors,
      accuracy: progressInfo.accuracy,
      tempo,
      mode: 'normal',
      retries: 0,
      averagePitchDeviation: 0,
      averageTimingDeviation: 0,
      errors: [],
      settings: { tempo, mode: 'normal', partId: 'default' },
      createdAt: new Date(),
    };

    addSession(sessionData);

    const newStats = {
      totalSessions: stats.totalSessions + 1,
      totalDuration: stats.totalDuration + durationSeconds,
      averageAccuracy: (stats.averageAccuracy * stats.totalSessions + progressInfo.accuracy) / (stats.totalSessions + 1),
      streakDays: useStatisticsStore.getState().getStreakDays(),
      totalPieces: new Set(useStatisticsStore.getState().sessions.map(s => s.pieceId)).size,
    };

    checkAchievements(newStats);
  }, [practiceStartTime, pieceId, pieceTitle, progressInfo, tempo, addSession, stats, checkAchievements]);

  const handleStartPractice = async () => {
    if (currentPiece?.isPremium && !isPremium()) {
      alert('此曲目为 VIP 专属内容，请先升级为 VIP 会员');
      navigate('/subscription');
      return;
    }

    if (!audioCaptureRef.current) {
      audioCaptureRef.current = new AudioCapture();
    }

    if (!pitchDetectorRef.current) {
      const settings = settingsManager.getSettings();
      pitchDetectorRef.current = new PitchDetector({
        sampleRate: 44100,
        yinThreshold: 0.1,
        minFrequency: 80,
        maxFrequency: 1000,
        confidenceThreshold: settings.practice.pitchTolerance > 0 ? 0.5 : 0.7,
      });

      pitchDetectorRef.current.onDetection = (result) => {
        setDetectedPitch(result.midiNumber);
        setCentsDeviation(result.centsDeviation);
        setConfidence(result.confidence);
        if (result.midiNumber) {
          setExpectedPitch(result.midiNumber);
        }
      };

      pitchDetectorRef.current.attachToSampleStream(audioCaptureRef.current);
    }

    try {
      await audioCaptureRef.current.start();
      practiceEngine.start();
      setIsPlaying(true);
      setPracticeStartTime(new Date());
      scoreRef.current?.showCursor();

      const interval = setInterval(
        () => {
          practiceEngine.advanceNote(true);
          const progress = practiceEngine.getProgressInfo();
          setProgressInfo({
            ...progress,
            totalNotes: progress.totalNotes || progress.position,
            correctNotes: progress.correctNotes || (progress.totalNotes - progress.errorCount),
            pitchErrors: progress.pitchErrors || Math.floor(progress.errorCount * 0.6),
            rhythmErrors: progress.rhythmErrors || Math.floor(progress.errorCount * 0.4),
          });
          if (practiceEngine.isComplete()) {
            clearInterval(interval);
            handleStopPractice();
            onComplete?.();
          }
        },
        (60 / tempo) * 1000
      );

      (window as Window & { _practiceInterval?: NodeJS.Timeout })._practiceInterval = interval;
    } catch (err) {
      console.error('Failed to start audio capture:', err);
      alert('需要麦克风权限才能开始练习');
    }
  };

  const handleStopPractice = () => {
    setIsPlaying(false);
    recordPracticeSession();
    setPracticeStartTime(null);

    if (audioCaptureRef.current) {
      audioCaptureRef.current.stop();
    }
    scoreRef.current?.hideCursor();
    scoreRef.current?.resetCursor();
    clearInterval((window as Window & { _practiceInterval?: NodeJS.Timeout })._practiceInterval);

    setDetectedPitch(null);
    setExpectedPitch(null);
    setCentsDeviation(null);
    setConfidence(0);
  };

  const handleFinishPractice = () => {
    handleStopPractice();
    navigate('/statistics');
  };

  return (
    <div className="practice-layout">
      <header className="practice-topbar">
        <div className="practice-topbar-left">
          {pieceId && (
            <Button variant="secondary" onClick={() => navigate('/library')} size="small">
              ← 返回曲库
            </Button>
          )}
          <div className="practice-topbar-title">
            <span>练习工作台</span>
            <strong>{pieceTitle}</strong>
          </div>
        </div>
        <div className="practice-topbar-right">
          <Button variant="ghost" onClick={() => setShowCalibration(true)} size="small">
            校准
          </Button>
        </div>
      </header>

      <main className="practice-main">
        <div className="practice-hero">
          <div className="practice-score-wrapper">
            <div className="score-container">
              <ScoreRenderer
                ref={scoreRef}
                xml={xmlContent || fetchedXml || defaultXml}
                highlightColor="#1db954"
              />
            </div>
          </div>
          
          {isPlaying && (
            <div className="pitch-indicator-wrapper">
              <PitchIndicator
                centsDeviation={centsDeviation}
                expectedPitch={expectedPitch}
                detectedPitch={detectedPitch}
                confidence={confidence}
              />
            </div>
          )}
        </div>

        <aside className="practice-sidebar">
          <div className="practice-piece-info">
            <h2 className="practice-piece-title">{pieceTitle}</h2>
            <p className="practice-piece-composer">{currentPiece?.composer || '未知作曲家'}</p>
          </div>

          <div className="practice-tabs">
            <button 
              className={`practice-tab-btn ${activeTab === 'controls' ? 'active' : ''}`}
              onClick={() => setActiveTab('controls')}
            >
              控制
            </button>
            <button 
              className={`practice-tab-btn ${activeTab === 'parts' ? 'active' : ''}`}
              onClick={() => setActiveTab('parts')}
            >
              声部
            </button>
            <button 
              className={`practice-tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
              onClick={() => setActiveTab('stats')}
            >
              统计
            </button>
          </div>

          <div className="practice-sidebar-content">
            {activeTab === 'controls' && (
              <div className="practice-controls">
                {!isPlaying ? (
                  <button className="practice-play-btn gold" onClick={handleStartPractice} aria-label="Play">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </button>
                ) : (
                  <button className="practice-stop-btn" onClick={handleStopPractice} aria-label="Stop">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M6 6h12v12H6z" />
                    </svg>
                  </button>
                )}

                <div className="tempo-control">
                  <div className="tempo-header">
                    <span>速度</span>
                    <span>{tempo} BPM</span>
                  </div>
                  <input
                    type="range"
                    className="tempo-slider"
                    min="40"
                    max="240"
                    value={tempo}
                    onChange={(e) => setTempo(parseInt(e.target.value))}
                    disabled={isPlaying}
                  />
                </div>

                {!isPlaying && practiceStartTime === null && progressInfo.totalNotes > 0 && (
                  <Button variant="secondary" fullWidth onClick={handleFinishPractice} style={{ marginTop: 16 }}>
                    查看完整统计
                  </Button>
                )}
              </div>
            )}

            {activeTab === 'parts' && score && (
              <PartSelector
                score={score}
                selectedPartId={selectedPartId}
                onPartChange={setSelectedPartId}
              />
            )}

            {activeTab === 'stats' && (
              <div className="practice-stats">
                <div className="stat-item">
                  <span className="stat-item-value">{progressInfo.accuracy.toFixed(0)}%</span>
                  <span className="stat-item-label">准确率</span>
                </div>
                <div className="stat-item">
                  <span className="stat-item-value">{progressInfo.errorCount}</span>
                  <span className="stat-item-label">错误数</span>
                </div>
                <div className="stat-item">
                  <span className="stat-item-value">{progressInfo.totalNotes}</span>
                  <span className="stat-item-label">总音符</span>
                </div>
                <div className="stat-item">
                  <span className="stat-item-value">{progressInfo.correctNotes}</span>
                  <span className="stat-item-label">正确数</span>
                </div>
                
                {practiceStartTime && (
                  <div className="stat-item" style={{ gridColumn: '1 / -1' }}>
                    <span className="stat-item-value">
                      {Math.floor((new Date().getTime() - practiceStartTime.getTime()) / 1000)}s
                    </span>
                    <span className="stat-item-label">本次时长</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>
      </main>

      {showCalibration && (
        <Calibration
          onComplete={() => setShowCalibration(false)}
          onCancel={() => setShowCalibration(false)}
        />
      )}

      {showCalibrationPrompt && !showCalibration && (
        <div className="calibration-overlay">
          <div className="calibration-prompt-modal" role="dialog" aria-modal="true" aria-labelledby="calibration-prompt-title">
            <div className="calibration-prompt-icon">校</div>
            <div className="calibration-prompt-copy">
              <h2 id="calibration-prompt-title">是否现在校准麦克风？</h2>
              <p>
                校准可以改善音准检测，但不是每次练习都必须执行。环境噪声或输入音量变化时，也可以稍后点击右上角“校准”手动调整。
              </p>
            </div>

            <label className="calibration-prompt-checkbox">
              <input
                type="checkbox"
                checked={skipAutoCalibrationPrompt}
                onChange={(event) => setSkipAutoCalibrationPrompt(event.target.checked)}
              />
              <span>以后不再自动提示</span>
            </label>

            <div className="calibration-prompt-actions">
              <button type="button" className="button-base button-secondary button-medium" onClick={dismissCalibrationPrompt}>
                暂不校准
              </button>
              <button type="button" className="button-base button-primary button-medium" onClick={startCalibrationFromPrompt}>
                开始校准
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
