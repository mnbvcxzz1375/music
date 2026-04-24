import { describe, expect, it, vi } from 'vitest'

import { PitchDetector } from '../PitchDetector'
import { generateSilence, generateSineWave, generateWhiteNoise } from './fixtures'

describe('PitchDetector', () => {
  const sampleRate = 48_000
  const sampleCount = 2048

  it('produces DetectionResult-compatible output with cents deviation', () => {
    const detector = new PitchDetector({
      sampleRate,
      targetWindow: {
        centerFrequency: 440,
        windowCents: 60,
      },
    })
    const samples = generateSineWave(440, sampleRate, sampleCount)

    const result = detector.processSamples(samples, 123)

    expect(result.timestamp).toBe(123)
    expect(result.frequency).toBeCloseTo(440, 1)
    expect(result.midiNumber).toBe(69)
    expect(result.confidence).toBeGreaterThan(0.8)
    expect(result.amplitude).toBeGreaterThan(0.1)
    expect(result.centsDeviation).toBeCloseTo(0, 0)
    expect(result.targetFrequency).toBe(440)
  })

  it('returns no-pitch result for silence', () => {
    const detector = new PitchDetector({ sampleRate })
    const result = detector.processSamples(generateSilence(sampleCount))

    expect(result.frequency).toBeNull()
    expect(result.confidence).toBe(0)
    expect(result.midiNumber).toBeNull()
  })

  it('applies confidence threshold', () => {
    const detector = new PitchDetector({
      sampleRate,
      confidenceThreshold: 0.95,
      amplitudeThreshold: 0.001,
    })
    const result = detector.processSamples(generateWhiteNoise(sampleCount, 0.05))

    expect(result.frequency).toBeNull()
    expect(result.confidence).toBe(0)
  })

  it('filters detections outside target window', () => {
    const detector = new PitchDetector({
      sampleRate,
      targetWindow: {
        centerFrequency: 440,
        windowCents: 30,
      },
    })
    const outOfWindow = generateSineWave(466.16, sampleRate, sampleCount)

    const result = detector.processSamples(outOfWindow)

    expect(result.frequency).toBeNull()
    expect(result.centsDeviation).toBeNull()
  })

  it('can connect to AudioWorklet sample stream callback', () => {
    const detector = new PitchDetector({ sampleRate })
    const stream = { onSamples: null as ((samples: Float32Array) => void) | null }
    const onDetection = vi.fn()
    detector.onDetection = onDetection

    detector.attachToSampleStream(stream)
    stream.onSamples?.(generateSineWave(440, sampleRate, sampleCount))

    expect(onDetection).toHaveBeenCalledTimes(1)
    const [result] = onDetection.mock.calls[0]
    expect(result.frequency).toBeCloseTo(440, 1)
  })
})
