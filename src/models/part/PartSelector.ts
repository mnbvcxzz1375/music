import type { Score } from '../../types/score'
import type { Part } from '../../types/part'
import { PartTimeline } from './PartTimeline'

/**
 * PartSelector manages part selection and position tracking within a Score
 * Maintains the current selected part and its timeline
 */
export class PartSelector {
  private score: Score
  private selectedPartId: string | null = null
  private selectedTimeline: PartTimeline | null = null
  private currentPositionBeats: number = 0

  constructor(score: Score) {
    this.score = score
    // Select first part by default if available
    if (score.parts.length > 0) {
      this.selectPart(score.parts[0].id)
    }
  }

  /**
   * Select a part by ID and initialize its timeline
   * Resets position to start
   */
  selectPart(partId: string): boolean {
    const part = this.score.parts.find(p => p.id === partId)
    if (!part) {
      return false
    }

    this.selectedPartId = partId
    this.selectedTimeline = new PartTimeline(part)
    this.currentPositionBeats = 0
    return true
  }

  /**
   * Get currently selected part
   */
  getSelectedPart(): Part | null {
    if (!this.selectedPartId) return null
    return this.score.parts.find(p => p.id === this.selectedPartId) || null
  }

  /**
   * Get currently selected part ID
   */
  getSelectedPartId(): string | null {
    return this.selectedPartId
  }

  /**
   * Get currently selected timeline
   */
  getTimeline(): PartTimeline | null {
    return this.selectedTimeline
  }

  /**
   * Get current position in beats
   */
  getCurrentPositionBeats(): number {
    return this.currentPositionBeats
  }

  /**
   * Set current position in beats
   */
  setCurrentPositionBeats(beats: number): void {
    this.currentPositionBeats = Math.max(0, beats)
  }

  /**
   * Advance position by given number of beats
   */
  advancePositionBeats(beats: number): void {
    this.currentPositionBeats += beats
  }

  /**
   * Reset position to start
   */
  resetPosition(): void {
    this.currentPositionBeats = 0
  }

  /**
   * Check if position is at end of part
   */
  isAtEnd(): boolean {
    if (!this.selectedTimeline) return true
    const totalDuration = this.selectedTimeline.getTotalDuration()
    return this.currentPositionBeats >= totalDuration
  }

  /**
   * Get all available parts in score
   */
  getAvailableParts(): Part[] {
    return this.score.parts
  }

  /**
   * Get score reference
   */
  getScore(): Score {
    return this.score
  }

  /**
   * Switch to next part
   */
  selectNextPart(): boolean {
    const currentPart = this.getSelectedPart()
    if (!currentPart) return false

    const currentIndex = this.score.parts.findIndex(p => p.id === currentPart.id)
    const nextIndex = currentIndex + 1
    if (nextIndex < this.score.parts.length) {
      return this.selectPart(this.score.parts[nextIndex].id)
    }
    return false
  }

  /**
   * Switch to previous part
   */
  selectPreviousPart(): boolean {
    const currentPart = this.getSelectedPart()
    if (!currentPart) return false

    const currentIndex = this.score.parts.findIndex(p => p.id === currentPart.id)
    const prevIndex = currentIndex - 1
    if (prevIndex >= 0) {
      return this.selectPart(this.score.parts[prevIndex].id)
    }
    return false
  }
}
