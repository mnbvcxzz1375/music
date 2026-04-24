import { describe, it, expect, beforeEach } from 'vitest'
import { OnsetDetector, createOnsetDetector } from '../OnsetDetector'

describe('OnsetDetector', () => {
  let detector: OnsetDetector

  beforeEach(() => {
    detector = new OnsetDetector({ threshold: 0.1 })
  })

  describe('processFrame', () => {
    it('should detect onset on energy increase', () => {
      // First frame - silence (no onset)
      const silence1 = new Float32Array(1024).fill(0.01)
      const result1 = detector.processFrame(silence1, 0.0)
      expect(result1).toBeNull()

      // Second frame - loud (onset should be detected)
      const loud = new Float32Array(1024).fill(0.5)
      const result2 = detector.processFrame(loud, 0.023) // ~23ms later
      expect(result2).not.toBeNull()
      expect(result2?.time).toBe(0.023)
      expect(result2?.confidence).toBeGreaterThan(0)
    })

    it('should not detect onset when energy decreases', () => {
      // First frame - loud
      const loud = new Float32Array(1024).fill(0.5)
      detector.processFrame(loud, 0.0)

      // Second frame - silence (no onset, energy decreased)
      const silence = new Float32Array(1024).fill(0.01)
      const result = detector.processFrame(silence, 0.023)
      expect(result).toBeNull()
    })

    it('should not detect onset too close to previous onset', () => {
      const loud = new Float32Array(1024).fill(0.5)
      const silence = new Float32Array(1024).fill(0.01)

      // First onset
      detector.processFrame(silence, 0.0)
      const result1 = detector.processFrame(loud, 0.023)
      expect(result1).not.toBeNull()

      // Try to detect another onset immediately (< 50ms)
      detector.processFrame(silence, 0.025)
      const result2 = detector.processFrame(loud, 0.03)
      expect(result2).toBeNull() // Too close, should be ignored
    })

    it('should detect onset after minimum interval', () => {
      const loud = new Float32Array(1024).fill(0.5)
      const silence = new Float32Array(1024).fill(0.01)

      // First onset
      detector.processFrame(silence, 0.0)
      detector.processFrame(loud, 0.023)

      // Wait for min interval (> 50ms)
      detector.processFrame(silence, 0.1)
      const result = detector.processFrame(loud, 0.12)
      expect(result).not.toBeNull()
    })

    it('should return confidence based on energy increase', () => {
      const silence = new Float32Array(1024).fill(0.01)
      detector.processFrame(silence, 0.0)

      // Moderate energy increase
      const moderate = new Float32Array(1024).fill(0.2)
      const result1 = detector.processFrame(moderate, 0.023)
      expect(result1?.confidence).toBeLessThan(1)

      // Reset and try larger increase
      detector.reset()
      detector.processFrame(silence, 0.0)

      const loud = new Float32Array(1024).fill(0.8)
      const result2 = detector.processFrame(loud, 0.023)
      expect(result2?.confidence).toBeGreaterThan(result1?.confidence ?? 0)
    })
  })

  describe('reset', () => {
    it('should reset detector state', () => {
      const loud = new Float32Array(1024).fill(0.5)
      const silence = new Float32Array(1024).fill(0.01)

      // Detect an onset
      detector.processFrame(silence, 0.0)
      const result1 = detector.processFrame(loud, 0.023)
      expect(result1).not.toBeNull()

      // Reset
      detector.reset()

      // Should be able to detect again immediately
      detector.processFrame(silence, 0.0)
      const result2 = detector.processFrame(loud, 0.023)
      expect(result2).not.toBeNull()
    })
  })

  describe('configuration', () => {
    it('should use default config when not provided', () => {
      const d = new OnsetDetector()
      const config = d.getConfig()
      expect(config.sampleRate).toBe(44100)
      expect(config.frameSize).toBe(1024)
      expect(config.threshold).toBe(0.3)
    })

    it('should allow custom config', () => {
      const d = new OnsetDetector({ threshold: 0.5, sampleRate: 48000 })
      const config = d.getConfig()
      expect(config.threshold).toBe(0.5)
      expect(config.sampleRate).toBe(48000)
    })

    it('should update config', () => {
      detector.setConfig({ threshold: 0.8 })
      expect(detector.getConfig().threshold).toBe(0.8)
    })
  })
})

describe('createOnsetDetector', () => {
  it('should create an OnsetDetector instance', () => {
    const detector = createOnsetDetector({ threshold: 0.2 })
    expect(detector).toBeInstanceOf(OnsetDetector)
    expect(detector.getConfig().threshold).toBe(0.2)
  })
})
