import { PitchAccuracy, PitchDirection } from './types'

// Helper function to get note name from MIDI number
const getNoteName = (midi: number): string => {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  const noteIndex = midi % 12
  const octave = Math.floor(midi / 12) - 1
  return `${notes[noteIndex]}${octave}`
}

interface UsePitchFeedbackResult {
  accuracy: PitchAccuracy
  direction: PitchDirection
  color: string
  displayCents: string
  detectedNoteName: string
  expectedNoteName: string
  isConfident: boolean
}

export const usePitchFeedback = (
  centsDeviation: number | null,
  expectedPitch: number | null,
  detectedPitch: number | null,
  confidence: number
): UsePitchFeedbackResult => {
  const isConfident = confidence >= 0.8

  // Defaults
  let accuracy: PitchAccuracy = 'correct'
  let direction: PitchDirection = 'on-pitch'
  let color = 'gray'

  if (centsDeviation !== null && isConfident) {
    const absCents = Math.abs(centsDeviation)

    // Determine accuracy and color
    if (absCents <= 20) {
      accuracy = 'correct'
      color = '#4caf50' // Green
    } else if (absCents <= 50) {
      accuracy = 'slight'
      color = '#ffeb3b' // Yellow
    } else if (absCents <= 100) {
      accuracy = 'moderate'
      color = '#ff9800' // Orange
    } else {
      accuracy = 'severe'
      color = '#f44336' // Red
    }

    // Determine direction
    if (absCents <= 5) {
      direction = 'on-pitch'
    } else if (centsDeviation > 0) {
      direction = 'sharp'
    } else {
      direction = 'flat'
    }
  }

  const displayCents =
    centsDeviation !== null ? `${centsDeviation > 0 ? '+' : ''}${Math.round(centsDeviation)}` : '--'

  const detectedNoteName = detectedPitch !== null ? getNoteName(detectedPitch) : '--'
  const expectedNoteName = expectedPitch !== null ? getNoteName(expectedPitch) : '--'

  return {
    accuracy,
    direction,
    color,
    displayCents,
    detectedNoteName,
    expectedNoteName,
    isConfident,
  }
}
