export type PitchAccuracy = 'correct' | 'slight' | 'moderate' | 'severe'
export type PitchDirection = 'sharp' | 'flat' | 'on-pitch'

export interface PitchIndicatorProps {
  centsDeviation: number | null // Cents deviation (positive = sharp, negative = flat)
  expectedPitch: number | null // Expected MIDI note number
  detectedPitch: number | null // Detected MIDI note number
  confidence: number // Detection confidence (0-1)
  showDetails?: boolean // Show detailed info
}

export interface FeedbackState {
  accuracy: PitchAccuracy
  direction: PitchDirection
  color: string
  message: string
}
