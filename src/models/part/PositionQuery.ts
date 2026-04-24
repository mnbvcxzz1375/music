import type { Note } from '../../types/note'
import type { TimelineEntry } from './PartTimeline'
import { PartSelector } from './PartSelector'

/**
 * Position query timing tolerance in beats
 * Used to determine if audio timing is within acceptable range
 */
const DEFAULT_TIMING_TOLERANCE_BEATS = 0.1 // ~100ms at moderate tempo

/**
 * PositionQuery provides the API for querying current position and expected pitch
 * Implements the core principle: "Score drives position, audio confirms"
 *
 * Position is determined entirely by the timeline, not by audio recognition
 * Audio only confirms if the detected pitch matches the expected note
 */
export class PositionQuery {
  private partSelector: PartSelector

  private timingToleranceBeats: number = DEFAULT_TIMING_TOLERANCE_BEATS

  constructor(partSelector: PartSelector) {
    this.partSelector = partSelector
    this.resetPosition()
  }

  /**
   * Get the expected pitch at current position
   * Returns the note that should be played now, or null if on a rest or silence
   */
  getExpectedPitch(): Note | null {
    const timeline = this.partSelector.getTimeline()
    if (!timeline) return null

    const currentTime = this.partSelector.getCurrentPositionBeats()
    const entry = timeline.getNoteAt(currentTime)

    // Return the note only if it has a pitch (null for rests/notes without pitch)
    if (!entry?.note?.pitch) return null
    return entry.note
  }


  /**
   * Get expected pitch as MIDI number if available
   */
  getExpectedPitchMidi(): number | null {
    const note = this.getExpectedPitch()
    return note?.pitch?.midiNumber || null
  }

  /**
   * Get expected pitch as frequency in Hz if available
   */
  getExpectedPitchFrequency(): number | null {
    const note = this.getExpectedPitch()
    return note?.pitch?.frequency || null
  }

  /**
   * Check if timing is correct (within tolerance)
   * Compares expected timing against actual timing
   */
  isOnTime(actualTimeBeats: number): boolean {
    const expectedTime = this.partSelector.getCurrentPositionBeats()
    const timeDiff = Math.abs(expectedTime - actualTimeBeats)
    return timeDiff <= this.timingToleranceBeats
  }

  /**
   * Get timing error in beats (positive = late, negative = early)
   */
  getTimingError(actualTimeBeats: number): number {
    const expectedTime = this.partSelector.getCurrentPositionBeats()
    return actualTimeBeats - expectedTime
  }

  /**
   * Move to next note in timeline
   * Returns true if moved to next note, false if at end
   */
  advance(): boolean {
    const timeline = this.partSelector.getTimeline()
    if (!timeline) return false

    const currentTime = this.partSelector.getCurrentPositionBeats()
    const nextEntry = timeline.getNextNote(currentTime)

    if (nextEntry) {
      this.partSelector.setCurrentPositionBeats(nextEntry.time)
      return true
    }
    return false
  }

  /**
   * Move to previous note in timeline
   * Returns true if moved to previous note, false if at start
   */
  rewind(): boolean {
    const timeline = this.partSelector.getTimeline()
    if (!timeline) return false

    const currentTime = this.partSelector.getCurrentPositionBeats()
    const prevEntry = timeline.getPreviousNote(currentTime)

    if (prevEntry) {
      this.partSelector.setCurrentPositionBeats(prevEntry.time)
      return true
    }
    return false
  }

  /**
   * Check if at end of part
   */
  isAtEnd(): boolean {
    return this.partSelector.isAtEnd()
  }

  /**
   * Get current position in beats
   */
  getCurrentPositionBeats(): number {
    return this.partSelector.getCurrentPositionBeats()
  }

  /**
   * Set current position in beats
   */
  setPositionBeats(beats: number): void {
    this.partSelector.setCurrentPositionBeats(beats)
  }

  /**
   * Reset to start of part
   */
  resetPosition(): void {
    this.partSelector.resetPosition()
  }

  /**
   * Get all notes at current time (handles overlapping notes from different voices)
   */
  getCurrentNotes(): TimelineEntry[] {
    const timeline = this.partSelector.getTimeline()
    if (!timeline) return []

    const currentTime = this.partSelector.getCurrentPositionBeats()
    return timeline.getNotesAtTime(currentTime)
  }

  /**
   * Get the current timeline entry
   */
  getCurrentTimelineEntry(): TimelineEntry | null {
    const timeline = this.partSelector.getTimeline()
    if (!timeline) return null

    const currentTime = this.partSelector.getCurrentPositionBeats()
    return timeline.getNoteAt(currentTime)
  }

  /**
   * Set timing tolerance (in beats)
   */
  setTimingTolerance(beats: number): void {
    this.timingToleranceBeats = Math.max(0, beats)
  }

  /**
   * Get timing tolerance (in beats)
   */
  getTimingTolerance(): number {
    return this.timingToleranceBeats
  }

  /**
   * Check if currently on a rest/silence
   */
  isOnRest(): boolean {
    const entry = this.getCurrentTimelineEntry()
    return !entry || entry.type === 'rest' || !entry.note?.pitch
  }

  /**
   * Get duration of current note in beats
   */
  getCurrentNoteDuration(): number {
    const entry = this.getCurrentTimelineEntry()
    return entry?.durationBeats || 0
  }

  /**
   * Get remaining beats in current note
   */
  getRemainingBeatsInNote(): number {
    const entry = this.getCurrentTimelineEntry()
    if (!entry) return 0

    const elapsed = this.partSelector.getCurrentPositionBeats() - entry.time
    return Math.max(0, entry.durationBeats - elapsed)
  }

  /**
   * Get total duration of the part in beats
   */
  getTotalDuration(): number {
    const timeline = this.partSelector.getTimeline()
    return timeline?.getTotalDuration() || 0
  }

  /**
   * Get progress as percentage (0-100)
   */
  getProgressPercent(): number {
    const total = this.getTotalDuration()
    if (total === 0) return 0
    return (this.getCurrentPositionBeats() / total) * 100
  }
}

