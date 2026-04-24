import React, { useState, useEffect, useRef } from 'react'
import { CalibrationManager } from '../../services/calibration/CalibrationManager'
import { AudioCapture } from '../../audio/AudioCapture'
import { InstrumentType } from '../../services/calibration/types'

export interface CalibrationProps {
  onComplete: () => void
  onCancel?: () => void
}

export const Calibration: React.FC<CalibrationProps> = ({ onComplete, onCancel }) => {
  const [manager] = useState(() => new CalibrationManager())
  const [progress, setProgress] = useState(manager.getProgress())
  const [settings, setSettings] = useState(manager.getSettings())
  const [isMeasuring, setIsMeasuring] = useState(false)
  const [measurementProgress, setMeasurementProgress] = useState(0)
  const [volumeLevel, setVolumeLevel] = useState(0)
  const audioCaptureRef = useRef<AudioCapture | null>(null)

  useEffect(() => {
    manager.setOnSettingsChange((newSettings) => {
      setSettings(newSettings)
    })
    manager.start()
    setProgress(manager.getProgress())

    return () => {
      if (audioCaptureRef.current) {
        audioCaptureRef.current.stop()
      }
    }
  }, [manager])

  const currentStep = progress.steps[progress.currentStep]

  const handleNext = () => {
    if (manager.nextStep()) {
      setProgress(manager.getProgress())
    } else if (progress.currentStep === progress.totalSteps - 1) {
      manager.complete()
      onComplete()
    }
  }

  const handlePrevious = () => {
    if (manager.previousStep()) {
      setProgress(manager.getProgress())
    }
  }

  const startAudioCapture = async (onSamples: (samples: Float32Array) => void) => {
    if (!audioCaptureRef.current) {
      audioCaptureRef.current = new AudioCapture()
    }

    const capture = audioCaptureRef.current

    if (!capture.isActive()) {
      await capture.start()
    }

    capture.onSamples = onSamples
  }

  const stopAudioCapture = () => {
    if (audioCaptureRef.current && audioCaptureRef.current.isActive()) {
      audioCaptureRef.current.stop()
    }
  }

  const measureNoise = async () => {
    setIsMeasuring(true)
    setMeasurementProgress(0)

    let totalSamples = 0
    const targetSamples = 44100 * 3 // 3 seconds assuming 44.1kHz

    await startAudioCapture((samples) => {
      manager.measureNoise(samples)
      totalSamples += samples.length

      const progress = Math.min(100, Math.round((totalSamples / targetSamples) * 100))
      setMeasurementProgress(progress)

      if (totalSamples >= targetSamples) {
        stopAudioCapture()
        setIsMeasuring(false)
      }
    })
  }

  const calibrateGain = async () => {
    setIsMeasuring(true)
    setMeasurementProgress(0)

    let totalSamples = 0
    const targetSamples = 44100 * 5 // 5 seconds

    await startAudioCapture((samples) => {
      const result = manager.calibrateGain(samples)
      setVolumeLevel(result.signalLevelDb)
      totalSamples += samples.length

      const progress = Math.min(100, Math.round((totalSamples / targetSamples) * 100))
      setMeasurementProgress(progress)

      if (totalSamples >= targetSamples) {
        stopAudioCapture()
        setIsMeasuring(false)
      }
    })
  }

  const renderStepContent = () => {
    switch (currentStep.id) {
      case 'intro':
        return (
          <div className="calib-content">
            <p className="calib-text">Welcome to the Audio Calibration Wizard.</p>
            <p className="calib-text">
              This process will configure your microphone for optimal pitch and rhythm detection.
              Ensure you are in a quiet environment before proceeding.
            </p>
          </div>
        )

      case 'instrument': {
        const instruments: InstrumentType[] = [
          'piano',
          'guitar',
          'violin',
          'flute',
          'trumpet',
          'voice',
          'other',
        ]
        return (
          <div className="calib-content">
            <p className="calib-text">Select your instrument:</p>
            <div className="calib-grid">
              {instruments.map((inst) => (
                <button
                  key={inst}
                  className={`calib-btn-instrument ${settings.instrumentType === inst ? 'active' : ''}`}
                  onClick={() => manager.selectInstrument(inst)}
                >
                  {inst.charAt(0).toUpperCase() + inst.slice(1)}
                </button>
              ))}
            </div>
          </div>
        )
      }

      case 'noise':
        return (
          <div className="calib-content">
            <p className="calib-text">
              Please remain silent while we measure the ambient noise in your room.
            </p>
            <div className="calib-measurement">
              <p className="calib-label">Noise Floor: {settings.noiseFloor.toFixed(1)} dB</p>

              {!isMeasuring && measurementProgress === 0 && (
                <button className="calib-btn-action" onClick={measureNoise}>
                  Start Measurement
                </button>
              )}

              {isMeasuring && (
                <div className="calib-progress-bar">
                  <div
                    className="calib-progress-fill"
                    style={{ width: `${measurementProgress}%` }}
                  ></div>
                </div>
              )}

              {!isMeasuring && measurementProgress === 100 && (
                <div className="calib-success">Measurement Complete ✓</div>
              )}
            </div>
          </div>
        )

      case 'gain':
        return (
          <div className="calib-content">
            <p className="calib-text">Play your instrument at your typical practice volume.</p>
            <div className="calib-measurement">
              <p className="calib-label">Input Gain: {(settings.inputGain * 100).toFixed(0)}%</p>
              <p className="calib-label">
                Current Level: {volumeLevel === 0 ? '--' : volumeLevel.toFixed(1)} dB
              </p>

              {!isMeasuring && measurementProgress === 0 && (
                <button className="calib-btn-action" onClick={calibrateGain}>
                  Start Calibration
                </button>
              )}

              {isMeasuring && (
                <div className="calib-progress-bar">
                  <div
                    className="calib-progress-fill"
                    style={{ width: `${measurementProgress}%`, backgroundColor: '#e67e22' }}
                  ></div>
                </div>
              )}

              {!isMeasuring && measurementProgress === 100 && (
                <div className="calib-success">Calibration Complete ✓</div>
              )}
            </div>
          </div>
        )

      case 'complete':
        return (
          <div className="calib-content">
            <h3 className="calib-title-success">All Set!</h3>
            <p className="calib-text">Your audio environment is perfectly calibrated.</p>
            <ul className="calib-summary">
              <li>Instrument: {settings.instrumentType}</li>
              <li>Noise Floor: {settings.noiseFloor.toFixed(1)} dB</li>
              <li>Gain: {(settings.inputGain * 100).toFixed(0)}%</li>
            </ul>
          </div>
        )

      default:
        return null
    }
  }

  const isNextDisabled = () => {
    if (currentStep.id === 'noise' && measurementProgress !== 100) return true
    if (currentStep.id === 'gain' && measurementProgress !== 100) return true
    return false
  }

  return (
    <div className="calibration-overlay">
      <div className="calibration-modal">
        <header className="calib-header">
          <h2 className="calib-title">{currentStep.name}</h2>
          <div className="calib-step-indicator">
            Step {progress.currentStep + 1} of {progress.totalSteps}
          </div>
        </header>

        <div className="calib-body">{renderStepContent()}</div>

        <footer className="calib-footer">
          <div className="calib-btn-group">
            {progress.currentStep > 0 && (
              <button className="calib-btn-secondary" onClick={handlePrevious}>
                Back
              </button>
            )}
            {onCancel && (
              <button className="calib-btn-text" onClick={onCancel}>
                Cancel
              </button>
            )}
          </div>
          <button
            className="calib-btn-primary"
            onClick={handleNext}
            disabled={isNextDisabled() || isMeasuring}
          >
            {progress.currentStep === progress.totalSteps - 1 ? 'Finish' : 'Next'}
          </button>
        </footer>
      </div>
    </div>
  )
}
