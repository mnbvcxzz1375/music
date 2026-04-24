// Pitch representation
export interface Pitch {
  noteName: 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B'
  octave: number
  accidental?: 'sharp' | 'flat' | 'natural'
  // Calculated value: MIDI note number (0-127)
  midiNumber?: number
  // Frequency in Hz
  frequency?: number
}

// Duration in musical terms
export interface Duration {
  type: 'whole' | 'half' | 'quarter' | 'eighth' | 'sixteenth' | 'thirty_second'
  dots: number // Number of augmentation dots
  tuplet?: {
    numerator: number
    denominator: number
  }
}

// Articulation marks
export type ArticulationType =
  | 'staccato' | 'accent' | 'tenuto' | 'marcato'
  | 'legato' | 'slur' | 'fermata'

export interface Articulation {
  type: ArticulationType
  position: 'above' | 'below'
}

// Note representation
export interface Note {
  id: string
  pitch: Pitch | null // null for rest
  duration: Duration
  articulations: Articulation[]
  // Timing information
  startTime: number // In beats from score start
  durationBeats: number // Duration in beats
  // Voice/measure reference
  voiceId: string
  measureId: string
}

// Rest representation
export interface Rest {
  id: string
  duration: Duration
  startTime: number
  durationBeats: number
  voiceId: string
  measureId: string
}
