import { describe, it, expect, beforeEach } from 'vitest'
import { PositionTracker } from '../PositionTracker'
import type { TrackingResult } from '../types'

import { PartSelector } from '@/models/part/PartSelector'
import { PositionQuery } from '@/models/part/PositionQuery'
import type { Score, Part, Voice, Note, Pitch } from '@/types'

// Helper to create test pitch
function createPitch(noteName: 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B', octave: number): Pitch {
  const midiNumber = 60 + (octave - 4) * 12 + ['C', 'D', 'E', 'F', 'G', 'A', 'B'].indexOf(noteName)
  return {
    noteName,
    octave,
    midiNumber,
    frequency: 440 * Math.pow(2, (midiNumber - 69) / 12),
  }
}

// Helper to create test note
function createNote(
  id: string,
  pitch: Pitch | null,
  startTime: number,
  durationBeats: number
): Note {
  return {
    id,
    pitch,
    duration: { type: 'quarter', dots: 0 },
    articulations: [],
    startTime,
    durationBeats,
    voiceId: 'voice-1',
    measureId: 'measure-1',
  }
}

// Helper to create test score
function createTestScore(): Score {
  const notes: Note[] = [
    createNote('note-1', createPitch('C', 4), 0, 1), // C4 at beat 0
    createNote('note-2', createPitch('D', 4), 1, 1), // D4 at beat 1
    createNote('note-3', createPitch('E', 4), 2, 1), // E4 at beat 2
    createNote('note-4', createPitch('F', 4), 3, 1), // F4 at beat 3
    createNote('note-5', createPitch('G', 4), 4, 1), // G4 at beat 4
  ]

  const voice: Voice = {
    id: 'voice-1',
    name: 'Voice 1',
    measures: [
      {
        id: 'measure-1',
        number: 1,
        notes,
        rests: [],
      },
    ],
  }

  const part: Part = {
    id: 'part-1',
    name: 'Piano',
    instrument: {
      id: 'instrument-1',
      name: 'Piano',
      category: 'keyboard',
    },
    voices: [voice],
  }

  return {
    id: 'score-1',
    metadata: {
      title: 'Test Score',
    },
    parts: [part],
  }
}

