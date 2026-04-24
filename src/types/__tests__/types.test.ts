import { describe, it, expectTypeOf } from 'vitest'
import type {
  Note, Pitch, DetectionResult
} from '../index'

describe('Type definitions', () => {
  it('Pitch type is correct', () => {
    const pitch: Pitch = {
      noteName: 'C',
      octave: 4,
      accidental: 'natural',
      midiNumber: 60,
      frequency: 261.63
    }
    expectTypeOf(pitch).toMatchTypeOf<Pitch>()
  })

  it('Note type is correct', () => {
    const note: Note = {
      id: 'note-1',
      pitch: { noteName: 'C', octave: 4 },
      duration: { type: 'quarter', dots: 0 },
      articulations: [],
      startTime: 0,
      durationBeats: 1,
      voiceId: 'voice-1',
      measureId: 'measure-1'
    }
    expectTypeOf(note).toMatchTypeOf<Note>()
  })

  it('DetectionResult type is correct', () => {
    const result: DetectionResult = {
      timestamp: 1000,
      frequency: 440,
      midiNumber: 69,
      confidence: 0.95,
      amplitude: 0.8
    }
    expectTypeOf(result).toMatchTypeOf<DetectionResult>()
  })
})
