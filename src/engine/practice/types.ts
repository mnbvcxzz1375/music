/**
 * Practice Engine Types
 *
 * Types for practice workflow, error tracking, and results
 */

/**
 * Types of errors that can occur during practice
 */
export type ErrorType = 'pitch' | 'rhythm' | 'timing'

/**
 * Severity levels for practice errors
 */
export type ErrorSeverity = 'slight' | 'moderate' | 'severe'

/**
 * Represents an error that occurred during practice
 */
export interface PracticeError {
  /** Beat position where the error occurred */
  position: number
  /** Type of error */
  type: ErrorType
  /** Severity of the error */
  severity: ErrorSeverity
  /** Timestamp when the error was recorded (ms) */
  timestamp: number
  /** Optional note index in the score */
  noteIndex?: number
  /** Optional additional details */
  details?: string
}

/**
 * Current state of the practice session
 */
export interface PracticeState {
  /** Current position in beats */
  currentPosition: number
  /** Total number of notes in the practice piece */
  totalNotes: number
  /** Number of notes played correctly */
  correctNotes: number
  /** Errors recorded during this practice */
  errors: PracticeError[]
  /** Current retry count */
  retryCount: number
  /** Maximum number of retries allowed */
  maxRetries: number
  /** Whether the practice session is complete */
  isComplete: boolean
  /** Whether the practice was passed */
  passed: boolean
}

/**
 * Configuration for a practice session
 */
export interface PracticeConfig {
  /** Total number of notes in the piece */
  totalNotes: number
  /** Maximum number of retries allowed */
  maxRetries: number
  /** Pass threshold (0-1, default 0.8 = 80%) */
  passThreshold: number
  /** Maximum allowed severe errors (default 3) */
  maxSevereErrors: number
  /** Whether to allow retry on failure */
  allowRetry: boolean
}

/**
 * Result of a completed practice session
 */
export interface PracticeResult {
  /** Total number of notes in the piece */
  totalNotes: number
  /** Number of notes played correctly */
  correctNotes: number
  /** All errors recorded during practice */
  errors: PracticeError[]
  /** Accuracy percentage (0-100) */
  accuracy: number
  /** Whether the practice was passed */
  passed: boolean
  /** Number of retries used */
  retriesUsed: number
  /** Practice duration in seconds */
  duration: number
  /** Breakdown by error type */
  errorBreakdown: {
    pitch: number
    rhythm: number
    timing: number
  }
}

/**
 * Progress information for display
 */
export interface PracticeProgress {
  position: number
  accuracy: number
  errorCount: number
  totalNotes: number
  correctNotes: number
  pitchErrors: number
  rhythmErrors: number
  remainingRetries: number
  status: 'playing' | 'error' | 'retrying' | 'complete' | 'passed' | 'failed'
}
