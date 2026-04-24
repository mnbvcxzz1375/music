import type { Part } from './part'

export interface ScoreMetadata {
  title: string
  composer?: string
  arranger?: string
  copyright?: string
  tempo?: number // BPM
  timeSignature?: { numerator: number; denominator: number }
  keySignature?: { fifths: number; mode: 'major' | 'minor' }
}

export interface Score {
  id: string
  metadata: ScoreMetadata
  parts: Part[]
  // Navigation marks
  segnoPosition?: number // Measure number
  codaPosition?: number
  finePosition?: number
}

// Score position for tracking
export interface ScorePosition {
  measureIndex: number
  beatInMeasure: number
  partId: string
  voiceId: string
  noteId?: string
  // For repeats/jumps
  iterationCount: number // Which iteration of the score
}
