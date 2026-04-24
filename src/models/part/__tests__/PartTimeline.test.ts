import { describe, it, expect } from 'vitest'
import type { Part, Voice, Instrument } from '@/types/part'
import type { Measure } from '@/types/measure'
import type { Note, Pitch } from '@/types/note'
import { PartTimeline } from '../PartTimeline'

// Helper to create a simple pitch
function createPitch(noteName: 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B', octave: number): Pitch {
  return {
    noteName,
    octave,
    midiNumber: 60 + octave * 12 + ['C', 'D', 'E', 'F', 'G', 'A', 'B'].indexOf(noteName),
    frequency: 261.63 * Math.pow(2, octave),
  }
}

// Helper to create a note
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

// Helper to create a measure
function createMeasure(id: string, number: number, notes: Note[] = []): Measure {
  return {
    id,
    number,
    notes,
    rests: [],
  }
}

// Helper to create a voice
function createVoice(id: string, measures: Measure[]): Voice {
  return {
    id,
    name: `Voice ${id}`,
    measures,
  }
}

// Helper to create an instrument
function createInstrument(): Instrument {
  return {
    id: 'violin',
    name: 'Violin',
    category: 'string',
  }
}

// Helper to create a simple part
function createSimplePart(id: string, voice: Voice): Part {
  return {
    id,
    name: `Part ${id}`,
    instrument: createInstrument(),
    voices: [voice],
  }
}

