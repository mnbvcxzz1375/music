/**
 * Calibration Manager
 *
 * Manages audio calibration workflow including noise measurement
 * and gain calibration
 */

import type {
  CalibrationSettings,
  CalibrationProgress,
  CalibrationStep,
  NoiseMeasurement,
  GainCalibrationResult,
  InstrumentType,
} from './types'

/**
 * Default calibration steps
 */
const DEFAULT_STEPS: Omit<CalibrationStep, 'status' | 'error'>[] = [
  {
    id: 'intro',
    name: 'Introduction',
    description: 'Welcome to calibration wizard',
  },
  {
    id: 'instrument',
    name: 'Instrument Selection',
    description: 'Select your instrument type',
  },
  {
    id: 'noise',
    name: 'Noise Measurement',
    description: 'Measuring ambient noise level',
  },
  {
    id: 'gain',
    name: 'Gain Calibration',
    description: 'Calibrating input gain',
  },
  {
    id: 'complete',
    name: 'Complete',
    description: 'Calibration finished',
  },
]

/**
 * CalibrationManager class
 *
 * Handles the calibration workflow
 */
export class CalibrationManager {
  private settings: CalibrationSettings
  private progress: CalibrationProgress
  private onSettingsChange?: (settings: CalibrationSettings) => void

  constructor(initialSettings?: Partial<CalibrationSettings>) {
    this.settings = {
      inputGain: 0.5,
      noiseFloor: -60,
      instrumentType: 'piano',
      sampleRate: 44100,
      isCalibrated: false,
      ...initialSettings,
    }

    this.progress = {
      currentStep: 0,
      totalSteps: DEFAULT_STEPS.length,
      steps: DEFAULT_STEPS.map((step) => ({
        ...step,
        status: 'pending' as const,
      })),
      isComplete: false,
      hasError: false,
    }
  }

  /**
   * Get current settings
   */
  getSettings(): CalibrationSettings {
    return { ...this.settings }
  }

  /**
   * Update settings
   */
  updateSettings(settings: Partial<CalibrationSettings>): void {
    this.settings = { ...this.settings, ...settings }
    this.onSettingsChange?.(this.settings)
  }

  /**
   * Get calibration progress
   */
  getProgress(): CalibrationProgress {
    return { ...this.progress }
  }

  /**
   * Start calibration process
   */
  start(): void {
    this.progress = {
      currentStep: 0,
      totalSteps: DEFAULT_STEPS.length,
      steps: DEFAULT_STEPS.map((step) => ({
        ...step,
        status: 'pending' as const,
      })),
      isComplete: false,
      hasError: false,
    }
    this.setStepStatus(0, 'in-progress')
  }

  /**
   * Move to next step
   */
  nextStep(): boolean {
    if (this.progress.currentStep >= this.progress.totalSteps - 1) {
      return false
    }

    // Mark current step as complete
    this.setStepStatus(this.progress.currentStep, 'complete')

    // Move to next step
    this.progress.currentStep++
    this.setStepStatus(this.progress.currentStep, 'in-progress')

    return true
  }

  /**
   * Move to previous step
   */
  previousStep(): boolean {
    if (this.progress.currentStep <= 0) {
      return false
    }

    this.setStepStatus(this.progress.currentStep, 'pending')
    this.progress.currentStep--
    this.setStepStatus(this.progress.currentStep, 'in-progress')

    return true
  }

  /**
   * Set step status
   */
  private setStepStatus(
    stepIndex: number,
    status: CalibrationStep['status'],
    error?: string
  ): void {
    if (stepIndex >= 0 && stepIndex < this.progress.steps.length) {
      this.progress.steps[stepIndex] = {
        ...this.progress.steps[stepIndex],
        status,
        error,
      }
      this.progress.hasError = this.progress.steps.some((s) => s.status === 'error')
    }
  }

  /**
   * Select instrument type
   */
  selectInstrument(type: InstrumentType): void {
    this.settings.instrumentType = type
    this.onSettingsChange?.(this.settings)
  }

