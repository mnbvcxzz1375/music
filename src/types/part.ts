import type { Measure } from './measure'

export type InstrumentCategory = 'string' | 'keyboard' | 'wind' | 'percussion' | 'other'

export interface Instrument {
  id: string
  name: string
  category: InstrumentCategory
  transpose?: number // Semitones to transpose
}

export interface Voice {
  id: string
  name: string
  measures: Measure[]
}

export interface Part {
  id: string
  name: string
  instrument: Instrument
  voices: Voice[]
  // For score following
  activeVoice?: string
}
