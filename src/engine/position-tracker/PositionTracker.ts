/**
 * Position Tracker - Core Engine
 *
 * Implements the core principle: Score drives position, audio only confirms.
 *
 * Flow:
 * 1. ScoreEngine knows current position (from PartTimeline)
 * 2. ScoreEngine.getExpectedPitch() returns what note should be played
 * 3. PositionTracker receives audio detection result
 * 4. Compare expected vs detected:
 *    - Match within tolerance → advance position
 *    - Mismatch → emit PitchError
 *    - Silence detected → stay on current position (for rests)
 */

import type { PitchDetectionOutput } from '@/audio/detection'
import { PositionQuery } from '@/models/part/PositionQuery'
import type { Note } from '@/types/note'
import type { TrackerConfig, TrackerState, TrackingResult, TrackingCallback } from './types'
import { DEFAULT_TRACKER_CONFIG } from './types'

/**
 * Convert frequency to MIDI note number
 */
function frequencyToMidi(frequency: number): number {
  return 69 + 12 * Math.log2(frequency / 440)
}

/**
 * Convert MIDI note number to frequency
 */
function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

/**
 * Calculate cents deviation between detected and expected frequency
 * Returns positive if sharp, negative if flat
 */
function calculateCentsDeviation(detectedFreq: number, expectedFreq: number): number {
  return 1200 * Math.log2(detectedFreq / expectedFreq)
}

/**
 * Pitch comparison result
 */
interface PitchComparison {
  isCorrect: boolean
  centsDeviation: number | null
  errorType: 'pitch' | 'timing' | 'confidence' | null
}

/**
 * Main Position Tracker class
 */
export class PositionTracker {
  private positionQuery: PositionQuery
  private config: TrackerConfig
  private state: TrackerState
  private callbacks: Set<TrackingCallback> = new Set()

  constructor(positionQuery: PositionQuery, config: Partial<TrackerConfig> = {}) {
    this.positionQuery = positionQuery
    this.config = { ...DEFAULT_TRACKER_CONFIG, ...config }
    this.state = this.createInitialState()
  }

  /**
   * Create initial tracker state
   */
  private createInitialState(): TrackerState {
    const expectedPitch = this.positionQuery.getExpectedPitch()
    return {
      positionBeats: this.positionQuery.getCurrentPositionBeats(),
      expectedPitch: expectedPitch?.pitch?.midiNumber || null,
      expectedFrequency: expectedPitch?.pitch?.frequency || null,
      lastDetectionTime: 0,
      confidence: 0,
      mode: 'stopped',
      isOnRest: this.positionQuery.isOnRest(),
    }
  }

  /**
   * Start tracking
   */
  start(): void {
    this.reset()
    this.state.mode = 'playing'
  }

  /**
   * Pause tracking
   */
  pause(): void {
    this.state.mode = 'paused'
  }

  /**
   * Stop tracking
   */
  stop(): void {
    this.state.mode = 'stopped'
  }

  /**
   * Reset to beginning of part
   */
  reset(): void {
    this.positionQuery.resetPosition()
    this.state = this.createInitialState()
    this.state.mode = 'stopped'
  }

  /**
   * Process audio detection result
   * This is the main entry point for the score-driven position tracking
   */
  onDetectionResult(result: PitchDetectionOutput): TrackingResult {
    // Update last detection time
    this.state.lastDetectionTime = result.timestamp

    // Check confidence threshold
    if (result.confidence < this.config.confidenceThreshold) {
      const lowConfidenceResult = this.createResult(result, {
        isCorrect: false,
        centsDeviation: null,
        errorType: 'confidence',
      })
      this.notifyCallbacks(lowConfidenceResult)
      return lowConfidenceResult
    }

    // Get expected pitch from score
    const expectedNote = this.positionQuery.getExpectedPitch()
    const expectedPitch =
      expectedNote?.pitch?.midiNumber ?? (expectedNote?.pitch?.frequency ? frequencyToMidi(expectedNote.pitch.frequency) : null)
    const expectedFreq =
      expectedNote?.pitch?.frequency || (expectedPitch ? midiToFrequency(expectedPitch) : null)

    // Update state with expected pitch
    this.state.expectedPitch = expectedPitch
    this.state.expectedFrequency = expectedFreq
    this.state.confidence = result.confidence
    this.state.isOnRest = this.positionQuery.isOnRest()

    // Handle rests - no expected pitch
    if (expectedPitch === null || expectedFreq === null) {
      // We're on a rest, check if user is silent
      const restResult = this.handleRestDetection(result)
      this.notifyCallbacks(restResult)
      return restResult
    }

    // Handle pitch comparison
    const comparison = this.comparePitch(result, expectedFreq)

    // Create result
    const trackingResult = this.createResult(result, comparison)

    // Auto-advance if correct and enabled
    if (comparison.isCorrect && this.config.autoAdvance) {
      this.advance()
    }

    this.notifyCallbacks(trackingResult)
    return trackingResult
  }

