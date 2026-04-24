import { describe, expect, it } from 'vitest'

import { YinDetector } from '../yin'
import { generateSilence, generateSineWave } from './fixtures'

describe('YinDetector', () => {
  const sampleRate = 48_000
  const sampleCount = 2048

  it('detects A4 frequency around 440Hz', () => {
    const detector = new YinDetector({ sampleRate })
    const samples = generateSineWave(440, sampleRate, sampleCount)

    const result = detector.detect(samples)

    expect(result).not.toBeNull()
    expect(result?.frequency).toBeCloseTo(440, 1)
    expect(result?.probability).toBeGreaterThan(0.9)
  })

  it('detects C4 frequency around 261.63Hz', () => {
    const detector = new YinDetector({ sampleRate })
    const samples = generateSineWave(261.63, sampleRate, sampleCount)

    const result = detector.detect(samples)

    expect(result).not.toBeNull()
    expect(result?.frequency).toBeCloseTo(261.63, 1)
  })

  it('returns null for silence', () => {
    const detector = new YinDetector({ sampleRate })
    const samples = generateSilence(sampleCount)

    const result = detector.detect(samples)

    expect(result).toBeNull()
  })
})
