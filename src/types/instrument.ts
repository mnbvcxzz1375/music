export type InstrumentType = 'string' | 'keyboard' | 'wind' | 'other'

export interface CalibrationSettings {
  // Audio settings
  inputGain: number // 0-1
  noiseFloor: number // dB threshold
  sampleRate: number // Hz

  // Detection settings
  pitchTolerance: number // Cents tolerance for "correct"
  rhythmTolerance: number // Ms tolerance for "on time"

  // Instrument-specific
  instrumentType: InstrumentType

  // For string instruments
  stringTunings?: number[] // MIDI numbers for each string

  // Calibration state
  isCalibrated: boolean
  calibrationDate?: string
}

export interface UserSettings {
  instrumentType: InstrumentType
  calibration: CalibrationSettings
  preferredTempo: number // BPM
  metronomeEnabled: boolean
  metronomeVolume: number // 0-1
}
