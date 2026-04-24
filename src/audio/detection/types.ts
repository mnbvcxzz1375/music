import type { DetectionResult } from '@/types/detection'

export interface YinOptions {
  sampleRate: number
  threshold?: number
  minFrequency?: number
  maxFrequency?: number
}

export interface YinPitchResult {
  frequency: number
  probability: number
}

export interface TargetWindow {
  centerFrequency: number
  windowCents: number
}

export interface PitchDetectorConfig {
  sampleRate: number
  yinThreshold?: number
  minFrequency?: number
  maxFrequency?: number
  confidenceThreshold?: number
  amplitudeThreshold?: number
  targetWindow?: TargetWindow
}

export interface PitchDetectionOutput extends DetectionResult {
  centsDeviation: number | null
  targetFrequency: number | null
}
