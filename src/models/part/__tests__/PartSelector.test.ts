import { describe, it, expect } from 'vitest'
import type { Score } from '@/types/score'
import type { Part, Voice, Instrument } from '@/types/part'
import type { Measure } from '@/types/measure'
import type { Note, Pitch } from '@/types/note'
import { PartSelector } from '../PartSelector'

function createPitch(noteName: 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B', octave: number): Pitch {
  return {
    noteName,
    octave,
    midiNumber: 60 + octave * 12 + ['C', 'D', 'E', 'F', 'G', 'A', 'B'].indexOf(noteName),
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

describe('PartSelector', () => {
  it('should initialize with first part selected', () => {
    const note1 = createNote('n1', createPitch('C', 4), 0, 1, 'v1', 'm1')
    const measure = createMeasure('m1', 1, [note1])
    const voice = createVoice('v1', [measure])
    const part1 = createPart('p1', voice)
    const part2 = createPart('p2', voice)
    const score = createScore([part1, part2])

    const selector = new PartSelector(score)

    expect(selector.getSelectedPartId()).toBe('p1')
    expect(selector.getSelectedPart()?.id).toBe('p1')
    expect(selector.getTimeline()).not.toBeNull()
  })

  it('should select part by ID', () => {
    const note1 = createNote('n1', createPitch('C', 4), 0, 1, 'v1', 'm1')
    const measure = createMeasure('m1', 1, [note1])
    const voice = createVoice('v1', [measure])
    const part1 = createPart('p1', voice)
    const part2 = createPart('p2', voice)
    const score = createScore([part1, part2])

    const selector = new PartSelector(score)

    const success = selector.selectPart('p2')

    expect(success).toBe(true)
    expect(selector.getSelectedPartId()).toBe('p2')
    expect(selector.getSelectedPart()?.id).toBe('p2')
  })

  it('should fail to select non-existent part', () => {
    const note1 = createNote('n1', createPitch('C', 4), 0, 1, 'v1', 'm1')
    const measure = createMeasure('m1', 1, [note1])
    const voice = createVoice('v1', [measure])
    const part1 = createPart('p1', voice)
    const score = createScore([part1])

    const selector = new PartSelector(score)

    const success = selector.selectPart('non-existent')

    expect(success).toBe(false)
    expect(selector.getSelectedPartId()).toBe('p1') // Should remain at first part
  })

  it('should reset position when selecting part', () => {
    const note1 = createNote('n1', createPitch('C', 4), 0, 1, 'v1', 'm1')
    const note2 = createNote('n2', createPitch('D', 4), 1, 1, 'v1', 'm1')
    const measure = createMeasure('m1', 1, [note1, note2])
    const voice = createVoice('v1', [measure])
    const part1 = createPart('p1', voice)
    const part2 = createPart('p2', voice)
    const score = createScore([part1, part2])

    const selector = new PartSelector(score)
    selector.setCurrentPositionBeats(1.5)
    expect(selector.getCurrentPositionBeats()).toBe(1.5)

    selector.selectPart('p2')

    expect(selector.getCurrentPositionBeats()).toBe(0)
  })

  it('should track current position in beats', () => {
    const note1 = createNote('n1', createPitch('C', 4), 0, 1, 'v1', 'm1')
    const measure = createMeasure('m1', 1, [note1])
    const voice = createVoice('v1', [measure])
    const part = createPart('p1', voice)
    const score = createScore([part])

    const selector = new PartSelector(score)

    selector.setCurrentPositionBeats(0.5)
    expect(selector.getCurrentPositionBeats()).toBe(0.5)

    selector.advancePositionBeats(0.3)
    expect(selector.getCurrentPositionBeats()).toBe(0.8)
  })

  it('should clamp negative position to zero', () => {
    const note1 = createNote('n1', createPitch('C', 4), 0, 1, 'v1', 'm1')
    const measure = createMeasure('m1', 1, [note1])
    const voice = createVoice('v1', [measure])
    const part = createPart('p1', voice)
    const score = createScore([part])

    const selector = new PartSelector(score)

    selector.setCurrentPositionBeats(-0.5)
    expect(selector.getCurrentPositionBeats()).toBe(0)
  })

  it('should reset position to start', () => {
    const note1 = createNote('n1', createPitch('C', 4), 0, 1, 'v1', 'm1')
    const measure = createMeasure('m1', 1, [note1])
    const voice = createVoice('v1', [measure])
    const part = createPart('p1', voice)
    const score = createScore([part])

    const selector = new PartSelector(score)

    selector.setCurrentPositionBeats(0.5)
    selector.resetPosition()

    expect(selector.getCurrentPositionBeats()).toBe(0)
  })

  it('should check if at end of part', () => {
    const note1 = createNote('n1', createPitch('C', 4), 0, 1, 'v1', 'm1')
    const measure = createMeasure('m1', 1, [note1])
    const voice = createVoice('v1', [measure])
    const part = createPart('p1', voice)
    const score = createScore([part])

    const selector = new PartSelector(score)

    expect(selector.isAtEnd()).toBe(false)

    selector.setCurrentPositionBeats(1)
    expect(selector.isAtEnd()).toBe(true)

    selector.setCurrentPositionBeats(2)
    expect(selector.isAtEnd()).toBe(true)
  })

  it('should get available parts', () => {
    const note1 = createNote('n1', createPitch('C', 4), 0, 1, 'v1', 'm1')
    const measure = createMeasure('m1', 1, [note1])
    const voice = createVoice('v1', [measure])
    const part1 = createPart('p1', voice)
    const part2 = createPart('p2', voice)
    const part3 = createPart('p3', voice)
    const score = createScore([part1, part2, part3])

    const selector = new PartSelector(score)

    const parts = selector.getAvailableParts()
    expect(parts).toHaveLength(3)
    expect(parts[0].id).toBe('p1')
    expect(parts[1].id).toBe('p2')
    expect(parts[2].id).toBe('p3')
  })

  it('should select next part', () => {
    const note1 = createNote('n1', createPitch('C', 4), 0, 1, 'v1', 'm1')
    const measure = createMeasure('m1', 1, [note1])
    const voice = createVoice('v1', [measure])
    const part1 = createPart('p1', voice)
    const part2 = createPart('p2', voice)
    const part3 = createPart('p3', voice)
    const score = createScore([part1, part2, part3])

    const selector = new PartSelector(score)

    expect(selector.getSelectedPartId()).toBe('p1')

    const success1 = selector.selectNextPart()
    expect(success1).toBe(true)
    expect(selector.getSelectedPartId()).toBe('p2')

    const success2 = selector.selectNextPart()
    expect(success2).toBe(true)
    expect(selector.getSelectedPartId()).toBe('p3')

    const success3 = selector.selectNextPart()
    expect(success3).toBe(false) // No next part
    expect(selector.getSelectedPartId()).toBe('p3')
  })

  it('should select previous part', () => {
    const note1 = createNote('n1', createPitch('C', 4), 0, 1, 'v1', 'm1')
    const measure = createMeasure('m1', 1, [note1])
    const voice = createVoice('v1', [measure])
    const part1 = createPart('p1', voice)
    const part2 = createPart('p2', voice)
    const part3 = createPart('p3', voice)
    const score = createScore([part1, part2, part3])

    const selector = new PartSelector(score)

    selector.selectPart('p3')
    expect(selector.getSelectedPartId()).toBe('p3')

    const success1 = selector.selectPreviousPart()
    expect(success1).toBe(true)
    expect(selector.getSelectedPartId()).toBe('p2')

    const success2 = selector.selectPreviousPart()
    expect(success2).toBe(true)
    expect(selector.getSelectedPartId()).toBe('p1')

    const success3 = selector.selectPreviousPart()
    expect(success3).toBe(false) // No previous part
    expect(selector.getSelectedPartId()).toBe('p1')
  })

  it('should maintain timeline reference', () => {
    const note1 = createNote('n1', createPitch('C', 4), 0, 1, 'v1', 'm1')
    const measure = createMeasure('m1', 1, [note1])
    const voice = createVoice('v1', [measure])
    const part = createPart('p1', voice)
    const score = createScore([part])

    const selector = new PartSelector(score)

    const timeline = selector.getTimeline()
    expect(timeline).not.toBeNull()
    expect(timeline?.getLength()).toBe(1)
  })
})
