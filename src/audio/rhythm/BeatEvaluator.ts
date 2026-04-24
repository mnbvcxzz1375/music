/**
 * Beat Evaluator
 *
 * Evaluates timing accuracy and classifies timing errors
 */

import type { TimingError, DurationAccuracy, RhythmEvaluation, BeatEvaluatorConfig } from './types'

/**
 * Default timing thresholds in milliseconds
 */
const SEVERITY_THRESHOLDS = {
  correct: 25, // |deviation| < 25ms = correct
  slight: 50, // |deviation| < 50ms = slight
  moderate: 100, // |deviation| < 100ms = moderate
  // >= 100ms = severe
}

/**
 * BeatEvaluator class
 *
 * Evaluates timing accuracy for music practice
 */
export class BeatEvaluator {
  private tempo: number
  private _timeSignature: { numerator: number; denominator: number }
  private _timingTolerance: number

  constructor(config: Partial<BeatEvaluatorConfig> = {}) {
    this.tempo = config.tempo ?? 120
    this._timeSignature = config.timeSignature ?? { numerator: 4, denominator: 4 }
    this._timingTolerance = config.timingTolerance ?? 100
  }

  /**
   * Get time signature
   */
  getTimeSignature(): { numerator: number; denominator: number } {
    return this._timeSignature
  }

  /**
   * Get timing tolerance
   */
  getTimingTolerance(): number {
    return this._timingTolerance
  }


  /**
   * Evaluate timing between expected and actual onset
   */
  evaluateTiming(expectedTime: number, actualTime: number): TimingError {
    const deviationMs = (actualTime - expectedTime) * 1000 // Convert to ms
    const severity = this.classifySeverity(deviationMs)
    const direction = this.getDirection(deviationMs)

    return {
      deviationMs,
      severity,
      direction,
    }
  }

  /**
   * Classify timing error severity
   */
  classifySeverity(deviationMs: number): TimingError['severity'] {
    const absDeviation = Math.abs(deviationMs)

    if (absDeviation < SEVERITY_THRESHOLDS.correct) {
      return 'correct'
    }
    if (absDeviation < SEVERITY_THRESHOLDS.slight) {
      return 'slight'
    }
    if (absDeviation < SEVERITY_THRESHOLDS.moderate) {
      return 'moderate'
    }
    return 'severe'
  }

  /**
   * Get direction of timing error
   */
  private getDirection(deviationMs: number): TimingError['direction'] {
    if (Math.abs(deviationMs) < SEVERITY_THRESHOLDS.correct) {
      return 'on-time'
    }
    return deviationMs > 0 ? 'late' : 'early'
  }

  /**
   * Evaluate duration accuracy
   */
  evaluateDuration(
    expectedMs: number,
    actualMs: number,
    tolerancePercent: number = 0.2
  ): DurationAccuracy {
    const accuracy = Math.max(0, 1 - Math.abs(actualMs - expectedMs) / expectedMs)
    const tolerance = expectedMs * tolerancePercent
    const difference = actualMs - expectedMs

    let error: DurationAccuracy['error']
    if (Math.abs(difference) <= tolerance) {
      error = 'correct'
    } else if (difference < 0) {
      error = 'too-short'
    } else {
      error = 'too-long'
    }

    return {
      expectedMs,
      actualMs,
      accuracy,
      error,
    }
  }

  /**
   * Complete rhythm evaluation
   */
  evaluate(
    expectedOnset: number,
    actualOnset: number,
    expectedDuration: number,
    actualDuration: number
  ): RhythmEvaluation {
    const timing = this.evaluateTiming(expectedOnset, actualOnset)
    const duration = this.evaluateDuration(expectedDuration, actualDuration)

    // Calculate overall score (weighted average)
    // Timing is more important (60%) than duration (40%)
    const timingScore = this.severityToScore(timing.severity)
    const durationScore = duration.accuracy
    const score = timingScore * 0.6 + durationScore * 0.4

    return {
      timing,
      duration,
      score,
    }
  }

  /**
   * Convert severity to score (0-1)
   */
  private severityToScore(severity: TimingError['severity']): number {
    switch (severity) {
      case 'correct':
        return 1.0
      case 'slight':
        return 0.8
      case 'moderate':
        return 0.5
      case 'severe':
        return 0.2
    }
  }

  /**
   * Get beat duration in milliseconds for current tempo
   */
  getBeatDurationMs(): number {
    return 60000 / this.tempo // ms per beat
  }

  /**
   * Set tempo
   */
  setTempo(tempo: number): void {
    this.tempo = Math.max(20, Math.min(300, tempo))
  }

  /**
   * Get current tempo
   */
  getTempo(): number {
    return this.tempo
  }
}
