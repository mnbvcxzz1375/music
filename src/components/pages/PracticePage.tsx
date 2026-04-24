import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ScoreRenderer from '../ScoreRenderer/ScoreRenderer';
import PitchIndicator from '../PitchIndicator/PitchIndicator';
import PartSelector from '../PartSelector/PartSelector';
import { Calibration } from '../Calibration';
import { Button, Card, CardContent, Tabs, TabItem } from '../UI';
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
  const [score, setScore] = useState<Score | null>(null);
  const [selectedPartId, setSelectedPartId] = useState<string>('');
  const [activeTab, setActiveTab] = useState('controls');

  const [detectedPitch, setDetectedPitch] = useState<number | null>(null);
  const [expectedPitch, setExpectedPitch] = useState<number | null>(null);
  const [centsDeviation, setCentsDeviation] = useState<number | null>(null);
  const [confidence, setConfidence] = useState<number>(0);

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
    if (calibManager.needsCalibration()) {
      setShowCalibration(true);
    }
  }, [xmlContent, pieceId, defaultXml]);

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

  const tabs: TabItem[] = [
    { id: 'controls', label: '控制' },
    { id: 'parts', label: '声部' },
    { id: 'stats', label: '统计' },
  ];

  return (
    <div className="practice-page">
      <header className="practice-header">
        <div className="practice-header-left">
          <h1 className="practice-title">练习模式</h1>
          <p className="practice-piece-name">{pieceTitle}</p>
        </div>
        <div className="practice-header-right">
          <Button variant="ghost" onClick={() => setShowCalibration(true)}>
            校准
          </Button>
          {pieceId && (
            <Button variant="secondary" onClick={() => navigate('/library')}>
              返回曲库
            </Button>
          )}
        </div>
      </header>

      <div className="practice-content">
        <div className="practice-score-section">
          <Card variant="outlined" padding="large">
            <div className="score-container">
              <ScoreRenderer
                ref={scoreRef}
                xml={xmlContent || (currentPiece?.musicXmlUrl ? '' : defaultXml)}
                highlightColor="#d4af37"
              />
            </div>
          </Card>

          {isPlaying && (
            <Card variant="default" padding="medium">
              <CardContent>
                <PitchIndicator
                  centsDeviation={centsDeviation}
                  expectedPitch={expectedPitch}
                  detectedPitch={detectedPitch}
                  confidence={confidence}
                />
              </CardContent>
            </Card>
          )}
        </div>

        <aside className="practice-sidebar">
          <Tabs
            items={tabs}
            activeId={activeTab}
            onChange={setActiveTab}
            variant="underline"
          />

          <Card variant="default" padding="medium">
            {activeTab === 'controls' && (
              <div className="practice-controls">
                <div className="control-group">
                  <label className="control-label">
                    <span>速度</span>
                    <span>{tempo} BPM</span>
                  </label>
                  <input
                    type="range"
                    min="40"
                    max="240"
                    value={tempo}
                    onChange={(e) => setTempo(parseInt(e.target.value))}
                    disabled={isPlaying}
                  />
                </div>

                <div className="control-group">
                  {!isPlaying ? (
                    <Button
                      variant="primary"
                      fullWidth
                      onClick={handleStartPractice}
                    >
                      开始练习
                    </Button>
                  ) : (
                    <Button variant="danger" fullWidth onClick={handleStopPractice}>
                      停止练习
                    </Button>
                  )}
                </div>

                {!isPlaying && practiceStartTime === null && progressInfo.totalNotes > 0 && (
                  <div className="control-group">
                    <Button variant="secondary" fullWidth onClick={handleFinishPractice}>
                      查看统计
                    </Button>
                  </div>
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
                <div className="stats-grid">
                  <div className="stat-box">
                    <div className="stat-value">
                      {progressInfo.accuracy.toFixed(0)}%
                    </div>
                    <div className="stat-label">准确率</div>
                  </div>
                  <div className="stat-box">
                    <div className="stat-value">{progressInfo.errorCount}</div>
                    <div className="stat-label">错误数</div>
                  </div>
                  <div className="stat-box">
                    <div className="stat-value">{progressInfo.totalNotes}</div>
                    <div className="stat-label">总音符</div>
                  </div>
                  <div className="stat-box">
                    <div className="stat-value">{progressInfo.correctNotes}</div>
                    <div className="stat-label">正确数</div>
                  </div>
                </div>

                {practiceStartTime && (
                  <div className="practice-duration">
                    <div className="stat-box">
                      <div className="stat-value">
                        {Math.floor((new Date().getTime() - practiceStartTime.getTime()) / 1000)}s
                      </div>
                      <div className="stat-label">练习时长</div>
                    </div>
                  </div>
                )}

                <div className="practice-session-stats">
                  <div className="stat-box">
                    <div className="stat-value">{stats.totalSessions}</div>
                    <div className="stat-label">总练习次数</div>
                  </div>
                  <div className="stat-box">
                    <div className="stat-value">{stats.streakDays}</div>
                    <div className="stat-label">连续天数</div>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </aside>
      </div>

      {showCalibration && (
        <Calibration
          onComplete={() => setShowCalibration(false)}
          onCancel={() => setShowCalibration(false)}
        />
      )}
    </div>
  );
}