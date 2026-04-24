import { describe, it, expect, beforeEach } from 'vitest'
import { extractRepeats, RepeatHandler } from '../RepeatHandler'
import type { Measure } from '@/types/measure'
import type { ScoreGraph, JumpPoint } from '../types'

// Mock Measure data
const createMeasure = (overrides?: Partial<Measure>): Measure => ({
  id: `measure-${Math.random()}`,
  number: 1,
  timeSignature: { numerator: 4, denominator: 4 },
  notes: [],
  rests: [],
  leftBarline: undefined,
  rightBarline: undefined,
  repeatStart: false,
  repeatEnd: false,
  voltaNumber: undefined,
  ...overrides,
})

// Mock ScoreGraph data
const createScoreGraph = (overrides?: Partial<ScoreGraph>): ScoreGraph => ({
  jumps: [],
  repeats: new Map(),
  totalMeasures: 8,
  ...overrides,
})

describe('RepeatHandler', () => {
  describe('extractRepeats', () => {
    it('should extract repeat-start from measures with repeatStart flag', () => {
      const measures: Measure[] = [
        createMeasure({ number: 0, repeatStart: true }),
        createMeasure({ number: 1 }),
      ]

      const jumps = extractRepeats(measures)

      expect(jumps).toHaveLength(1)
      expect(jumps[0]).toMatchObject({
        measureIndex: 0,
        beatInMeasure: 0,
        type: 'repeat-start',
      })
    })

    it('should extract repeat-end from measures with repeatEnd flag', () => {
      const measures: Measure[] = [
        createMeasure({ number: 0, repeatStart: true }),
        createMeasure({ number: 1, repeatEnd: true, notes: [] }),
      ]

      const jumps = extractRepeats(measures)

      expect(jumps).toHaveLength(2)
      expect(jumps[1]).toMatchObject({
        measureIndex: 1,
        type: 'repeat-end',
        targetMeasureIndex: 0,
      })
    })

    it('should extract repeat-start from leftBarline', () => {
      const measures: Measure[] = [
        createMeasure({ number: 0, leftBarline: 'repeat' }),
        createMeasure({ number: 1 }),
      ]

      const jumps = extractRepeats(measures)

      expect(jumps).toHaveLength(1)
      expect(jumps[0].type).toBe('repeat-start')
    })

    it('should extract repeat-end from rightBarline', () => {
      const measures: Measure[] = [
        createMeasure({ number: 0, repeatStart: true }),
        createMeasure({ number: 1, rightBarline: 'repeat', notes: [] }),
      ]

      const jumps = extractRepeats(measures)

      expect(jumps).toHaveLength(2)
      expect(jumps[1].type).toBe('repeat-end')
    })

    it('should extract volta numbers from measures', () => {
      const measures: Measure[] = [
        createMeasure({ number: 0, repeatStart: true }),
        createMeasure({ number: 1, voltaNumber: 1 }),
        createMeasure({ number: 2, voltaNumber: 2, repeatEnd: true, notes: [] }),
      ]

      const jumps = extractRepeats(measures)

      const voltaJumps = jumps.filter((j) => j.type === 'volta-start')
      expect(voltaJumps).toHaveLength(2)
      expect(voltaJumps[0].voltaNumber).toBe(1)
      expect(voltaJumps[1].voltaNumber).toBe(2)
    })

    it('should calculate beat position from notes in measure', () => {
      const measures: Measure[] = [
        createMeasure({ number: 0, repeatStart: true }),
        createMeasure({
          number: 1,
          repeatEnd: true,
          notes: [
            {
              pitch: { midi: 60 },
              startTime: 0,
              durationBeats: 2,
            },
            {
              pitch: { midi: 62 },
              startTime: 2,
              durationBeats: 2,
            },
          ] as unknown as Measure['notes'],
        }),
      ]

      const jumps = extractRepeats(measures)

      expect(jumps[1]).toMatchObject({
        type: 'repeat-end',
        beatInMeasure: 4, // Last note ends at beat 4
      })
    })

    it('should handle multiple repeat sections', () => {
      const measures: Measure[] = [
        createMeasure({ number: 0, repeatStart: true }),
        createMeasure({ number: 1, repeatEnd: true, notes: [] }),
        createMeasure({ number: 2, repeatStart: true }),
        createMeasure({ number: 3, repeatEnd: true, notes: [] }),
      ]

      const jumps = extractRepeats(measures)

      const startJumps = jumps.filter((j) => j.type === 'repeat-start')
      const endJumps = jumps.filter((j) => j.type === 'repeat-end')

      expect(startJumps).toHaveLength(2)
      expect(endJumps).toHaveLength(2)
    })
  })

  describe('RepeatHandler.buildFromGraph', () => {
    let handler: RepeatHandler

    beforeEach(() => {
      handler = new RepeatHandler()
    })

    it('should build repeat contexts from graph jumps', () => {
      const jumps: JumpPoint[] = [
        {
          measureIndex: 0,
          beatInMeasure: 0,
          type: 'repeat-start',
        },
        {
          measureIndex: 3,
          beatInMeasure: 0,
          type: 'repeat-end',
          targetMeasureIndex: 0,
        },
      ]

      const graph = createScoreGraph({ jumps })
      handler.buildFromGraph(graph)

      const repeats = handler.getRepeats()
      expect(repeats.size).toBe(1)

      const repeat = repeats.get('repeat-0')
      expect(repeat).toBeDefined()
      expect(repeat?.startMeasure).toBe(0)
      expect(repeat?.endMeasure).toBe(3)
      expect(repeat?.maxIterations).toBe(2)
      expect(repeat?.currentIteration).toBe(1)
    })

    it('should associate volta endings with repeat sections', () => {
      const jumps: JumpPoint[] = [
        {
          measureIndex: 0,
          beatInMeasure: 0,
          type: 'repeat-start',
        },
        {
          measureIndex: 2,
          beatInMeasure: 0,
          type: 'volta-start',
          voltaNumber: 1,
        },
        {
          measureIndex: 3,
          beatInMeasure: 0,
          type: 'volta-start',
          voltaNumber: 2,
        },
        {
          measureIndex: 4,
          beatInMeasure: 0,
          type: 'repeat-end',
          targetMeasureIndex: 0,
        },
      ]

      const graph = createScoreGraph({ jumps })
      handler.buildFromGraph(graph)

      const repeat = handler.getRepeats().get('repeat-0')
      expect(repeat?.voltaEndings.size).toBe(2)
      expect(repeat?.voltaEndings.get(1)).toBe(2)
      expect(repeat?.voltaEndings.get(2)).toBe(3)
    })

    it('should not create repeat if no end found', () => {
      const jumps: JumpPoint[] = [
        {
          measureIndex: 0,
          beatInMeasure: 0,
          type: 'repeat-start',
        },
      ]

      const graph = createScoreGraph({ jumps })
      handler.buildFromGraph(graph)

      const repeats = handler.getRepeats()
      expect(repeats.size).toBe(0)
    })

    it('should clear previous repeats when building from new graph', () => {
      const jumps1: JumpPoint[] = [
        { measureIndex: 0, beatInMeasure: 0, type: 'repeat-start' },
        { measureIndex: 1, beatInMeasure: 0, type: 'repeat-end', targetMeasureIndex: 0 },
      ]

      handler.buildFromGraph(createScoreGraph({ jumps: jumps1 }))
      expect(handler.getRepeats().size).toBe(1)

      const jumps2: JumpPoint[] = []
      handler.buildFromGraph(createScoreGraph({ jumps: jumps2 }))
      expect(handler.getRepeats().size).toBe(0)
    })
  })

  describe('RepeatHandler.handleMeasure', () => {
    let handler: RepeatHandler

    beforeEach(() => {
      handler = new RepeatHandler()
    })

    it('should return null for measures not at repeat end', () => {
      const jumps: JumpPoint[] = [
        { measureIndex: 0, beatInMeasure: 0, type: 'repeat-start' },
        { measureIndex: 3, beatInMeasure: 0, type: 'repeat-end', targetMeasureIndex: 0 },
      ]

      const graph = createScoreGraph({ jumps })
      handler.buildFromGraph(graph)

      const result = handler.handleMeasure(1, 1, graph)
      expect(result).toBeNull()
    })

    it('should return null for non-repeat measures', () => {
      const handler = new RepeatHandler()
      const graph = createScoreGraph({ jumps: [] })

      const result = handler.handleMeasure(0, 1, graph)
      expect(result).toBeNull()
    })

    it('should return jump navigation for first repeat iteration', () => {
      const jumps: JumpPoint[] = [
        { measureIndex: 0, beatInMeasure: 0, type: 'repeat-start' },
        { measureIndex: 3, beatInMeasure: 0, type: 'repeat-end', targetMeasureIndex: 0 },
      ]

      const graph = createScoreGraph({ jumps })
      handler.buildFromGraph(graph)

      const result = handler.handleMeasure(3, 1, graph)

      expect(result).not.toBeNull()
      expect(result?.didJump).toBe(true)
      expect(result?.jumpType).toBe('repeat-end')
      expect(result?.nextMeasureIndex).toBe(0)
      expect(result?.iteration).toBe(2)
      expect(result?.isComplete).toBe(false)
    })

    it('should handle volta endings when jumping', () => {
      const jumps: JumpPoint[] = [
        { measureIndex: 0, beatInMeasure: 0, type: 'repeat-start' },
        { measureIndex: 2, beatInMeasure: 0, type: 'volta-start', voltaNumber: 1 },
        { measureIndex: 3, beatInMeasure: 0, type: 'volta-start', voltaNumber: 2 },
        { measureIndex: 4, beatInMeasure: 0, type: 'repeat-end', targetMeasureIndex: 0 },
      ]

      const graph = createScoreGraph({ jumps })
      handler.buildFromGraph(graph)

      // First call: currentIteration=1, so nextIteration=2. Volta 2 exists at measure 3
      // Should jump to volta 2 (measure 3) with jumpType 'volta-start'
      const result1 = handler.handleMeasure(4, 1, graph)
      expect(result1?.didJump).toBe(true)
      expect(result1?.jumpType).toBe('volta-start')
      expect(result1?.nextMeasureIndex).toBe(3) // Volta 2 is at measure 3
      expect(result1?.iteration).toBe(2)
      expect(result1?.isComplete).toBe(false)
    })

    it('should return null when repeat is complete (max iterations reached)', () => {
      const jumps: JumpPoint[] = [
        { measureIndex: 0, beatInMeasure: 0, type: 'repeat-start' },
        { measureIndex: 3, beatInMeasure: 0, type: 'repeat-end', targetMeasureIndex: 0 },
      ]

      const graph = createScoreGraph({ jumps })
      handler.buildFromGraph(graph)

      // Manually set iteration to max
      const repeat = handler.getRepeats().get('repeat-0')
      if (repeat) {
        repeat.currentIteration = 2
      }

      const result = handler.handleMeasure(3, 2, graph)
      expect(result).toBeNull()
    })
  })

  describe('RepeatHandler.getActiveRepeat', () => {
    let handler: RepeatHandler

    beforeEach(() => {
      const jumps: JumpPoint[] = [
        { measureIndex: 0, beatInMeasure: 0, type: 'repeat-start' },
        { measureIndex: 3, beatInMeasure: 0, type: 'repeat-end', targetMeasureIndex: 0 },
      ]

      handler = new RepeatHandler()
      handler.buildFromGraph(createScoreGraph({ jumps }))
    })

    it('should find active repeat containing measure', () => {
      const repeat = handler.getActiveRepeat(1)
      expect(repeat).not.toBeNull()
      expect(repeat?.startMeasure).toBe(0)
      expect(repeat?.endMeasure).toBe(3)
    })

    it('should return null for measures outside repeat', () => {
      const repeat = handler.getActiveRepeat(5)
      expect(repeat).toBeNull()
    })
  })

  describe('RepeatHandler.getRepeatEndingAt', () => {
    let handler: RepeatHandler

    beforeEach(() => {
      const jumps: JumpPoint[] = [
        { measureIndex: 0, beatInMeasure: 0, type: 'repeat-start' },
        { measureIndex: 3, beatInMeasure: 0, type: 'repeat-end', targetMeasureIndex: 0 },
      ]

      handler = new RepeatHandler()
      handler.buildFromGraph(createScoreGraph({ jumps }))
    })

    it('should find repeat ending at measure', () => {
      const repeat = handler.getRepeatEndingAt(3)
      expect(repeat).not.toBeNull()
      expect(repeat?.endMeasure).toBe(3)
    })

    it('should return null if no repeat ends at measure', () => {
      const repeat = handler.getRepeatEndingAt(1)
      expect(repeat).toBeNull()
    })
  })

  describe('RepeatHandler.reset', () => {
    it('should reset iteration to 1', () => {
      const jumps: JumpPoint[] = [
        { measureIndex: 0, beatInMeasure: 0, type: 'repeat-start' },
        { measureIndex: 3, beatInMeasure: 0, type: 'repeat-end', targetMeasureIndex: 0 },
      ]

      const handler = new RepeatHandler()
      const graph = createScoreGraph({ jumps })
      handler.buildFromGraph(graph)

      // Advance iteration
      const repeat = handler.getRepeats().get('repeat-0')
      if (repeat) {
        repeat.currentIteration = 2
        repeat.isActive = true
      }

      handler.reset()

      const resetRepeat = handler.getRepeats().get('repeat-0')
      expect(resetRepeat?.currentIteration).toBe(1)
      expect(resetRepeat?.isActive).toBe(false)
    })
  })

  describe('RepeatHandler.getState', () => {
    it('should return current state', () => {
      const jumps: JumpPoint[] = [
        { measureIndex: 0, beatInMeasure: 0, type: 'repeat-start' },
        { measureIndex: 3, beatInMeasure: 0, type: 'repeat-end', targetMeasureIndex: 0 },
      ]

      const handler = new RepeatHandler()
      const graph = createScoreGraph({ jumps })
      handler.buildFromGraph(graph)

      const state = handler.getState()
      expect(state.repeats).toHaveLength(1)
      expect(state.repeats[0].startMeasure).toBe(0)
      expect(state.repeats[0].endMeasure).toBe(3)
    })
  })
})
