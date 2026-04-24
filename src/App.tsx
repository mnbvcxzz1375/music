import { useState, useEffect, useRef, useMemo } from 'react'
import ScoreRenderer from './components/ScoreRenderer/ScoreRenderer'
import PitchIndicator from './components/PitchIndicator/PitchIndicator'
import PartSelector from './components/PartSelector/PartSelector'
import { Calibration } from './components/Calibration'
import { ThemeProvider, ThemeToggle } from './components/Theme'
import { ScoreRendererHandle } from './components/ScoreRenderer/types'
import { AudioCapture } from './audio/AudioCapture'
import { PitchDetector } from './audio/detection/PitchDetector'
import { PracticeEngine } from './engine/practice/PracticeEngine'
import { getSettingsManager } from './services/settings/SettingsManager'
import { CalibrationManager } from './services/calibration/CalibrationManager'
import { MusicXMLParser } from './services/parser/MusicXMLParser'
import { simpleXml } from './assets/sampleXml'
import { Score } from './types/score'

function App() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [showCalibration, setShowCalibration] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [score, setScore] = useState<Score | null>(null)
  const [selectedPartId, setSelectedPartId] = useState<string>('')

  const [detectedPitch, setDetectedPitch] = useState<number | null>(null)
  const [expectedPitch, setExpectedPitch] = useState<number | null>(null)
  const [centsDeviation, setCentsDeviation] = useState<number | null>(null)
  const [confidence, setConfidence] = useState<number>(0)

  const [progressInfo, setProgressInfo] = useState({ position: 0, accuracy: 100, errorCount: 0 })
  const [tempo, setTempo] = useState(120)

  const scoreRef = useRef<ScoreRendererHandle>(null)
  const audioCaptureRef = useRef<AudioCapture | null>(null)
  const pitchDetectorRef = useRef<PitchDetector | null>(null)

  const settingsManager = useMemo(() => getSettingsManager(), [])
  const practiceEngine = useMemo(() => new PracticeEngine(), [])

  useEffect(() => {
    try {
      const parser = new MusicXMLParser()
      const parsedScore = parser.parse(simpleXml)
      setScore(parsedScore)
      if (parsedScore.parts.length > 0) {
        setSelectedPartId(parsedScore.parts[0].id)
      }
    } catch (e) {
      console.error('Failed to parse score', e)
    }

    const calibManager = new CalibrationManager()
    if (calibManager.needsCalibration()) {
      setShowCalibration(true)
    }
  }, [settingsManager])

  const handleStartPractice = async () => {
    if (!audioCaptureRef.current) {
      audioCaptureRef.current = new AudioCapture()
    }

    if (!pitchDetectorRef.current) {
      const settings = settingsManager.getSettings()
      pitchDetectorRef.current = new PitchDetector({
        sampleRate: 44100,
        yinThreshold: 0.1,
        minFrequency: 80,
        maxFrequency: 1000,
        confidenceThreshold: settings.practice.pitchTolerance > 0 ? 0.5 : 0.7,
      })

      pitchDetectorRef.current.onDetection = (result) => {
        setDetectedPitch(result.midiNumber)
        setCentsDeviation(result.centsDeviation)
        setConfidence(result.confidence)

        if (result.midiNumber) {
          setExpectedPitch(result.midiNumber)
        }
      }

      pitchDetectorRef.current.attachToSampleStream(audioCaptureRef.current)
    }

    try {
      await audioCaptureRef.current.start()
      practiceEngine.start()
      setIsPlaying(true)
      scoreRef.current?.showCursor()

      const interval = setInterval(
        () => {
          practiceEngine.advanceNote(true)
          setProgressInfo(practiceEngine.getProgressInfo())

          if (practiceEngine.isComplete()) {
            clearInterval(interval)
            handleStopPractice()
          }
        },
        (60 / tempo) * 1000
      )

      ;(window as Window & { _practiceInterval?: NodeJS.Timeout })._practiceInterval = interval
    } catch (err) {
      console.error('Failed to start audio capture:', err)
      alert('Microphone access is required for practice.')
    }
  }

  const handleStopPractice = () => {
    setIsPlaying(false)
    if (audioCaptureRef.current) {
      audioCaptureRef.current.stop()
    }
    scoreRef.current?.hideCursor()
    scoreRef.current?.resetCursor()
    clearInterval((window as Window & { _practiceInterval?: NodeJS.Timeout })._practiceInterval)

    setDetectedPitch(null)
    setExpectedPitch(null)
    setCentsDeviation(null)
    setConfidence(0)
  }

  const renderSettingsModal = () => (
    <div className="calibration-overlay">
      <div className="settings-modal">
        <header className="calib-header">
          <h2 className="calib-title">Settings</h2>
        </header>
        <div className="settings-body">
          <div className="settings-group">
            <h4>Theme</h4>
            <ThemeToggle />
          </div>
          <div className="settings-group">
            <h4>Practice Settings</h4>
            <div className="control-group">
              <label className="control-label">
                <span>Tempo</span>
                <span>{tempo} BPM</span>
              </label>
              <input
                type="range"
                min="40"
                max="240"
                value={tempo}
                onChange={(e) => setTempo(parseInt(e.target.value))}
              />
            </div>
          </div>
          <div className="settings-group">
            <h4>Audio Configuration</h4>
            <button
              className="btn btn-block"
              onClick={() => {
                setShowSettings(false)
                setShowCalibration(true)
              }}
            >
              Run Calibration Wizard
            </button>
          </div>
        </div>
        <footer className="calib-footer" style={{ justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={() => setShowSettings(false)}>
            Close
          </button>
        </footer>
      </div>
    </div>
  )

  return (
    <ThemeProvider>
      <div className="app-container">
        <header className="header">
          <div className="brand">
            <h1>Resonance</h1>
            <p>Precision Practice Environment</p>
          </div>
          <div className="header-controls">
            <ThemeToggle />
            <button className="btn" onClick={() => setShowSettings(true)}>
              Settings
            </button>
          </div>
        </header>

        <main className="main-content">
          <div className="score-section">
            <div className="score-container">
              <div className="score-renderer-wrapper">
                <ScoreRenderer ref={scoreRef} xml={simpleXml} highlightColor="#d4af37" />
              </div>
            </div>

            {isPlaying && (
              <div className="pitch-wrapper">
                <PitchIndicator
                  centsDeviation={centsDeviation}
                  expectedPitch={expectedPitch}
                  detectedPitch={detectedPitch}
                  confidence={confidence}
                />
              </div>
            )}
          </div>

          <aside className="sidebar">
            <div className="panel">
              <h3 className="panel-title">Score Parts</h3>
              {score ? (
                <PartSelector
                  score={score}
                  selectedPartId={selectedPartId}
                  onPartChange={setSelectedPartId}
                />
              ) : (
                <p>Loading parts...</p>
              )}
            </div>

            <div className="panel">
              <h3 className="panel-title">Session Info</h3>
              <div className="stats-grid">
                <div className="stat-box">
                  <div className="stat-value">{progressInfo.accuracy.toFixed(0)}%</div>
                  <div className="stat-label">Accuracy</div>
                </div>
                <div className="stat-box">
                  <div className="stat-value">{progressInfo.errorCount}</div>
                  <div className="stat-label">Errors</div>
                </div>
              </div>
            </div>

            <div className="panel">
              <h3 className="panel-title">Controls</h3>

              <div className="control-group">
                <label className="control-label">
                  <span>Tempo</span>
                  <span>{tempo} BPM</span>
                </label>
                <input
                  type="range"
                  min="60"
                  max="200"
                  value={tempo}
                  onChange={(e) => setTempo(parseInt(e.target.value))}
                  disabled={isPlaying}
                />
              </div>

              <div className="control-group">
                {!isPlaying ? (
                  <button className="btn btn-accent btn-block" onClick={handleStartPractice}>
                    Start Practice
                  </button>
                ) : (
                  <button className="btn btn-danger btn-block" onClick={handleStopPractice}>
                    Stop Practice
                  </button>
                )}
              </div>
            </div>
          </aside>
        </main>

        {showCalibration && (
          <Calibration
            onComplete={() => setShowCalibration(false)}
            onCancel={() => setShowCalibration(false)}
          />
        )}

        {showSettings && renderSettingsModal()}
      </div>
    </ThemeProvider>
  )
}

export default App