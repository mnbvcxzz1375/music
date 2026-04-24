import type { Note, Rest } from './note'

export interface TimeSignature {
  numerator: number
  denominator: number
}

export interface KeySignature {
  fifths: number // Number of sharps (+) or flats (-)
  mode: 'major' | 'minor'
}

export interface Measure {
  id: string
  number: number
  timeSignature?: TimeSignature // Only present on change
  keySignature?: KeySignature // Only present on change
  notes: Note[]
  rests: Rest[]
  // Barline types
  leftBarline?: 'regular' | 'repeat' | 'heavy'
  rightBarline?: 'regular' | 'repeat' | 'heavy' | 'end'
  // Repeats
  repeatStart?: boolean
  repeatEnd?: boolean
  voltaNumber?: number // For first/second endings
}