describe('PositionTracker', () => {
  let tracker: PositionTracker
  let positionQuery: PositionQuery
  let score: Score

  beforeEach(() => {
    score = createTestScore()

    const selector = new PartSelector(score)
    selector.selectPart('part-1')
    positionQuery = new PositionQuery(selector)
    tracker = new PositionTracker(positionQuery)
  })

  describe('initialization', () => {
    it('should initialize with correct default state', () => {
      const state = tracker.getState()
      expect(state.mode).toBe('stopped')
      expect(state.positionBeats).toBe(0)
      expect(state.confidence).toBe(0)
    })

    it('should start in playing mode after start()', () => {
      tracker.start()
      const state = tracker.getState()
      expect(state.mode).toBe('playing')
    })

    it('should pause correctly', () => {
      tracker.start()
      tracker.pause()
      const state = tracker.getState()
      expect(state.mode).toBe('paused')
    })

    it('should stop correctly', () => {
      tracker.start()
      tracker.stop()
      const state = tracker.getState()
      expect(state.mode).toBe('stopped')
    })
  })

  describe('pitch detection', () => {
    it('should advance when correct pitch is detected', () => {
      tracker.start()

      // Detect C4 (correct pitch for position 0)
      const result = tracker.onDetectionResult({
        timestamp: Date.now(),
        frequency: 261.63, // C4
        midiNumber: 60,
        confidence: 0.9,
        amplitude: 0.5,
        centsDeviation: null,
        targetFrequency: null,
      })

      expect(result.isCorrect).toBe(true)
      expect(result.shouldAdvance).toBe(true)
      expect(result.errorType).toBe(null)

      // Position should have advanced
      const state = tracker.getState()
      expect(state.positionBeats).toBe(1) // Now at D4
    })

    it('should detect pitch error when wrong note played', () => {
      tracker.start()

      // Detect wrong pitch (E4 instead of C4)
      const result = tracker.onDetectionResult({
        timestamp: Date.now(),
        frequency: 329.63, // E4
        midiNumber: 64,
        confidence: 0.9,
        amplitude: 0.5,
        centsDeviation: null,
        targetFrequency: null,
      })

      expect(result.isCorrect).toBe(false)
      expect(result.errorType).toBe('pitch')
      expect(result.centsDeviation).not.toBe(null)

      // Position should NOT advance
      const state = tracker.getState()
      expect(state.positionBeats).toBe(0) // Still at C4
    })

    it('should ignore low confidence detections', () => {
      tracker.start()

      // Low confidence detection
      const result = tracker.onDetectionResult({
        timestamp: Date.now(),
        frequency: 261.63, // C4 (correct)
        midiNumber: 60,
        confidence: 0.5, // Below threshold
        amplitude: 0.5,
        centsDeviation: null,
        targetFrequency: null,
      })

      expect(result.isCorrect).toBe(false)
      expect(result.errorType).toBe('confidence')

      // Position should NOT advance
      const state = tracker.getState()
      expect(state.positionBeats).toBe(0)
    })

    it('should handle pitch within tolerance', () => {
      tracker.start()

      // Slightly sharp C4 (within 20 cents tolerance)
      const result = tracker.onDetectionResult({
        timestamp: Date.now(),
        frequency: 263.5, // C4 + ~12 cents
        midiNumber: 60,
        confidence: 0.9,
        amplitude: 0.5,
        centsDeviation: null,
        targetFrequency: null,
      })

      expect(result.isCorrect).toBe(true)
      expect(Math.abs(result.centsDeviation!)).toBeLessThan(20)
    })

    it('should handle pitch outside tolerance', () => {
      tracker.start()

      // Very sharp C4 (outside 20 cents tolerance)
      const result = tracker.onDetectionResult({
        timestamp: Date.now(),
        frequency: 270, // C4 + ~50 cents
        midiNumber: 60,
        confidence: 0.9,
        amplitude: 0.5,
        centsDeviation: null,
        targetFrequency: null,
      })

      expect(result.isCorrect).toBe(false)
      expect(Math.abs(result.centsDeviation!)).toBeGreaterThan(20)
    })
  })

  describe('position control', () => {
    it('should advance to next note', () => {
      tracker.start()
      expect(tracker.getCurrentPositionBeats()).toBe(0)

      tracker.advance()
      expect(tracker.getCurrentPositionBeats()).toBe(1)

      tracker.advance()
      expect(tracker.getCurrentPositionBeats()).toBe(2)
    })

    it('should rewind to previous note', () => {
      tracker.start()
      tracker.advance()
      tracker.advance()
      expect(tracker.getCurrentPositionBeats()).toBe(2)

      tracker.rewind()
      expect(tracker.getCurrentPositionBeats()).toBe(1)
    })

    it('should set position directly', () => {
      tracker.start()
      tracker.setPositionBeats(3)
      expect(tracker.getCurrentPositionBeats()).toBe(3)
    })

    it('should reset to beginning', () => {
      tracker.start()
      tracker.advance()
      tracker.advance()
      tracker.reset()

      const state = tracker.getState()
      expect(state.positionBeats).toBe(0)
      expect(state.mode).toBe('stopped')
    })
  })

  describe('callbacks', () => {
    it('should notify subscribers of tracking results', () => {
      const results: TrackingResult[] = []
      tracker.subscribe((result) => results.push(result))

      tracker.start()
      tracker.onDetectionResult({
        timestamp: Date.now(),
        frequency: 261.63,
        midiNumber: 60,
        confidence: 0.9,
        amplitude: 0.5,
        centsDeviation: null,
        targetFrequency: null,
      })

      expect(results.length).toBe(1)
      expect(results[0].isCorrect).toBe(true)
    })

    it('should allow unsubscribing', () => {
      const results: TrackingResult[] = []
      const unsubscribe = tracker.subscribe((result) => results.push(result))

      tracker.start()
      unsubscribe()
      tracker.onDetectionResult({
        timestamp: Date.now(),
        frequency: 261.63,
        midiNumber: 60,
        confidence: 0.9,
        amplitude: 0.5,
        centsDeviation: null,
        targetFrequency: null,
      })

      expect(results.length).toBe(0)
    })
  })

  describe('configuration', () => {
    it('should use custom tolerance', () => {
      const customTracker = new PositionTracker(positionQuery, {
        pitchToleranceCents: 50, // Wider tolerance
      })

      customTracker.start()

      // 30 cents sharp - would fail with default, pass with custom
      const result = customTracker.onDetectionResult({
        timestamp: Date.now(),
        frequency: 266, // ~30 cents sharp
        midiNumber: 60,
        confidence: 0.9,
        amplitude: 0.5,
        centsDeviation: null,
        targetFrequency: null,
      })

      expect(result.isCorrect).toBe(true)
    })

    it('should disable auto-advance', () => {
      const customTracker = new PositionTracker(positionQuery, {
        autoAdvance: false,
      })

      customTracker.start()

      const result = customTracker.onDetectionResult({
        timestamp: Date.now(),
        frequency: 261.63,
        midiNumber: 60,
        confidence: 0.9,
        amplitude: 0.5,
        centsDeviation: null,
        targetFrequency: null,
      })

      expect(result.isCorrect).toBe(true)
      expect(result.shouldAdvance).toBe(false) // Correct but not advancing

      // Position should NOT advance
      expect(customTracker.getCurrentPositionBeats()).toBe(0)
    })
  })
})
