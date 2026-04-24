import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { SettingsManager, getSettingsManager } from '../SettingsManager'
import { DEFAULT_SETTINGS } from '../defaults'
import type { UserSettings } from '../types'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(global, 'localStorage', { value: localStorageMock })

describe('SettingsManager', () => {
  let manager: SettingsManager

  beforeEach(() => {
    localStorageMock.clear()
    manager = new SettingsManager()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('getSettings', () => {
    it('should return default settings initially', () => {
      const settings = manager.getSettings()
      expect(settings.audio.inputGain).toBe(DEFAULT_SETTINGS.audio.inputGain)
      expect(settings.practice.defaultTempo).toBe(DEFAULT_SETTINGS.practice.defaultTempo)
      expect(settings.display.theme).toBe(DEFAULT_SETTINGS.display.theme)
    })

    it('should return a copy of settings', () => {
      const settings1 = manager.getSettings()
      const settings2 = manager.getSettings()
      expect(settings1).not.toBe(settings2)
      expect(settings1).toEqual(settings2)
    })
  })

  describe('updateSettings', () => {
    it('should update all settings', () => {
      manager.updateSettings({
        audio: {
          inputGain: 0.8,
          outputVolume: 0.5,
          sampleRate: 48000,
          bufferSize: 512,
          monitorInput: true,
        },
        practice: {
          defaultTempo: 100,
          pitchTolerance: 30,
          timingTolerance: 50,
          passThreshold: 0.9,
          maxRetries: 5,
          showHints: false,
          autoAdvance: true,
        },
        display: {
          theme: 'dark',
          language: 'en',
          showNoteNames: false,
          showFingerPositions: true,
          animationSpeed: 0.8,
        },
        instrument: 'guitar',
      })

      const settings = manager.getSettings()
      expect(settings.audio.inputGain).toBe(0.8)
      expect(settings.practice.defaultTempo).toBe(100)
      expect(settings.display.theme).toBe('dark')
      expect(settings.instrument).toBe('guitar')
    })

    it('should merge partial updates', () => {
      manager.updateSettings({
        audio: { inputGain: 0.7 },
      } as unknown as UserSettings)

      const settings = manager.getSettings()
      expect(settings.audio.inputGain).toBe(0.7)
      expect(settings.audio.outputVolume).toBe(DEFAULT_SETTINGS.audio.outputVolume)
    })

    it('should update lastUsed timestamp', () => {
      const before = Date.now()
      manager.updateSettings({ instrument: 'violin' })
      const after = Date.now()

      const settings = manager.getSettings()
      expect(settings.lastUsed).toBeGreaterThanOrEqual(before)
      expect(settings.lastUsed).toBeLessThanOrEqual(after)
    })
  })

  describe('updateAudio', () => {
    it('should update audio settings', () => {
      manager.updateAudio({ inputGain: 0.9, bufferSize: 2048 })

      const settings = manager.getSettings()
      expect(settings.audio.inputGain).toBe(0.9)
      expect(settings.audio.bufferSize).toBe(2048)
      expect(settings.audio.outputVolume).toBe(DEFAULT_SETTINGS.audio.outputVolume)
    })
  })

  describe('updatePractice', () => {
    it('should update practice settings', () => {
      manager.updatePractice({ defaultTempo: 140, showHints: false })

      const settings = manager.getSettings()
      expect(settings.practice.defaultTempo).toBe(140)
      expect(settings.practice.showHints).toBe(false)
    })
  })

  describe('updateDisplay', () => {
    it('should update display settings', () => {
      manager.updateDisplay({ theme: 'light', language: 'en' })

      const settings = manager.getSettings()
      expect(settings.display.theme).toBe('light')
      expect(settings.display.language).toBe('en')
    })
  })

  describe('setInstrument', () => {
    it('should set instrument', () => {
      manager.setInstrument('flute')
      expect(manager.getSettings().instrument).toBe('flute')
    })
  })

  describe('reset', () => {
    it('should reset to defaults', () => {
      manager.updateSettings({
        audio: { inputGain: 0.9 },
        instrument: 'trumpet',
      } as unknown as UserSettings)

      manager.reset()

      const settings = manager.getSettings()
      expect(settings.audio.inputGain).toBe(DEFAULT_SETTINGS.audio.inputGain)
      expect(settings.instrument).toBe(DEFAULT_SETTINGS.instrument)
    })
  })

  describe('onChange', () => {
    it('should call callback on settings change', () => {
      const callback = vi.fn()
      manager.onChange(callback)

      manager.updateAudio({ inputGain: 0.6 })

      expect(callback).toHaveBeenCalledTimes(1)
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          audio: expect.objectContaining({ inputGain: 0.6 }),
        })
      )
    })

    it('should return unsubscribe function', () => {
      const callback = vi.fn()
      const unsubscribe = manager.onChange(callback)

      manager.updateAudio({ inputGain: 0.6 })
      expect(callback).toHaveBeenCalledTimes(1)

      unsubscribe()

      manager.updateAudio({ inputGain: 0.7 })
      expect(callback).toHaveBeenCalledTimes(1) // Not called again
    })

    it('should handle multiple callbacks', () => {
      const callback1 = vi.fn()
      const callback2 = vi.fn()

      manager.onChange(callback1)
      manager.onChange(callback2)

      manager.updateAudio({ inputGain: 0.6 })

      expect(callback1).toHaveBeenCalled()
      expect(callback2).toHaveBeenCalled()
    })
  })

  describe('persistence', () => {
    it('should persist settings to localStorage', () => {
      manager.updateSettings({ instrument: 'saxophone' })

      const stored = localStorageMock.getItem('music-practice-settings')
      expect(stored).toBeTruthy()

      const parsed = JSON.parse(stored!)
      expect(parsed.instrument).toBe('saxophone')
    })

    it('should load settings from localStorage on init', () => {
      // Save settings first
      localStorageMock.setItem(
        'music-practice-settings',
        JSON.stringify({
          instrument: 'violin',
          audio: { inputGain: 0.4 },
          version: 1,
        })
      )

      // Create new manager
      const newManager = new SettingsManager()
      const settings = newManager.getSettings()

      expect(settings.instrument).toBe('violin')
      expect(settings.audio.inputGain).toBe(0.4)
    })

    it('should merge with defaults for missing fields', () => {
      localStorageMock.setItem(
        'music-practice-settings',
        JSON.stringify({
          instrument: 'guitar',
          // Missing audio, practice, display
        })
      )

      const newManager = new SettingsManager()
      const settings = newManager.getSettings()

      expect(settings.instrument).toBe('guitar')
      expect(settings.audio).toEqual(DEFAULT_SETTINGS.audio)
      expect(settings.practice).toEqual(DEFAULT_SETTINGS.practice)
    })

    it('should clear storage', () => {
      manager.updateSettings({ instrument: 'voice' })
      expect(localStorageMock.getItem('music-practice-settings')).toBeTruthy()

      manager.clearStorage()
      expect(localStorageMock.getItem('music-practice-settings')).toBeNull()
    })
  })
})

describe('getSettingsManager', () => {
  it('should return singleton instance', () => {
    localStorageMock.clear()
    const manager1 = getSettingsManager()
    const manager2 = getSettingsManager()
    expect(manager1).toBe(manager2)
  })
})
