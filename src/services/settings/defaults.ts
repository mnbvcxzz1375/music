/**
 * Default Settings
 */

import type { UserSettings } from './types'

/**
 * Default user settings
 */
export const DEFAULT_SETTINGS: UserSettings = {
  audio: {
    inputGain: 0.5,
    outputVolume: 0.8,
    sampleRate: 44100,
    bufferSize: 1024,
    monitorInput: false,
  },
  practice: {
    defaultTempo: 120,
    pitchTolerance: 50,
    timingTolerance: 100,
    passThreshold: 0.8,
    maxRetries: 3,
    showHints: true,
    autoAdvance: false,
  },
  display: {
    theme: 'auto',
    language: 'zh',
    showNoteNames: true,
    showFingerPositions: false,
    animationSpeed: 0.5,
  },
  instrument: 'piano',
  version: 1,
}
