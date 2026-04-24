/**
 * Settings Manager
 *
 * Manages user settings with localStorage persistence
 */

import type {
  UserSettings,
  SettingsChangeCallback,
  AudioSettings,
  PracticeSettings,
  DisplaySettings,
} from './types'
import { DEFAULT_SETTINGS } from './defaults'
import type { InstrumentType } from '../calibration/types'

const STORAGE_KEY = 'music-practice-settings'
const CURRENT_VERSION = 1

/**
 * SettingsManager class
 *
 * Handles settings persistence and notifications
 */
export class SettingsManager {
  private settings: UserSettings
  private changeCallbacks: Set<SettingsChangeCallback> = new Set()

  constructor() {
    this.settings = this.loadFromStorage() ?? { ...DEFAULT_SETTINGS }
  }

  /**
   * Get current settings
   */
  getSettings(): UserSettings {
    return { ...this.settings }
  }

  /**
   * Update all settings
   */
  updateSettings(settings: Partial<UserSettings>): void {
    this.settings = {
      ...this.settings,
      ...settings,
      audio: { ...this.settings.audio, ...settings.audio },
      practice: { ...this.settings.practice, ...settings.practice },
      display: { ...this.settings.display, ...settings.display },
    }
    this.settings.lastUsed = Date.now()
    this.saveToStorage()
    this.notifyChange()
  }

  /**
   * Update audio settings
   */
  updateAudio(audio: Partial<AudioSettings>): void {
    this.settings.audio = { ...this.settings.audio, ...audio }
    this.settings.lastUsed = Date.now()
    this.saveToStorage()
    this.notifyChange()
  }

  /**
   * Update practice settings
   */
  updatePractice(practice: Partial<PracticeSettings>): void {
    this.settings.practice = { ...this.settings.practice, ...practice }
    this.settings.lastUsed = Date.now()
    this.saveToStorage()
    this.notifyChange()
  }

  /**
   * Update display settings
   */
  updateDisplay(display: Partial<DisplaySettings>): void {
    this.settings.display = { ...this.settings.display, ...display }
    this.settings.lastUsed = Date.now()
    this.saveToStorage()
    this.notifyChange()
  }

  /**
   * Set instrument
   */
  setInstrument(instrument: InstrumentType): void {
    this.settings.instrument = instrument
    this.settings.lastUsed = Date.now()
    this.saveToStorage()
    this.notifyChange()
  }

  /**
   * Reset to defaults
   */
  reset(): void {
    this.settings = { ...DEFAULT_SETTINGS }
    this.settings.lastUsed = Date.now()
    this.saveToStorage()
    this.notifyChange()
  }

  /**
   * Subscribe to settings changes
   */
  onChange(callback: SettingsChangeCallback): () => void {
    this.changeCallbacks.add(callback)
    return () => this.changeCallbacks.delete(callback)
  }

  /**
   * Save settings to localStorage
   */
  private saveToStorage(): void {
    try {
      const json = JSON.stringify(this.settings)
      localStorage.setItem(STORAGE_KEY, json)
    } catch (error) {
      console.error('Failed to save settings:', error)
    }
  }

  /**
   * Load settings from localStorage
   */
  private loadFromStorage(): UserSettings | null {
    try {
      const json = localStorage.getItem(STORAGE_KEY)
      if (!json) return null

      const stored = JSON.parse(json) as Partial<UserSettings>
      return this.mergeWithDefaults(stored)
    } catch (error) {
      console.error('Failed to load settings:', error)
      return null
    }
  }

  /**
   * Clear all stored settings
   */
  clearStorage(): void {
    try {
      localStorage.removeItem(STORAGE_KEY)
      this.settings = { ...DEFAULT_SETTINGS }
      this.notifyChange()
    } catch (error) {
      console.error('Failed to clear settings:', error)
    }
  }

  /**
   * Notify all change callbacks
   */
  private notifyChange(): void {
    for (const callback of this.changeCallbacks) {
      callback(this.settings)
    }
  }

  /**
   * Merge stored settings with defaults
   */
  private mergeWithDefaults(stored: Partial<UserSettings>): UserSettings {
    return {
      audio: { ...DEFAULT_SETTINGS.audio, ...stored.audio },
      practice: { ...DEFAULT_SETTINGS.practice, ...stored.practice },
      display: { ...DEFAULT_SETTINGS.display, ...stored.display },
      instrument: stored.instrument ?? DEFAULT_SETTINGS.instrument,
      version: CURRENT_VERSION,
      lastUsed: stored.lastUsed,
    }
  }
}

/**
 * Singleton instance
 */
let instance: SettingsManager | null = null

/**
 * Get the singleton SettingsManager instance
 */
export function getSettingsManager(): SettingsManager {
  if (!instance) {
    instance = new SettingsManager()
  }
  return instance
}
