/**
 * Position Tracker Types
 *
 * Core types for the score-driven position tracking engine.
 * Principle: Score drives position, audio only confirms.
 */



/**
 * Configuration for position tracker
 */
export interface TrackerConfig {
  /** How many cents off is acceptable for pitch matching */
  pitchToleranceCents: number
  /** How many beats off is acceptable for timing */
  timingToleranceBeats: number
  /** Minimum confidence (0-1) to trust detection result */
  confidenceThreshold: number
  /** Whether to auto-advance on correct note */
  autoAdvance: boolean
}

/**
 * Default tracker configuration
 */
export const DEFAULT_TRACKER_CONFIG: TrackerConfig = {
  pitchToleranceCents: 20, // ±20 cents tolerance
  timingToleranceBeats: 0.1, // ~100ms at moderate tempo
  confidenceThreshold: 0.7, // 70% confidence required
  autoAdvance: true,
}

/**
 * Current state of the position tracker
 */
export interface TrackerState {
  /** Current position in beats from score start */
  positionBeats: number
  /** MIDI number of the expected pitch (null for rests) */
  expectedPitch: number | null
  /** Expected frequency in Hz (null for rests) */
  expectedFrequency: number | null
  /** Timestamp of last detection */
  lastDetectionTime: number
  /** Current tracking confidence (0-1) */
  confidence: number
  /** Current mode */
  mode: 'playing' | 'paused' | 'stopped'
  /** Whether currently on a rest */
  isOnRest: boolean
}

/**
 * Result of tracking comparison
 */
export interface TrackingResult {
  /** Current position in beats */
  positionBeats: number
  /** Expected MIDI number */
  expectedPitch: number | null
  /** Detected MIDI number */
  detectedPitch: number | null
  /** Detected frequency in Hz */
  detectedFrequency: number | null
  /** Deviation in cents (null if no expected pitch) */
  centsDeviation: number | null
  /** Whether the played note matches expected */
  isCorrect: boolean
  /** Whether position should advance */
  shouldAdvance: boolean
  /** Type of error if any */
  errorType: 'pitch' | 'timing' | 'confidence' | null
  /** Detection confidence */
  confidence: number
  /** Current tracker state */
  state: TrackerState
}

/**
 * Callback for tracking results
 */
export type TrackingCallback = (result: TrackingResult) => void