  /**
   * Handle detection when on a rest
   */
  private handleRestDetection(result: PitchDetectionOutput): TrackingResult {
    // If on a rest and we detect sound, that's an error
    if (result.frequency !== null && result.confidence >= this.config.confidenceThreshold) {
      return this.createResult(result, {
        isCorrect: false,
        centsDeviation: null,
        errorType: 'timing', // Should be silent during rest
      })
    }

    // Rest is being held correctly (silence detected)
    // Auto-advance to next note
    if (this.config.autoAdvance) {
      this.advance()
    }

    return this.createResult(result, {
      isCorrect: true,
      centsDeviation: null,
      errorType: null,
    })
  }

  /**
   * Compare detected pitch with expected pitch
   */
  private comparePitch(result: PitchDetectionOutput, expectedFreq: number): PitchComparison {
    // No frequency detected
    if (result.frequency === null || result.midiNumber === null) {
      return {
        isCorrect: false,
        centsDeviation: null,
        errorType: 'confidence',
      }
    }

    // Calculate cents deviation
    const centsDeviation = calculateCentsDeviation(result.frequency, expectedFreq)

    // Check if within tolerance
    const isCorrect = Math.abs(centsDeviation) <= this.config.pitchToleranceCents

    return {
      isCorrect,
      centsDeviation,
      errorType: isCorrect ? null : 'pitch',
    }
  }

  /**
   * Create a tracking result
   */
  private createResult(result: PitchDetectionOutput, comparison: PitchComparison): TrackingResult {
    return {
      positionBeats: this.state.positionBeats,
      expectedPitch: this.state.expectedPitch,
      detectedPitch: result.midiNumber,
      detectedFrequency: result.frequency,
      centsDeviation: comparison.centsDeviation,
      isCorrect: comparison.isCorrect,
      shouldAdvance: comparison.isCorrect && this.config.autoAdvance,
      errorType: comparison.errorType,
      confidence: result.confidence,
      state: { ...this.state },
    }
  }

  /**
   * Advance to next note
   */
  advance(): boolean {
    const advanced = this.positionQuery.advance()
    if (advanced) {
      this.state.positionBeats = this.positionQuery.getCurrentPositionBeats()
      const expectedNote = this.positionQuery.getExpectedPitch()
      this.state.expectedPitch = expectedNote?.pitch?.midiNumber || null
      this.state.expectedFrequency = expectedNote?.pitch?.frequency || null
      this.state.isOnRest = this.positionQuery.isOnRest()
    }
    return advanced
  }

  /**
   * Move to previous note
   */
  rewind(): boolean {
    const rewound = this.positionQuery.rewind()
    if (rewound) {
      this.state.positionBeats = this.positionQuery.getCurrentPositionBeats()
      const expectedNote = this.positionQuery.getExpectedPitch()
      this.state.expectedPitch = expectedNote?.pitch?.midiNumber || null
      this.state.expectedFrequency = expectedNote?.pitch?.frequency || null
      this.state.isOnRest = this.positionQuery.isOnRest()
    }
    return rewound
  }

  /**
   * Set position to specific beat
   */
  setPositionBeats(beats: number): void {
    this.positionQuery.setPositionBeats(beats)
    this.state.positionBeats = this.positionQuery.getCurrentPositionBeats()
    const expectedNote = this.positionQuery.getExpectedPitch()
    this.state.expectedPitch = expectedNote?.pitch?.midiNumber || null
    this.state.expectedFrequency = expectedNote?.pitch?.frequency || null
    this.state.isOnRest = this.positionQuery.isOnRest()
  }

  /**
   * Get current state
   */
  getState(): Readonly<TrackerState> {
    return { ...this.state }
  }

  /**
   * Get current expected note
   */
  getExpectedNote(): Note | null {
    return this.positionQuery.getExpectedPitch()
  }

  /**
   * Check if at end of score
   */
  isAtEnd(): boolean {
    return this.positionQuery.isAtEnd()
  }

  /**
   * Get current position in beats
   */
  getCurrentPositionBeats(): number {
    return this.positionQuery.getCurrentPositionBeats()
  }

  /**
   * Get progress percentage
   */
  getProgressPercent(): number {
    return this.positionQuery.getProgressPercent()
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<TrackerConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Subscribe to tracking results
   */
  subscribe(callback: TrackingCallback): () => void {
    this.callbacks.add(callback)
    return () => {
      this.callbacks.delete(callback)
    }
  }

  /**
   * Notify all subscribers
   */
  private notifyCallbacks(result: TrackingResult): void {
    this.callbacks.forEach((callback) => callback(result))
  }
}
