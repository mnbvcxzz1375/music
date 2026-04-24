import type { ScorePosition } from './score'

// Result from pitch detection
export interface DetectionResult {
  timestamp: number // ms
  frequency: number | null // Hz, null if no pitch detected
  midiNumber: number | null
  confidence: number // 0-1
  amplitude: number // 0-1
}

// Pitch error classification
export type PitchErrorSeverity = 'correct' | 'slight' | 'moderate' | 'severe'

export interface PitchError {
  timestamp: number
  expected: number // Expected MIDI number
  detected: number | null // Detected MIDI number
  deviation: number // In cents
  severity: PitchErrorSeverity
  position: ScorePosition
}

// Rhythm error classification
export type RhythmErrorType =
  | 'early' | 'late' | 'too_short' | 'too_long' | 'missed' | 'extra'

export interface RhythmError {
  timestamp: number
  expectedTime: number // Expected start time
  detectedTime: number // Actual start time
  timingDeviation: number // In ms
  durationDeviation: number // In ms
  type: RhythmErrorType
  position: ScorePosition
}

// Combined feedback for user
export interface PracticeFeedback {
  position: ScorePosition
  pitch: {
    isCorrect: boolean
    error?: PitchError
  }
  rhythm: {
    isCorrect: boolean
    error?: RhythmError
  }
  timestamp: number
}
