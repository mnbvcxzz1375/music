import type { Part } from '../../types/part'
import type { Note } from '../../types/note'

/**
 * TimelineEntry represents a single playable element in the timeline
 * Flattens all voices into a single sorted sequence
 */
export interface TimelineEntry {
  time: number // Start time in beats
  note: Note | null // null for rests
  durationBeats: number
  measureIndex: number
  voiceId: string
  type: 'note' | 'rest'
}

/**
 * PartTimeline generates and manages a flat timeline from a Part
 * Handles all voices and overlapping notes from multiple voices
 */
export class PartTimeline {
  private timeline: TimelineEntry[] = []
  private part: Part

  constructor(part: Part) {
    this.part = part
    this.generateTimeline()
  }

  /**
   * Generate flat timeline from Part by collecting all notes from all voices
   * Sorts by start time to create a linear playback sequence
   */
  private generateTimeline(): void {
    const entries: TimelineEntry[] = []

    // Collect all notes and rests from all voices
    for (const voice of this.part.voices) {
      for (const measure of voice.measures) {
        const measureIndex = measure.number - 1

        // Add notes
        for (const note of measure.notes) {
          entries.push({
            time: note.startTime,
            note,
            durationBeats: note.durationBeats,
            measureIndex,
            voiceId: voice.id,
            type: 'note',
          })
        }

        // Add rests
        for (const rest of measure.rests) {
          entries.push({
            time: rest.startTime,
            note: null,
            durationBeats: rest.durationBeats,
            measureIndex,
            voiceId: voice.id,
            type: 'rest',
          })
        }
      }
    }

    // Sort by start time
    entries.sort((a, b) => a.time - b.time)
    this.timeline = entries
  }

  /**
   * Get the note at a specific time (or closest if exact match not found)
   * Returns the first note that starts at or before the given time
   */
  getNoteAt(time: number): TimelineEntry | null {
    // Binary search for the entry at or before the given time
    let low = 0
    let high = this.timeline.length - 1
    let result: TimelineEntry | null = null

    while (low <= high) {
      const mid = Math.floor((low + high) / 2)
      const entry = this.timeline[mid]

      if (entry.time <= time) {
        result = entry
        low = mid + 1
      } else {
        high = mid - 1
      }
    }

    return result
  }

  /**
   * Get the next note after a given time
   * Returns the first note that starts after the given time
   */
  getNextNote(time: number): TimelineEntry | null {
    const currentIndex = this.timeline.findIndex(entry => entry.time > time)
    return currentIndex >= 0 ? this.timeline[currentIndex] : null
  }

  /**
   * Get the previous note before a given time
   * Returns the last note that starts before the given time
   */
  getPreviousNote(time: number): TimelineEntry | null {
    const currentIndex = this.timeline.findIndex(entry => entry.time >= time)
    if (currentIndex === -1) {
      // Time is after all notes
      return this.timeline.length > 0 ? this.timeline[this.timeline.length - 1] : null
    }
    if (currentIndex === 0) {
      // Time is before all notes
      return null
    }
    return this.timeline[currentIndex - 1]
  }

  /**
   * Get all notes at a specific time (handles overlapping notes from different voices)
   */
  getNotesAtTime(time: number): TimelineEntry[] {
    return this.timeline.filter(
      entry => entry.time <= time && time < entry.time + entry.durationBeats,
    )
  }

  /**
   * Get the entire timeline (read-only)
   */
  getTimeline(): readonly TimelineEntry[] {
    return Object.freeze([...this.timeline])
  }

  /**
   * Get timeline length
   */
  getLength(): number {
    return this.timeline.length
  }

  /**
   * Get total duration in beats
   */
  getTotalDuration(): number {
    if (this.timeline.length === 0) return 0
    const lastEntry = this.timeline[this.timeline.length - 1]
    return lastEntry.time + lastEntry.durationBeats
  }

  /**
   * Get timeline entries in range [startTime, endTime)
   */
  getEntriesInRange(startTime: number, endTime: number): TimelineEntry[] {
    return this.timeline.filter(
      entry => entry.time >= startTime && entry.time < endTime,
    )
  }

  /**
   * Find index of an entry in the timeline
   */
  getIndexOfEntry(entry: TimelineEntry): number {
    return this.timeline.findIndex(e => e === entry)
  }

  /**
   * Get entry at index
   */
  getEntryAt(index: number): TimelineEntry | null {
    return index >= 0 && index < this.timeline.length ? this.timeline[index] : null
  }

  /**
   * Get part reference
   */
  getPart(): Part {
    return this.part
  }
}
