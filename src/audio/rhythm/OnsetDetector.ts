/**
 * Simple Onset Detector
 *
 * Energy-based onset detection using amplitude envelope
 */

import type { OnsetResult, OnsetDetectorConfig } from './types'

/**
 * Default onset detector configuration
 */
const DEFAULT_CONFIG: OnsetDetectorConfig = {
  sampleRate: 44100,
  frameSize: 1024,
  hopSize: 512,
  threshold: 0.3,
}

/**
 * OnsetDetector class
 *
 * Simple energy-based onset detection
 */
export class OnsetDetector {
  private config: OnsetDetectorConfig
  private previousEnergy: number = 0
  private lastOnsetTime: number = -Infinity // Start at -infinity so first onset can be detected
  private minOnsetInterval: number = 0.05 // Minimum 50ms between onsets

  constructor(config: Partial<OnsetDetectorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Process a frame of audio samples and detect onset
   */
  processFrame(samples: Float32Array, frameTime: number): OnsetResult | null {
    // Calculate RMS energy for this frame
    const energy = this.calculateEnergy(samples)

    // Calculate energy difference (flux)
    const energyDiff = energy - this.previousEnergy

    // Update previous energy for next frame
    this.previousEnergy = energy

    // Check for onset (positive energy flux above threshold)
    if (
      energyDiff > this.config.threshold &&
      frameTime - this.lastOnsetTime > this.minOnsetInterval
    ) {
      this.lastOnsetTime = frameTime

      // Confidence based on how much energy increase
      const confidence = Math.min(1, energyDiff / (this.config.threshold * 2))

      return {
        time: frameTime,
        confidence,
      }
    }

    return null
  }

  /**
   * Calculate RMS energy of a frame
   */
  private calculateEnergy(samples: Float32Array): number {
    let sum = 0
    for (let i = 0; i < samples.length; i++) {
      sum += samples[i] * samples[i]
    }
    return Math.sqrt(sum / samples.length)
  }

  /**
   * Reset detector state
   */
  reset(): void {
    this.previousEnergy = 0
    this.lastOnsetTime = -Infinity // Reset to -infinity
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<OnsetDetectorConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Get current configuration
   */
  getConfig(): OnsetDetectorConfig {
    return { ...this.config }
  }
}

/**
 * Factory function to create an onset detector
 */
export function createOnsetDetector(config?: Partial<OnsetDetectorConfig>): OnsetDetector {
  return new OnsetDetector(config)
}
