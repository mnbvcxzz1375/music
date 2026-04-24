/**
 * Calibration Types
 *
 * Types for instrument calibration and audio setup
 */

/**
 * Instrument types for calibration
 */
export type InstrumentType =
  | 'piano'
  | 'guitar'
  | 'violin'
  | 'flute'
  | 'clarinet'
  | 'trumpet'
  | 'saxophone'
  | 'voice'
  | 'other'

/**
 * Calibration settings for audio input
 */
export interface CalibrationSettings {
  /** Input gain (0-1) */
  inputGain: number
  /** Noise floor level in dB */
  noiseFloor: number
  /** Instrument type */
  instrumentType: InstrumentType
  /** Sample rate in Hz */
  sampleRate: number
  /** Whether calibration is complete */
  isCalibrated: boolean
  /** Timestamp of last calibration */
  lastCalibrated?: number
}

/**
 * Calibration step status
 */
export type CalibrationStepStatus = 'pending' | 'in-progress' | 'complete' | 'error'

/**
 * Individual calibration step
 */
export interface CalibrationStep {
  id: string
  name: string
  description: string
  status: CalibrationStepStatus
  error?: string
}

/**
 * Calibration progress
 */
export interface CalibrationProgress {
  currentStep: number
  totalSteps: number
  steps: CalibrationStep[]
  isComplete: boolean
  hasError: boolean
}

/**
 * Noise measurement result
 */
export interface NoiseMeasurement {
  /** Measured noise floor in dB */
  noiseFloorDb: number
  /** RMS level */
  rmsLevel: number
  /** Peak level */
  peakLevel: number
  /** Duration of measurement in ms */
  duration: number
}

/**
 * Gain calibration result
 */
export interface GainCalibrationResult {
  /** Recommended input gain */
  recommendedGain: number
  /** Whether signal level is optimal */
  isOptimal: boolean
  /** Signal level in dB */
  signalLevelDb: number
  /** Clipping detected */
  clippingDetected: boolean
}

/**
 * Default calibration settings
 */
export const DEFAULT_CALIBRATION: CalibrationSettings = {
  inputGain: 0.5,
  noiseFloor: -60,
  instrumentType: 'piano',
  sampleRate: 44100,
  isCalibrated: false,
}
