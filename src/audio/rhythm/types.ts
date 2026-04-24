/**
 * Rhythm Evaluation Types
 *
 * Types for onset detection and beat/timing evaluation
 */

/**
 * Result of onset detection
 */
export interface OnsetResult {
  /** Time in seconds when onset was detected */
  time: number
  /** Confidence level of the detection (0-1) */
  confidence: number
}

/**
 * Timing error classification
 */
export interface TimingError {
  /** Deviation in milliseconds (positive = late, negative = early) */
  deviationMs: number
  /** Severity of the timing error */
  severity: 'correct' | 'slight' | 'moderate' | 'severe'
  /** Direction of the error */
  direction: 'early' | 'on-time' | 'late'
}

/**
 * Duration accuracy result
 */
export interface DurationAccuracy {
  /** Expected duration in milliseconds */
  expectedMs: number
  /** Actual duration in milliseconds */
  actualMs: number
  /** Accuracy ratio (0-1, 1 = perfect) */
  accuracy: number
  /** Whether duration was too short or too long */
  error: 'too-short' | 'too-long' | 'correct'
}

/**
 * Complete rhythm evaluation result
 */
export interface RhythmEvaluation {
  /** Timing error for note onset */
  timing: TimingError
  /** Duration accuracy for the note */
  duration: DurationAccuracy
  /** Overall rhythm score (0-1) */
  score: number
}

/**
 * Onset detector configuration
 */
export interface OnsetDetectorConfig {
  /** Sample rate in Hz */
  sampleRate: number
  /** Frame size in samples */
  frameSize: number
  /** Hop size in samples (frame overlap) */
  hopSize: number
  /** Energy threshold for onset detection */
  threshold: number
}

/**
 * Beat evaluator configuration
 */
export interface BeatEvaluatorConfig {
  /** Tempo in BPM */
  tempo: number
  /** Time signature */
  timeSignature: { numerator: number; denominator: number }
  /** Tolerance for timing errors in milliseconds */
  timingTolerance: number
}
