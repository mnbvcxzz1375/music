/**
 * Practice Engine
 *
 * Main practice workflow engine that manages practice sessions,
 * error tracking, retries, and pass/fail determination
 */

import type {
  PracticeState,
  PracticeConfig,
  PracticeResult,
  PracticeProgress,
  ErrorType,
  ErrorSeverity,
} from './types'
import { ErrorTracker } from './ErrorTracker'

/**
 * Default practice configuration
 */
const DEFAULT_CONFIG: PracticeConfig = {
  totalNotes: 100,
  maxRetries: 3,
  passThreshold: 0.8, // 80%
  maxSevereErrors: 3,
  allowRetry: true,
}

/**
 * PracticeEngine class
 *
 * Orchestrates the practice workflow
 */
export class PracticeEngine {
  private state: PracticeState
  private config: PracticeConfig
  private errorTracker: ErrorTracker
  private startTime: number = 0
  private endTime: number = 0

  constructor(config: Partial<PracticeConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.errorTracker = new ErrorTracker()
    this.state = this.createInitialState()
  }

  /**
   * Create initial practice state
   */
  private createInitialState(): PracticeState {
    return {
      currentPosition: 0,
      totalNotes: this.config.totalNotes,
      correctNotes: 0,
      errors: [],
      retryCount: 0,
      maxRetries: this.config.maxRetries,
      isComplete: false,
      passed: false,
    }
  }

  /**
   * Start or restart the practice session
   */
  start(): void {
    this.state = this.createInitialState()
    this.errorTracker.clear()
    this.startTime = Date.now()
    this.endTime = 0
  }

  /**
   * Record an error at the current position
   */
  recordError(type: ErrorType, severity: ErrorSeverity, details?: string): void {
    if (this.state.isComplete) return

    this.errorTracker.recordError(this.state.currentPosition, type, severity, undefined, details)
    this.state.errors = this.errorTracker.getErrors()
  }

  /**
   * Advance to the next note
   * Returns true if advanced, false if at end
   */
  advanceNote(isCorrect: boolean): boolean {
    if (this.state.isComplete) return false

    if (isCorrect) {
      this.state.correctNotes++
    }

    this.state.currentPosition++

    if (this.state.currentPosition >= this.state.totalNotes) {
      this.completePractice()
    }

    return true
  }

  /**
   * Set current position
   */
  setPosition(position: number): void {
    this.state.currentPosition = Math.max(0, Math.min(position, this.state.totalNotes))
  }

  /**
   * Attempt a retry
   * Returns true if retry was allowed, false if max retries exceeded
   */
  retry(): boolean {
    if (!this.config.allowRetry) return false
    if (this.state.retryCount >= this.config.maxRetries) return false
    if (!this.state.isComplete) return false

    // Reset for retry
    this.state.retryCount++
    this.state.currentPosition = 0
    this.state.correctNotes = 0
    this.state.errors = []
    this.state.isComplete = false
    this.state.passed = false
    this.errorTracker.clear()
    this.startTime = Date.now()
    this.endTime = 0

    return true
  }

  /**
   * Complete the practice session and determine pass/fail
   */
  private completePractice(): void {
    this.state.isComplete = true
    this.endTime = Date.now()
    this.state.passed = this.determinePass()
  }

  /**
   * Determine if practice passed based on criteria
   */
  private determinePass(): boolean {
    // Check accuracy threshold
    const accuracy = this.calculateAccuracy()
    if (accuracy < this.config.passThreshold) return false

    // Check severe error count
    const severeCount = this.errorTracker.getErrorCountBySeverity('severe')
    if (severeCount > this.config.maxSevereErrors) return false

    return true
  }

  /**
   * Calculate current accuracy
   */
  private calculateAccuracy(): number {
    if (this.state.totalNotes === 0) return 1
    return this.state.correctNotes / this.state.totalNotes
  }

  /**
   * Check if practice passed
   */
  isPassed(): boolean {
    return this.state.passed
  }

  /**
   * Check if practice is complete
   */
  isComplete(): boolean {
    return this.state.isComplete
  }

  /**
   * Get current progress percentage
   */
  getProgress(): number {
    if (this.state.totalNotes === 0) return 100
    return (this.state.currentPosition / this.state.totalNotes) * 100
  }

  /**
   * Get current state
   */
  getState(): PracticeState {
    return { ...this.state }
  }

  /**
   * Get error tracker
   */
  getErrorTracker(): ErrorTracker {
    return this.errorTracker
  }

  /**
   * Get practice result (only valid after completion)
   */
  getResult(): PracticeResult {
    const duration = (this.endTime - this.startTime) / 1000
    const accuracy = this.calculateAccuracy()

    return {
      totalNotes: this.state.totalNotes,
      correctNotes: this.state.correctNotes,
      errors: this.state.errors,
      accuracy: accuracy * 100,
      passed: this.state.passed,
      retriesUsed: this.state.retryCount,
      duration,
      errorBreakdown: this.errorTracker.getErrorBreakdown(),
    }
  }

  /**
   * Get progress information for display
   */
  getProgressInfo(): PracticeProgress {
    let status: PracticeProgress['status']

    if (this.state.isComplete) {
      status = this.state.passed ? 'passed' : 'failed'
    } else if (this.errorTracker.hasErrorsAtPosition(this.state.currentPosition)) {
      status = 'error'
    } else {
      status = 'playing'
    }

    return {
      position: this.getProgress(),
      accuracy: this.calculateAccuracy() * 100,
      errorCount: this.state.errors.length,
      remainingRetries: this.config.maxRetries - this.state.retryCount,
      status,
      totalNotes: this.state.currentPosition + this.state.errors.length,
      correctNotes: this.state.currentPosition,
      pitchErrors: Math.floor(this.state.errors.length * 0.6),
      rhythmErrors: Math.floor(this.state.errors.length * 0.4),
    }
  }

  /**
   * Reset the practice session
   */
  reset(): void {
    this.start()
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<PracticeConfig>): void {
    this.config = { ...this.config, ...config }
    this.state.maxRetries = this.config.maxRetries
    this.state.totalNotes = this.config.totalNotes
  }

  /**
   * Get current configuration
   */
  getConfig(): PracticeConfig {
    return { ...this.config }
  }
}
