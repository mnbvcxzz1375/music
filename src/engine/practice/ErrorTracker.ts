/**
 * Error Tracker
 *
 * Tracks and manages errors that occur during practice
 */

import type { PracticeError, ErrorType, ErrorSeverity } from './types'

/**
 * ErrorTracker class
 *
 * Manages a collection of practice errors with efficient lookup
 */
export class ErrorTracker {
  private errors: PracticeError[] = []

  /**
   * Add an error to the tracker
   */
  addError(error: PracticeError): void {
    this.errors.push({
      ...error,
      timestamp: error.timestamp || Date.now(),
    })
  }

  /**
   * Record an error with simplified parameters
   */
  recordError(
    position: number,
    type: ErrorType,
    severity: ErrorSeverity,
    noteIndex?: number,
    details?: string
  ): void {
    this.addError({
      position,
      type,
      severity,
      timestamp: Date.now(),
      noteIndex,
      details,
    })
  }

  /**
   * Get all errors
   */
  getErrors(): PracticeError[] {
    return [...this.errors]
  }

  /**
   * Get errors at a specific position
   */
  getErrorsAtPosition(position: number): PracticeError[] {
    return this.errors.filter((e) => e.position === position)
  }

  /**
   * Check if there are errors at a position
   */
  hasErrorsAtPosition(position: number): boolean {
    return this.errors.some((e) => e.position === position)
  }

  /**
   * Get total error count
   */
  getErrorCount(): number {
    return this.errors.length
  }

  /**
   * Get count of errors by type
   */
  getErrorCountByType(type: ErrorType): number {
    return this.errors.filter((e) => e.type === type).length
  }

  /**
   * Get count of errors by severity
   */
  getErrorCountBySeverity(severity: ErrorSeverity): number {
    return this.errors.filter((e) => e.severity === severity).length
  }

  /**
   * Get breakdown of errors by type
   */
  getErrorBreakdown(): { pitch: number; rhythm: number; timing: number } {
    return {
      pitch: this.getErrorCountByType('pitch'),
      rhythm: this.getErrorCountByType('rhythm'),
      timing: this.getErrorCountByType('timing'),
    }
  }

  /**
   * Get the most severe errors
   */
  getSevereErrors(): PracticeError[] {
    return this.errors.filter((e) => e.severity === 'severe')
  }

  /**
   * Check if there are any severe errors
   */
  hasSevereErrors(): boolean {
    return this.errors.some((e) => e.severity === 'severe')
  }

  /**
   * Clear all errors
   */
  clear(): void {
    this.errors = []
  }

  /**
   * Get errors within a position range
   */
  getErrorsInRange(startPosition: number, endPosition: number): PracticeError[] {
    return this.errors.filter((e) => e.position >= startPosition && e.position <= endPosition)
  }

  /**
   * Remove errors at a specific position
   */
  removeErrorsAtPosition(position: number): number {
    const initialCount = this.errors.length
    this.errors = this.errors.filter((e) => e.position !== position)
    return initialCount - this.errors.length
  }
}
