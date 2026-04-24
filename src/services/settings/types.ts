/**
 * Settings Types
 *
 * Types for user settings and preferences
 */

import type { InstrumentType } from '../calibration/types'

/**
 * Audio settings
 */
export interface AudioSettings {
  /** Input gain (0-1) */
  inputGain: number
  /** Output volume (0-1) */
  outputVolume: number
  /** Sample rate in Hz */
  sampleRate: number
  /** Buffer size */
  bufferSize: number
  /** Whether to monitor input */
  monitorInput: boolean
}

/**
 * Practice settings
 */
export interface PracticeSettings {
  /** Default tempo */
  defaultTempo: number
  /** Pitch tolerance in cents */
  pitchTolerance: number
  /** Timing tolerance in ms */
  timingTolerance: number
  /** Pass threshold (0-1) */
  passThreshold: number
  /** Maximum retries allowed */
  maxRetries: number
  /** Show hints during practice */
  showHints: boolean
  /** Auto-advance on correct note */
  autoAdvance: boolean
}

/**
 * Display settings
 */
export interface DisplaySettings {
  /** Theme preference */
  theme: 'light' | 'dark' | 'auto'
  /** Language preference */
  language: 'zh' | 'en'
  /** Show note names */
  showNoteNames: boolean
  /** Show finger positions */
  showFingerPositions: boolean
  /** Animation speed (0-1) */
  animationSpeed: number
}

/**
 * Complete user settings
 */
export interface UserSettings {
  /** Audio settings */
  audio: AudioSettings
  /** Practice settings */
  practice: PracticeSettings
  /** Display settings */
  display: DisplaySettings
  /** Selected instrument */
  instrument: InstrumentType
  /** Last used timestamp */
  lastUsed?: number
  /** Settings version for migrations */
  version: number
}

/**
 * Settings storage interface
 */
export interface SettingsStorage {
  /** Load settings from storage */
  load(): Promise<UserSettings | null>
  /** Save settings to storage */
  save(settings: UserSettings): Promise<void>
  /** Clear all settings */
  clear(): Promise<void>
}

/**
 * Settings change callback
 */
export type SettingsChangeCallback = (settings: UserSettings) => void
