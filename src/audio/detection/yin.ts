import type { YinOptions, YinPitchResult } from './types'

const DEFAULT_THRESHOLD = 0.15
const DEFAULT_MIN_FREQUENCY = 65.41
const DEFAULT_MAX_FREQUENCY = 1046.5

export class YinDetector {
  private readonly sampleRate: number
  private readonly threshold: number
  private readonly minFrequency: number
  private readonly maxFrequency: number

  constructor(options: YinOptions) {
    this.sampleRate = options.sampleRate
    this.threshold = options.threshold ?? DEFAULT_THRESHOLD
    this.minFrequency = options.minFrequency ?? DEFAULT_MIN_FREQUENCY
    this.maxFrequency = options.maxFrequency ?? DEFAULT_MAX_FREQUENCY
  }

  detect(samples: Float32Array): YinPitchResult | null {
    const tauBounds = this.getTauBounds(samples.length)
    if (tauBounds === null) {
      return null
    }

    const [tauMin, tauMax] = tauBounds
    const difference = this.computeDifference(samples, tauMax)
    const cmndf = this.computeCmndf(difference)
    const tauEstimate = this.findTau(cmndf, tauMin, tauMax)

    if (tauEstimate === null) {
      return null
    }

    const refinedTau = this.refineTau(cmndf, tauEstimate, tauMax)
    if (!Number.isFinite(refinedTau) || refinedTau <= 0) {
      return null
    }

    const probability = 1 - cmndf[tauEstimate]
    if (probability <= 0) {
      return null
    }

    return {
      frequency: this.sampleRate / refinedTau,
      probability: Math.max(0, Math.min(1, probability)),
    }
  }

  private getTauBounds(sampleCount: number): [number, number] | null {
    const tauMin = Math.max(2, Math.floor(this.sampleRate / this.maxFrequency))
    const tauMax = Math.min(Math.floor(this.sampleRate / this.minFrequency), Math.floor(sampleCount / 2))

    if (tauMax <= tauMin) {
      return null
    }

    return [tauMin, tauMax]
  }

  private computeDifference(samples: Float32Array, tauMax: number): Float32Array {
    const difference = new Float32Array(tauMax + 1)

    for (let tau = 1; tau <= tauMax; tau += 1) {
      let sum = 0
      const limit = samples.length - tau

      for (let i = 0; i < limit; i += 1) {
        const delta = samples[i] - samples[i + tau]
        sum += delta * delta
      }

      difference[tau] = sum
    }

    return difference
  }

  private computeCmndf(difference: Float32Array): Float32Array {
    const cmndf = new Float32Array(difference.length)
    cmndf[0] = 1

    let runningSum = 0
    for (let tau = 1; tau < difference.length; tau += 1) {
      runningSum += difference[tau]
      cmndf[tau] = runningSum === 0 ? 1 : (difference[tau] * tau) / runningSum
    }

    return cmndf
  }

  private findTau(cmndf: Float32Array, tauMin: number, tauMax: number): number | null {
    for (let tau = tauMin; tau <= tauMax; tau += 1) {
      if (cmndf[tau] < this.threshold) {
        while (tau + 1 <= tauMax && cmndf[tau + 1] < cmndf[tau]) {
          tau += 1
        }

        return tau
      }
    }

    let minTau = tauMin
    let minValue = Number.POSITIVE_INFINITY

    for (let tau = tauMin; tau <= tauMax; tau += 1) {
      if (cmndf[tau] < minValue) {
        minValue = cmndf[tau]
        minTau = tau
      }
    }

    if (!Number.isFinite(minValue) || minValue >= 0.9) {
      return null
    }

    return minTau
  }

  private refineTau(cmndf: Float32Array, tau: number, tauMax: number): number {
    if (tau <= 1 || tau >= tauMax) {
      return tau
    }

    const left = cmndf[tau - 1]
    const center = cmndf[tau]
    const right = cmndf[tau + 1]
    const denominator = 2 * (2 * center - right - left)

    if (denominator === 0) {
      return tau
    }

    const offset = (right - left) / denominator
    return tau + offset
  }
}

export function detectYin(samples: Float32Array, options: YinOptions): YinPitchResult | null {
  const detector = new YinDetector(options)
  return detector.detect(samples)
}
