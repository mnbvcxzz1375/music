import { describe, it, expect } from 'vitest'
import type { Score } from '@/types/score'
import type { Part, Voice, Instrument } from '@/types/part'
import type { Measure } from '@/types/measure'
import type { Note, Pitch } from '@/types/note'
import { PartSelector } from '../PartSelector'
import { PositionQuery } from '../PositionQuery'

function createPitch(noteName: 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B', octave: number): Pitch {
  return {
    noteName,
    octave,
    midiNumber: 12 * (octave + 1) + [0, 2, 4, 5, 7, 9, 11][['C', 'D', 'E', 'F', 'G', 'A', 'B'].indexOf(noteName)],
    frequency: 261.63 * Math.pow(2, octave),
  }
}

function createNote(
  id: string,
  pitch: Pitch | null,
  startTime: number,
  durationBeats: number,
  voiceId: string,
  measureId: string,
): Note {
  return {
    id,
    pitch,
    duration: { type: 'quarter', dots: 0 },
    articulations: [],
    startTime,
    durationBeats,
    voiceId,
    measureId,
  }
}

function createMeasure(id: string, number: number, notes: Note[] = []): Measure {
  return {
    id,
    number,
    notes,
    rests: [],
  }
}

function createVoice(id: string, measures: Measure[]): Voice {
  return {
    id,
    name: `Voice ${id}`,
    measures,
  }
}

function createInstrument(): Instrument {
  return {
    id: 'violin',
    name: 'Violin',
    category: 'string',
  }
}

function createPart(id: string, voice: Voice): Part {
  return {
    id,
    name: `Part ${id}`,
    instrument: createInstrument(),
    voices: [voice],
  }
}

function createScore(parts: Part[]): Score {
  return {
    id: 'score1',
    metadata: {
      title: 'Test Score',
      tempo: 120,
    },
    parts,
  }
}