describe('PartTimeline', () => {
  it('should generate timeline from single voice part', () => {
    const note1 = createNote('n1', createPitch('C', 4), 0, 1, 'v1', 'm1')
    const note2 = createNote('n2', createPitch('D', 4), 1, 1, 'v1', 'm1')
    const measure = createMeasure('m1', 1, [note1, note2])
    const voice = createVoice('v1', [measure])
    const part = createSimplePart('p1', voice)

    const timeline = new PartTimeline(part)

    expect(timeline.getLength()).toBe(2)
    expect(timeline.getTotalDuration()).toBe(2)
  })

  it('should handle multiple voices in a single measure', () => {
    const note1v1 = createNote('n1', createPitch('C', 4), 0, 1, 'v1', 'm1')
    const note2v1 = createNote('n2', createPitch('D', 4), 1, 1, 'v1', 'm1')
    const note1v2 = createNote('n3', createPitch('G', 3), 0, 2, 'v2', 'm1')

    const measure1 = createMeasure('m1', 1, [note1v1, note2v1])
    const measure2 = createMeasure('m2', 1, [note1v2])

    const voice1 = createVoice('v1', [measure1])
    const voice2 = createVoice('v2', [measure2])

    const part: Part = {
      id: 'p1',
      name: 'Part 1',
      instrument: createInstrument(),
      voices: [voice1, voice2],
    }

    const timeline = new PartTimeline(part)

    // Should have 3 notes: 2 from voice1, 1 from voice2
    expect(timeline.getLength()).toBe(3)
    // Total duration is max: 2 beats (voice1) vs 2 beats (voice2) = 2 beats total
    expect(timeline.getTotalDuration()).toBe(2)
  })

  it('should correctly sort timeline by start time', () => {
    // Create notes out of order
    const note2 = createNote('n2', createPitch('D', 4), 1, 1, 'v1', 'm1')
    const note1 = createNote('n1', createPitch('C', 4), 0, 1, 'v1', 'm1')
    const note3 = createNote('n3', createPitch('E', 4), 2, 1, 'v1', 'm1')

    const measure = createMeasure('m1', 1, [note2, note1, note3])
    const voice = createVoice('v1', [measure])
    const part = createSimplePart('p1', voice)

    const timeline = new PartTimeline(part)

    // Should be sorted by time
    const entries = timeline.getTimeline()
    expect(entries[0].note?.id).toBe('n1')
    expect(entries[1].note?.id).toBe('n2')
    expect(entries[2].note?.id).toBe('n3')
  })

  it('should find note at specific time', () => {
    const note1 = createNote('n1', createPitch('C', 4), 0, 1, 'v1', 'm1')
    const note2 = createNote('n2', createPitch('D', 4), 1, 1, 'v1', 'm1')
    const measure = createMeasure('m1', 1, [note1, note2])
    const voice = createVoice('v1', [measure])
    const part = createSimplePart('p1', voice)

    const timeline = new PartTimeline(part)

    const noteAtZero = timeline.getNoteAt(0)
    expect(noteAtZero?.note?.id).toBe('n1')

    const noteAtHalf = timeline.getNoteAt(0.5)
    expect(noteAtHalf?.note?.id).toBe('n1')

    const noteAtOne = timeline.getNoteAt(1)
    expect(noteAtOne?.note?.id).toBe('n2')

    const noteAtEnd = timeline.getNoteAt(1.5)
    expect(noteAtEnd?.note?.id).toBe('n2')
  })

  it('should find next note after given time', () => {
    const note1 = createNote('n1', createPitch('C', 4), 0, 1, 'v1', 'm1')
    const note2 = createNote('n2', createPitch('D', 4), 1, 1, 'v1', 'm1')
    const note3 = createNote('n3', createPitch('E', 4), 2, 1, 'v1', 'm1')
    const measure = createMeasure('m1', 1, [note1, note2, note3])
    const voice = createVoice('v1', [measure])
    const part = createSimplePart('p1', voice)

    const timeline = new PartTimeline(part)

    const nextAfterZero = timeline.getNextNote(0)
    expect(nextAfterZero?.note?.id).toBe('n2')

    const nextAfterHalf = timeline.getNextNote(0.5)
    expect(nextAfterHalf?.note?.id).toBe('n2')

    const nextAfterOne = timeline.getNextNote(1)
    expect(nextAfterOne?.note?.id).toBe('n3')

    const nextAfterEnd = timeline.getNextNote(3)
    expect(nextAfterEnd).toBeNull()
  })

  it('should find previous note before given time', () => {
    const note1 = createNote('n1', createPitch('C', 4), 0, 1, 'v1', 'm1')
    const note2 = createNote('n2', createPitch('D', 4), 1, 1, 'v1', 'm1')
    const note3 = createNote('n3', createPitch('E', 4), 2, 1, 'v1', 'm1')
    const measure = createMeasure('m1', 1, [note1, note2, note3])
    const voice = createVoice('v1', [measure])
    const part = createSimplePart('p1', voice)

    const timeline = new PartTimeline(part)

    const prevBeforeZero = timeline.getPreviousNote(0)
    expect(prevBeforeZero).toBeNull()

    const prevBeforeOne = timeline.getPreviousNote(1)
    expect(prevBeforeOne?.note?.id).toBe('n1')

    const prevBeforeTwo = timeline.getPreviousNote(2)
    expect(prevBeforeTwo?.note?.id).toBe('n2')

    const prevBeforeEnd = timeline.getPreviousNote(3)
    expect(prevBeforeEnd?.note?.id).toBe('n3')
  })

  it('should get notes at specific time (handling overlaps)', () => {
    // Create overlapping notes from different voices
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

    const timeline = new PartTimeline(part)

    // At time 1, both notes should be active
    const notesAtOne = timeline.getNotesAtTime(1)
    expect(notesAtOne).toHaveLength(2)
    expect(notesAtOne.some(e => e.note?.id === 'n1')).toBe(true)
    expect(notesAtOne.some(e => e.note?.id === 'n2')).toBe(true)

    // At time 0.25, only first note should be active
    const notesAtQuarter = timeline.getNotesAtTime(0.25)
    expect(notesAtQuarter).toHaveLength(1)
    expect(notesAtQuarter[0].note?.id).toBe('n1')
  })

  it('should get entries in range', () => {
    const note1 = createNote('n1', createPitch('C', 4), 0, 1, 'v1', 'm1')
    const note2 = createNote('n2', createPitch('D', 4), 1, 1, 'v1', 'm1')
    const note3 = createNote('n3', createPitch('E', 4), 2, 1, 'v1', 'm1')
    const note4 = createNote('n4', createPitch('F', 4), 3, 1, 'v1', 'm1')
    const measure = createMeasure('m1', 1, [note1, note2, note3, note4])
    const voice = createVoice('v1', [measure])
    const part = createSimplePart('p1', voice)

    const timeline = new PartTimeline(part)

    const entriesInRange = timeline.getEntriesInRange(1, 3)
    expect(entriesInRange).toHaveLength(2)
    expect(entriesInRange[0].note?.id).toBe('n2')
    expect(entriesInRange[1].note?.id).toBe('n3')
  })

  it('should handle empty part', () => {
    const measure = createMeasure('m1', 1, [])
    const voice = createVoice('v1', [measure])
    const part = createSimplePart('p1', voice)

    const timeline = new PartTimeline(part)

    expect(timeline.getLength()).toBe(0)
    expect(timeline.getTotalDuration()).toBe(0)
    expect(timeline.getNoteAt(0)).toBeNull()
  })
})