  /**
   * Measure noise floor
   */
  measureNoise(audioSamples: Float32Array): NoiseMeasurement {
    // Calculate RMS level
    let sumSquares = 0
    let peak = 0

    for (let i = 0; i < audioSamples.length; i++) {
      const sample = Math.abs(audioSamples[i])
      sumSquares += sample * sample
      if (sample > peak) {
        peak = sample
      }
    }

    const rms = Math.sqrt(sumSquares / audioSamples.length)
    const rmsDb = 20 * Math.log10(Math.max(rms, 1e-10))


    const measurement: NoiseMeasurement = {
      noiseFloorDb: rmsDb,
      rmsLevel: rms,
      peakLevel: peak,
      duration: (audioSamples.length / this.settings.sampleRate) * 1000,
    }

    // Update settings
    this.settings.noiseFloor = rmsDb
    this.onSettingsChange?.(this.settings)

    return measurement
  }

  /**
   * Calibrate gain
   */
  calibrateGain(audioSamples: Float32Array, targetLevel: number = -12): GainCalibrationResult {
    // Calculate current signal level
    let sumSquares = 0
    let clippingCount = 0

    for (let i = 0; i < audioSamples.length; i++) {
      const sample = audioSamples[i]
      sumSquares += sample * sample
      if (Math.abs(sample) >= 0.99) {
        clippingCount++
      }
    }

    const rms = Math.sqrt(sumSquares / audioSamples.length)
    const signalDb = 20 * Math.log10(Math.max(rms, 1e-10))
    const clippingDetected = clippingCount > audioSamples.length * 0.001

    // Calculate recommended gain
    const gainAdjustment = targetLevel - signalDb
    const currentGain = this.settings.inputGain
    const recommendedGain = Math.max(
      0,
      Math.min(1, currentGain * Math.pow(10, gainAdjustment / 20))
    )

    const result: GainCalibrationResult = {
      recommendedGain,
      isOptimal: Math.abs(signalDb - targetLevel) < 6,
      signalLevelDb: signalDb,
      clippingDetected,
    }

    // Update settings if optimal
    if (result.isOptimal && !clippingDetected) {
      this.settings.inputGain = recommendedGain
      this.onSettingsChange?.(this.settings)
    }

    return result
  }

  /**
   * Complete calibration
   */
  complete(): CalibrationSettings {
    this.settings.isCalibrated = true
    this.settings.lastCalibrated = Date.now()
    this.progress.isComplete = true
    this.setStepStatus(this.progress.currentStep, 'complete')
    this.onSettingsChange?.(this.settings)
    return this.getSettings()
  }

  /**
   * Reset calibration
   */
  reset(): void {
    this.settings = {
      inputGain: 0.5,
      noiseFloor: -60,
      instrumentType: 'piano',
      sampleRate: 44100,
      isCalibrated: false,
    }
    this.progress = {
      currentStep: 0,
      totalSteps: DEFAULT_STEPS.length,
      steps: DEFAULT_STEPS.map((step) => ({
        ...step,
        status: 'pending' as const,
      })),
      isComplete: false,
      hasError: false,
    }
    this.onSettingsChange?.(this.settings)
  }

  /**
   * Set callback for settings changes
   */
  setOnSettingsChange(callback: (settings: CalibrationSettings) => void): void {
    this.onSettingsChange = callback
  }

  /**
   * Check if calibration is needed
   */
  needsCalibration(): boolean {
    if (!this.settings.isCalibrated) return true

    // Check if calibration is stale (older than 7 days)
    if (this.settings.lastCalibrated) {
      const daysSinceCalibration =
        (Date.now() - this.settings.lastCalibrated) / (1000 * 60 * 60 * 24)
      return daysSinceCalibration > 7
    }

    return true
  }

  /**
   * Get instrument-specific settings
   */
  getInstrumentDefaults(type: InstrumentType): Partial<CalibrationSettings> {
    const defaults: Record<InstrumentType, Partial<CalibrationSettings>> = {
      piano: { inputGain: 0.4, noiseFloor: -50 },
      guitar: { inputGain: 0.5, noiseFloor: -45 },
      violin: { inputGain: 0.6, noiseFloor: -45 },
      flute: { inputGain: 0.5, noiseFloor: -50 },
      clarinet: { inputGain: 0.5, noiseFloor: -45 },
      trumpet: { inputGain: 0.4, noiseFloor: -40 },
      saxophone: { inputGain: 0.5, noiseFloor: -45 },
      voice: { inputGain: 0.6, noiseFloor: -40 },
      other: { inputGain: 0.5, noiseFloor: -50 },
    }
    return defaults[type] || defaults.other
  }
}
