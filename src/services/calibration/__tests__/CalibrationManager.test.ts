import { describe, it, expect, beforeEach } from 'vitest'
import { CalibrationManager } from '../CalibrationManager'
import type { CalibrationSettings, InstrumentType } from '../types'

describe('CalibrationManager', () => {
  let manager: CalibrationManager

  beforeEach(() => {
    manager = new CalibrationManager()
  })

  describe('getSettings', () => {
    it('should return default settings on init', () => {
      const settings = manager.getSettings()
      expect(settings.inputGain).toBe(0.5)
      expect(settings.noiseFloor).toBe(-60)
      expect(settings.instrumentType).toBe('piano')
      expect(settings.isCalibrated).toBe(false)
    })

    it('should accept initial settings', () => {
      const customManager = new CalibrationManager({
        inputGain: 0.7,
        instrumentType: 'guitar',
      })
      const settings = customManager.getSettings()
      expect(settings.inputGain).toBe(0.7)
      expect(settings.instrumentType).toBe('guitar')
    })
  })

  describe('updateSettings', () => {
    it('should update settings', () => {
      manager.updateSettings({ inputGain: 0.8 })
      expect(manager.getSettings().inputGain).toBe(0.8)
    })

    it('should preserve unmodified settings', () => {
      manager.updateSettings({ inputGain: 0.8 })
      expect(manager.getSettings().noiseFloor).toBe(-60)
    })
  })

  describe('getProgress', () => {
    it('should return initial progress', () => {
      const progress = manager.getProgress()
      expect(progress.currentStep).toBe(0)
      expect(progress.totalSteps).toBe(5)
      expect(progress.isComplete).toBe(false)
    })
  })

  describe('start', () => {
    it('should initialize calibration process', () => {
      manager.start()
      const progress = manager.getProgress()
      expect(progress.currentStep).toBe(0)
      expect(progress.steps[0].status).toBe('in-progress')
    })
  })

  describe('nextStep', () => {
    it('should advance to next step', () => {
      manager.start()
      const result = manager.nextStep()
      expect(result).toBe(true)

      const progress = manager.getProgress()
      expect(progress.currentStep).toBe(1)
      expect(progress.steps[0].status).toBe('complete')
    })

    it('should return false at last step', () => {
      manager.start()
      for (let i = 0; i < 4; i++) {
        manager.nextStep()
      }
      const result = manager.nextStep()
      expect(result).toBe(false)
    })
  })

  describe('previousStep', () => {
    it('should go back to previous step', () => {
      manager.start()
      manager.nextStep()
      manager.nextStep()

      const result = manager.previousStep()
      expect(result).toBe(true)
      expect(manager.getProgress().currentStep).toBe(1)
    })

    it('should return false at first step', () => {
      manager.start()
      const result = manager.previousStep()
      expect(result).toBe(false)
    })
  })

  describe('selectInstrument', () => {
    it('should set instrument type', () => {
      manager.selectInstrument('violin')
      expect(manager.getSettings().instrumentType).toBe('violin')
    })
  })

  describe('measureNoise', () => {
    it('should measure noise floor from audio samples', () => {
      // Create silent audio (low noise)
      const samples = new Float32Array(1024).fill(0.001)

      const result = manager.measureNoise(samples)

      expect(result.noiseFloorDb).toBeLessThan(0)
      expect(result.rmsLevel).toBeGreaterThan(0)
      expect(result.duration).toBeGreaterThan(0)
    })

    it('should measure higher noise for louder samples', () => {
      const quietSamples = new Float32Array(1024).fill(0.001)
      const loudSamples = new Float32Array(1024).fill(0.1)

      const quietResult = manager.measureNoise(quietSamples)
      manager.reset()
      const loudResult = manager.measureNoise(loudSamples)

      expect(loudResult.noiseFloorDb).toBeGreaterThan(quietResult.noiseFloorDb)
    })

    it('should update settings noise floor', () => {
      const samples = new Float32Array(1024).fill(0.01)
      manager.measureNoise(samples)

      expect(manager.getSettings().noiseFloor).not.toBe(-60)
    })
  })

  describe('calibrateGain', () => {
    it('should return gain calibration result', () => {
      const samples = new Float32Array(1024)
      for (let i = 0; i < samples.length; i++) {
        samples[i] = Math.sin(i * 0.1) * 0.3
      }

      const result = manager.calibrateGain(samples)

      expect(result.signalLevelDb).toBeDefined()
      expect(result.recommendedGain).toBeGreaterThanOrEqual(0)
      expect(result.recommendedGain).toBeLessThanOrEqual(1)
    })

    it('should detect clipping', () => {
      const clippedSamples = new Float32Array(1024)
      for (let i = 0; i < 100; i++) {
        clippedSamples[i] = 1.0 // Clipped samples
      }

      const result = manager.calibrateGain(clippedSamples)
      expect(result.clippingDetected).toBe(true)
    })

    it('should identify optimal signal level', () => {
      const samples = new Float32Array(1024)
      for (let i = 0; i < samples.length; i++) {
        samples[i] = Math.sin(i * 0.1) * 0.2 // ~-14dB
      }

      const result = manager.calibrateGain(samples, -12)
      expect(result.isOptimal).toBe(true)
    })
  })

  describe('complete', () => {
    it('should mark calibration as complete', () => {
      manager.start()
      const settings = manager.complete()

      expect(settings.isCalibrated).toBe(true)
      expect(settings.lastCalibrated).toBeGreaterThan(0)
      expect(manager.getProgress().isComplete).toBe(true)
    })
  })

  describe('reset', () => {
    it('should reset all settings and progress', () => {
      manager.updateSettings({ inputGain: 0.8, instrumentType: 'guitar' })
      manager.start()
      manager.nextStep()

      manager.reset()

      const settings = manager.getSettings()
      expect(settings.inputGain).toBe(0.5)
      expect(settings.instrumentType).toBe('piano')
      expect(settings.isCalibrated).toBe(false)

      const progress = manager.getProgress()
      expect(progress.currentStep).toBe(0)
      expect(progress.isComplete).toBe(false)
    })
  })

  describe('needsCalibration', () => {
    it('should return true when not calibrated', () => {
      expect(manager.needsCalibration()).toBe(true)
    })

    it('should return false when recently calibrated', () => {
      manager.complete()
      expect(manager.needsCalibration()).toBe(false)
    })

    it('should return true when calibration is stale', () => {
      // Create manager with old calibration
      const oldDate = Date.now() - 8 * 24 * 60 * 60 * 1000 // 8 days ago
      const staleManager = new CalibrationManager({
        isCalibrated: true,
        lastCalibrated: oldDate,
      })
      expect(staleManager.needsCalibration()).toBe(true)
    })
  })

  describe('getInstrumentDefaults', () => {
    it('should return defaults for each instrument type', () => {
      const types: InstrumentType[] = ['piano', 'guitar', 'violin', 'flute', 'trumpet', 'voice']

      for (const type of types) {
        const defaults = manager.getInstrumentDefaults(type)
        expect(defaults.inputGain).toBeDefined()
        expect(defaults.noiseFloor).toBeDefined()
      }
    })

    it('should have different defaults for different instruments', () => {
      const pianoDefaults = manager.getInstrumentDefaults('piano')
      const trumpetDefaults = manager.getInstrumentDefaults('trumpet')

      // Piano and trumpet have different noise floors
      expect(pianoDefaults.noiseFloor).not.toBe(trumpetDefaults.noiseFloor)
    })

  })

  describe('setOnSettingsChange', () => {
    it('should call callback on settings change', () => {
      let calledSettings: CalibrationSettings | undefined
      manager.setOnSettingsChange((settings) => {
        calledSettings = settings
      })

      manager.updateSettings({ inputGain: 0.7 })
      expect(calledSettings?.inputGain).toBe(0.7)
    })

  })
})
