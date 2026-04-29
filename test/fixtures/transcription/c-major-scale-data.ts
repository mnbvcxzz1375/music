/**
 * MIDI event data for a C major scale (C4 to C5).
 * Each note is a quarter note at 120 BPM.
 *
 * At 120 BPM, one quarter note = 0.5 seconds.
 * MIDI note numbers: C4=60, D4=62, E4=64, F4=65, G4=67, A4=69, B4=71, C5=72
 */

export interface MidiNoteEvent {
  /** MIDI note number (0-127) */
  note: number
  /** Note velocity (0-127) */
  velocity: number
  /** Start time in seconds */
  startTime: number
  /** End time in seconds */
  endTime: number
}

/** C major scale notes as MIDI note numbers */
export const C_MAJOR_SCALE_NOTES = [60, 62, 64, 65, 67, 69, 71, 72] as const

/** Note names corresponding to C major scale */
export const C_MAJOR_SCALE_NAMES = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'] as const

/** Duration of one quarter note at 120 BPM in seconds */
export const QUARTER_NOTE_DURATION = 0.5

/**
 * Generate MIDI events for a C major scale.
 * C4-D4-E4-F4-G4-A4-B4-C5, one quarter note each, 120 BPM.
 */
export function generateCMajorScaleMidiEvents(): MidiNoteEvent[] {
  const velocity = 80
  const events: MidiNoteEvent[] = []

  for (let i = 0; i < C_MAJOR_SCALE_NOTES.length; i++) {
    events.push({
      note: C_MAJOR_SCALE_NOTES[i],
      velocity,
      startTime: i * QUARTER_NOTE_DURATION,
      endTime: (i + 1) * QUARTER_NOTE_DURATION,
    })
  }

  return events
}

/**
 * Total duration of the C major scale in seconds.
 * 8 quarter notes * 0.5s each = 4 seconds
 */
export const C_MAJOR_SCALE_DURATION = C_MAJOR_SCALE_NOTES.length * QUARTER_NOTE_DURATION

/**
 * Expected MIDI note sequence as an array for assertion helpers.
 */
export const C_MAJOR_SCALE_MIDI_SEQUENCE = [...C_MAJOR_SCALE_NOTES]
