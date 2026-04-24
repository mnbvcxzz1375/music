import type { SamplesCallback } from '../types'
import { YinDetector } from './yin'
import type {
  PitchDetectionOutput,
  PitchDetectorConfig,
  TargetWindow,
} from './types'

const DEFAULT_CONFIDENCE_THRESHOLD = 0.6
const DEFAULT_AMPLITUDE_THRESHOLD = 0.01
const CENTS_PER_OCTAVE = 1200

export class PitchDetector {
  private readonly detector: YinDetector
  private readonly confidenceThreshold: number
  private readonly amplitudeThreshold: number
  private targetWindow: TargetWindow | null

  onDetection: ((result: PitchDetectionOutput) => void) | null = null

  constructor(config: PitchDetectorConfig) {
    this.detector = new YinDetector({
      sampleRate: config.sampleRate,
      threshold: config.yinThreshold,
      minFrequency: config.minFrequency,
      maxFrequency: config.maxFrequency,
    })
    this.confidenceThreshold = config.confidenceThreshold ?? DEFAULT_CONFIDENCE_THRESHOLD
    this.amplitudeThreshold = config.amplitudeThreshold ?? DEFAULT_AMPLITUDE_THRESHOLD
    this.targetWindow = config.targetWindow ?? null
  }

  setTargetWindow(targetWindow: TargetWindow | null): void {
    this.targetWindow = targetWindow
  }

  processSamples(samples: Float32Array, timestamp = Date.now()): PitchDetectionOutput {
    const amplitude = this.calculateAmplitude(samples)
    if (amplitude < this.amplitudeThreshold) {
      return this.buildNoPitchResult(timestamp, amplitude)
    }

    const yinResult = this.detector.detect(samples)
    if (yinResult === null || yinResult.probability < this.confidenceThreshold) {
      return this.buildNoPitchResult(timestamp, amplitude)
    }

    if (!this.isWithinTargetWindow(yinResult.frequency)) {
      return this.buildNoPitchResult(timestamp, amplitude)
    }

    const midiNumber = this.frequencyToMidi(yinResult.frequency)
    const targetFrequency = this.targetWindow?.centerFrequency ?? null

    return {
      timestamp,
      frequency: yinResult.frequency,
      midiNumber,
      confidence: yinResult.probability,
      amplitude,
      centsDeviation: targetFrequency === null ? null : this.calculateCentsDeviation(yinResult.frequency, targetFrequency),
      targetFrequency,
    }
  }

  attachToSampleStream(stream: { onSamples: SamplesCallback | null }): void {
    stream.onSamples = (samples) => {
      const result = this.processSamples(samples)
      this.onDetection?.(result)
    }
  }

  createWorkletMessageHandler(): (samples: Float32Array) => PitchDetectionOutput {
    return (samples: Float32Array) => this.processSamples(samples)
  }

  private isWithinTargetWindow(frequency: number): boolean {
    if (this.targetWindow === null) {
      return true
    }

    const cents = Math.abs(this.calculateCentsDeviation(frequency, this.targetWindow.centerFrequency))
    return cents <= this.targetWindow.windowCents
  }

  private buildNoPitchResult(timestamp: number, amplitude: number): PitchDetectionOutput {
    return {
      timestamp,
      frequency: null,
      midiNumber: null,
      confidence: 0,
      amplitude,
      centsDeviation: null,
      targetFrequency: this.targetWindow?.centerFrequency ?? null,
    }
  }

  private calculateAmplitude(samples: Float32Array): number {
    if (samples.length === 0) {
      return 0
    }

    let sumSquares = 0
    for (let i = 0; i < samples.length; i += 1) {
      const sample = samples[i]
      sumSquares += sample * sample
    }

    return Math.sqrt(sumSquares / samples.length)
  }

  private frequencyToMidi(frequency: number): number {
    return Math.round(69 + 12 * Math.log2(frequency / 440))
  }

  private calculateCentsDeviation(detectedFrequency: number, targetFrequency: number): number {
    return CENTS_PER_OCTAVE * Math.log2(detectedFrequency / targetFrequency)
  }
}

export function processPitchFrame(
  samples: Float32Array,
  config: PitchDetectorConfig,
  timestamp = Date.now(),
): PitchDetectionOutput {
  const detector = new PitchDetector(config)
  return detector.processSamples(samples, timestamp)
}

export type { PitchDetectionOutput, PitchDetectorConfig, TargetWindow }