describe('PositionQuery', () => {
  it('should get expected pitch at current position', () => {
    const pitch = createPitch('C', 4)
    const note1 = createNote('n1', pitch, 0, 1, 'v1', 'm1')
    const measure = createMeasure('m1', 1, [note1])
    const voice = createVoice('v1', [measure])
    const part = createPart('p1', voice)
    const score = createScore([part])

    const selector = new PartSelector(score)
    const query = new PositionQuery(selector)

    const expectedPitch = query.getExpectedPitch()

    expect(expectedPitch).not.toBeNull()
    expect(expectedPitch?.pitch?.noteName).toBe('C')
    expect(expectedPitch?.pitch?.octave).toBe(4)
  })

  it('should get expected pitch MIDI number', () => {
    const pitch = createPitch('C', 4)
    const note1 = createNote('n1', pitch, 0, 1, 'v1', 'm1')
    const measure = createMeasure('m1', 1, [note1])
    const voice = createVoice('v1', [measure])
    const part = createPart('p1', voice)
    const score = createScore([part])

    const selector = new PartSelector(score)
    const query = new PositionQuery(selector)

    const midiNumber = query.getExpectedPitchMidi()

    expect(midiNumber).toBe(60) // C4 is MIDI note 60
  })

  it('should get expected pitch frequency', () => {
    const pitch = createPitch('C', 4)
    const note1 = createNote('n1', pitch, 0, 1, 'v1', 'm1')
    const measure = createMeasure('m1', 1, [note1])
    const voice = createVoice('v1', [measure])
    const part = createPart('p1', voice)
    const score = createScore([part])

    const selector = new PartSelector(score)
    const query = new PositionQuery(selector)

    const frequency = query.getExpectedPitchFrequency()

    expect(frequency).toBeGreaterThan(0)
  })

  it('should return null for rest/silence', () => {
    const note1 = createNote('n1', null, 0, 1, 'v1', 'm1') // null pitch = rest
    const measure = createMeasure('m1', 1, [note1])
    const voice = createVoice('v1', [measure])
    const part = createPart('p1', voice)
    const score = createScore([part])

    const selector = new PartSelector(score)
    const query = new PositionQuery(selector)

    const expectedPitch = query.getExpectedPitch()

    expect(expectedPitch).toBeNull()
  })

  it('should check if timing is on time', () => {
    const note1 = createNote('n1', createPitch('C', 4), 0, 1, 'v1', 'm1')
    const measure = createMeasure('m1', 1, [note1])
    const voice = createVoice('v1', [measure])
    const part = createPart('p1', voice)
    const score = createScore([part])

    const selector = new PartSelector(score)
    const query = new PositionQuery(selector)

    selector.setCurrentPositionBeats(0.5)

    expect(query.isOnTime(0.5)).toBe(true)
    expect(query.isOnTime(0.55)).toBe(true) // Within tolerance
    expect(query.isOnTime(0.45)).toBe(true) // Within tolerance
    expect(query.isOnTime(0.7)).toBe(false) // Outside tolerance
    expect(query.isOnTime(0.3)).toBe(false) // Outside tolerance
  })

  it('should calculate timing error', () => {
    const note1 = createNote('n1', createPitch('C', 4), 0, 1, 'v1', 'm1')
    const measure = createMeasure('m1', 1, [note1])
    const voice = createVoice('v1', [measure])
    const part = createPart('p1', voice)
    const score = createScore([part])

    const selector = new PartSelector(score)
    const query = new PositionQuery(selector)

    selector.setCurrentPositionBeats(0.5)

    expect(query.getTimingError(0.5)).toBe(0) // Perfect timing
    expect(query.getTimingError(0.6)).toBeCloseTo(0.1) // 0.1 beats late
    expect(query.getTimingError(0.4)).toBeCloseTo(-0.1) // 0.1 beats early
  })

  it('should advance to next note', () => {
    const note1 = createNote('n1', createPitch('C', 4), 0, 1, 'v1', 'm1')
    const note2 = createNote('n2', createPitch('D', 4), 1, 1, 'v1', 'm1')
    const note3 = createNote('n3', createPitch('E', 4), 2, 1, 'v1', 'm1')
    const measure = createMeasure('m1', 1, [note1, note2, note3])
    const voice = createVoice('v1', [measure])
    const part = createPart('p1', voice)
    const score = createScore([part])

    const selector = new PartSelector(score)
    const query = new PositionQuery(selector)

    expect(query.getCurrentPositionBeats()).toBe(0)

    const advanced1 = query.advance()
    expect(advanced1).toBe(true)
    expect(query.getCurrentPositionBeats()).toBe(1)

    const advanced2 = query.advance()
    expect(advanced2).toBe(true)
    expect(query.getCurrentPositionBeats()).toBe(2)

    const advanced3 = query.advance()
    expect(advanced3).toBe(false) // No more notes
    expect(query.getCurrentPositionBeats()).toBe(2) // Position unchanged
  })

  it('should rewind to previous note', () => {
    const note1 = createNote('n1', createPitch('C', 4), 0, 1, 'v1', 'm1')
    const note2 = createNote('n2', createPitch('D', 4), 1, 1, 'v1', 'm1')
    const note3 = createNote('n3', createPitch('E', 4), 2, 1, 'v1', 'm1')
    const measure = createMeasure('m1', 1, [note1, note2, note3])
    const voice = createVoice('v1', [measure])
    const part = createPart('p1', voice)
    const score = createScore([part])

    const selector = new PartSelector(score)
    const query = new PositionQuery(selector)

    selector.setCurrentPositionBeats(2)

    const rewind1 = query.rewind()
    expect(rewind1).toBe(true)
    expect(query.getCurrentPositionBeats()).toBe(1)

    const rewind2 = query.rewind()
    expect(rewind2).toBe(true)
    expect(query.getCurrentPositionBeats()).toBe(0)

    const rewind3 = query.rewind()
    expect(rewind3).toBe(false) // No previous note
    expect(query.getCurrentPositionBeats()).toBe(0)
  })

  it('should check if at end', () => {
    const note1 = createNote('n1', createPitch('C', 4), 0, 1, 'v1', 'm1')
    const measure = createMeasure('m1', 1, [note1])
    const voice = createVoice('v1', [measure])
    const part = createPart('p1', voice)
    const score = createScore([part])

    const selector = new PartSelector(score)
    const query = new PositionQuery(selector)

    expect(query.isAtEnd()).toBe(false)

    selector.setCurrentPositionBeats(1)
    expect(query.isAtEnd()).toBe(true)
  })

  it('should get current timeline entry', () => {
    const note1 = createNote('n1', createPitch('C', 4), 0, 1, 'v1', 'm1')
    const note2 = createNote('n2', createPitch('D', 4), 1, 1, 'v1', 'm1')
    const measure = createMeasure('m1', 1, [note1, note2])
    const voice = createVoice('v1', [measure])
    const part = createPart('p1', voice)
    const score = createScore([part])

    const selector = new PartSelector(score)
    const query = new PositionQuery(selector)

    selector.setCurrentPositionBeats(0.5)
    const entry = query.getCurrentTimelineEntry()

    expect(entry).not.toBeNull()
    expect(entry?.note?.id).toBe('n1')
  })

  it('should get all current notes (multi-voice)', () => {
    const note1v1 = createNote('n1', createPitch('C', 4), 0, 2, 'v1', 'm1')
    const note1v2 = createNote('n2', createPitch('G', 3), 0.5, 1.5, 'v2', 'm1')

    const measure1 = createMeasure('m1', 1, [note1v1])
    const measure2 = createMeasure('m2', 1, [note1v2])

    const voice1 = createVoice('v1', [measure1])
    const voice2 = createVoice('v2', [measure2])

    const part: Part = {
      id: 'p1',
      name: 'Part 1',
      instrument: createInstrument(),
      voices: [voice1, voice2],
    }

    const score = createScore([part])
    const selector = new PartSelector(score)
    const query = new PositionQuery(selector)

    selector.setCurrentPositionBeats(1)
    const notes = query.getCurrentNotes()

    expect(notes).toHaveLength(2)
  })

  it('should check if on rest', () => {
    const note1 = createNote('n1', createPitch('C', 4), 0, 1, 'v1', 'm1')
    const note2 = createNote('n2', null, 1, 1, 'v1', 'm1') // Rest
    const measure = createMeasure('m1', 1, [note1, note2])
    const voice = createVoice('v1', [measure])
    const part = createPart('p1', voice)
    const score = createScore([part])

    const selector = new PartSelector(score)
    const query = new PositionQuery(selector)

    selector.setCurrentPositionBeats(0)
    expect(query.isOnRest()).toBe(false)

    selector.setCurrentPositionBeats(1)
    expect(query.isOnRest()).toBe(true)
  })

  it('should get duration of current note', () => {
    const note1 = createNote('n1', createPitch('C', 4), 0, 2, 'v1', 'm1')
    const measure = createMeasure('m1', 1, [note1])
    const voice = createVoice('v1', [measure])
    const part = createPart('p1', voice)
    const score = createScore([part])

    const selector = new PartSelector(score)
    const query = new PositionQuery(selector)

    selector.setCurrentPositionBeats(0)
    expect(query.getCurrentNoteDuration()).toBe(2)
  })

  it('should get remaining beats in note', () => {
    const note1 = createNote('n1', createPitch('C', 4), 0, 2, 'v1', 'm1')
    const measure = createMeasure('m1', 1, [note1])
    const voice = createVoice('v1', [measure])
    const part = createPart('p1', voice)
    const score = createScore([part])

    const selector = new PartSelector(score)
    const query = new PositionQuery(selector)

    selector.setCurrentPositionBeats(0)
    expect(query.getRemainingBeatsInNote()).toBe(2)

    selector.setCurrentPositionBeats(0.5)
    expect(query.getRemainingBeatsInNote()).toBeCloseTo(1.5)

    selector.setCurrentPositionBeats(1.8)
    expect(query.getRemainingBeatsInNote()).toBeCloseTo(0.2)
  })

  it('should get total duration', () => {
    const note1 = createNote('n1', createPitch('C', 4), 0, 1, 'v1', 'm1')
    const note2 = createNote('n2', createPitch('D', 4), 1, 2, 'v1', 'm1')
    const measure = createMeasure('m1', 1, [note1, note2])
    const voice = createVoice('v1', [measure])
    const part = createPart('p1', voice)
    const score = createScore([part])

    const selector = new PartSelector(score)
    const query = new PositionQuery(selector)

    expect(query.getTotalDuration()).toBe(3)
  })

  it('should get progress percentage', () => {
    const note1 = createNote('n1', createPitch('C', 4), 0, 1, 'v1', 'm1')
    const note2 = createNote('n2', createPitch('D', 4), 1, 1, 'v1', 'm1')
    const measure = createMeasure('m1', 1, [note1, note2])
    const voice = createVoice('v1', [measure])
    const part = createPart('p1', voice)
    const score = createScore([part])

    const selector = new PartSelector(score)
    const query = new PositionQuery(selector)

    selector.setCurrentPositionBeats(0)
    expect(query.getProgressPercent()).toBe(0)

    selector.setCurrentPositionBeats(1)
    expect(query.getProgressPercent()).toBe(50)

    selector.setCurrentPositionBeats(2)
    expect(query.getProgressPercent()).toBe(100)
  })

  it('should set timing tolerance', () => {
    const note1 = createNote('n1', createPitch('C', 4), 0, 1, 'v1', 'm1')
    const measure = createMeasure('m1', 1, [note1])
    const voice = createVoice('v1', [measure])
    const part = createPart('p1', voice)
    const score = createScore([part])

    const selector = new PartSelector(score)
    const query = new PositionQuery(selector)

    query.setTimingTolerance(0.5)
    expect(query.getTimingTolerance()).toBe(0.5)

    selector.setCurrentPositionBeats(0)

    expect(query.isOnTime(0.5)).toBe(true)
    expect(query.isOnTime(0.6)).toBe(false)
  })

  it('should reset position', () => {
    const note1 = createNote('n1', createPitch('C', 4), 0, 1, 'v1', 'm1')
    const measure = createMeasure('m1', 1, [note1])
    const voice = createVoice('v1', [measure])
    const part = createPart('p1', voice)
    const score = createScore([part])

    const selector = new PartSelector(score)
    const query = new PositionQuery(selector)

    selector.setCurrentPositionBeats(0.5)
    query.resetPosition()

    expect(query.getCurrentPositionBeats()).toBe(0)
  })
})
