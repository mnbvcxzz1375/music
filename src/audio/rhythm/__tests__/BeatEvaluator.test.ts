import { BeatEvaluator } from '../BeatEvaluator'

describe('BeatEvaluator', () => {
  let evaluator: BeatEvaluator

  beforeEach(() => {
    evaluator = new BeatEvaluator({ tempo: 120 })
  })

  describe('evaluateTiming', () => {
    it('should classify correct timing (< 25ms deviation)', () => {
      const result = evaluator.evaluateTiming(1.0, 1.0)
      expect(result.severity).toBe('correct')
      expect(result.direction).toBe('on-time')
      expect(result.deviationMs).toBe(0)
    })

    it('should classify slight timing error (25-50ms deviation)', () => {
      const result = evaluator.evaluateTiming(1.0, 1.04) // 40ms late
      expect(result.severity).toBe('slight')
      expect(result.direction).toBe('late')
      expect(result.deviationMs).toBeCloseTo(40, 0)
    })

    it('should classify moderate timing error (50-100ms deviation)', () => {
      const result = evaluator.evaluateTiming(1.0, 1.07) // 70ms late
      expect(result.severity).toBe('moderate')
      expect(result.direction).toBe('late')
    })

    it('should classify severe timing error (> 100ms deviation)', () => {
      const result = evaluator.evaluateTiming(1.0, 1.15) // 150ms late
      expect(result.severity).toBe('severe')
      expect(result.direction).toBe('late')
    })

    it('should detect early timing', () => {
      const result = evaluator.evaluateTiming(1.0, 0.9) // 100ms early
      expect(result.severity).toBe('moderate')
      expect(result.direction).toBe('early')
      expect(result.deviationMs).toBeCloseTo(-100, 0)
    })

    it('should handle very small deviations', () => {
      const result = evaluator.evaluateTiming(1.0, 1.001) // 1ms deviation
      expect(result.severity).toBe('correct')
      expect(result.direction).toBe('on-time')
    })
  })

  describe('classifySeverity', () => {
    it('should return correct for < 25ms', () => {
      expect(evaluator.classifySeverity(0)).toBe('correct')
      expect(evaluator.classifySeverity(20)).toBe('correct')
      expect(evaluator.classifySeverity(-20)).toBe('correct')
    })

    it('should return slight for 25-50ms', () => {
      expect(evaluator.classifySeverity(30)).toBe('slight')
      expect(evaluator.classifySeverity(45)).toBe('slight')
      expect(evaluator.classifySeverity(-40)).toBe('slight')
    })

    it('should return moderate for 50-100ms', () => {
      expect(evaluator.classifySeverity(60)).toBe('moderate')
      expect(evaluator.classifySeverity(90)).toBe('moderate')
      expect(evaluator.classifySeverity(-80)).toBe('moderate')
    })

    it('should return severe for >= 100ms', () => {
      expect(evaluator.classifySeverity(100)).toBe('severe')
      expect(evaluator.classifySeverity(150)).toBe('severe')
      expect(evaluator.classifySeverity(-200)).toBe('severe')
    })
  })

  describe('evaluateDuration', () => {
    it('should evaluate correct duration', () => {
      const result = evaluator.evaluateDuration(500, 500)
      expect(result.accuracy).toBe(1)
      expect(result.error).toBe('correct')
      expect(result.actualMs).toBe(500)
      expect(result.expectedMs).toBe(500)
    })

    it('should evaluate slightly short duration', () => {
      const result = evaluator.evaluateDuration(500, 400, 0.1) // 20% off with 10% tolerance
      expect(result.accuracy).toBeCloseTo(0.8, 1)
      expect(result.error).toBe('too-short')
    })

    it('should evaluate slightly long duration', () => {
      const result = evaluator.evaluateDuration(500, 600, 0.1) // 20% off with 10% tolerance
      expect(result.accuracy).toBeCloseTo(0.8, 1)
      expect(result.error).toBe('too-long')
    })

    it('should evaluate very short duration', () => {
      const result = evaluator.evaluateDuration(500, 250)
      expect(result.accuracy).toBeCloseTo(0.5, 1)
      expect(result.error).toBe('too-short')
    })

    it('should respect tolerance parameter', () => {
      // Small tolerance - 5% = 25ms for 500ms
      const result1 = evaluator.evaluateDuration(500, 540, 0.05) // 8% off with 5% tolerance
      expect(result1.error).toBe('too-long')

      // Even smaller tolerance
      const result2 = evaluator.evaluateDuration(500, 510, 0.01) // 2% off with 1% tolerance
      expect(result2.error).toBe('too-long')

      // Larger tolerance - 50% = 250ms for 500ms
      const result3 = evaluator.evaluateDuration(500, 600, 0.5) // 20% off with 50% tolerance
      expect(result3.error).toBe('correct')
    })

  })

  describe('evaluate (full evaluation)', () => {
    it('should provide complete rhythm evaluation', () => {
      const result = evaluator.evaluate(1.0, 1.0, 500, 500)

      expect(result.timing.severity).toBe('correct')
      expect(result.timing.direction).toBe('on-time')
      expect(result.duration.accuracy).toBe(1)
      expect(result.duration.error).toBe('correct')
      expect(result.score).toBe(1) // Perfect score
    })

    it('should weight timing more than duration', () => {
      // Perfect timing, poor duration
      const result1 = evaluator.evaluate(1.0, 1.0, 500, 250)

      // Poor timing, perfect duration
      const result2 = evaluator.evaluate(1.0, 1.15, 500, 500)

      // Timing score should matter more
      expect(result1.score).toBeGreaterThan(result2.score)
    })

    it('should calculate weighted score correctly', () => {
      // Slight timing error (score 0.8), perfect duration (score 1.0)
      // Expected: 0.8 * 0.6 + 1.0 * 0.4 = 0.88
      const result = evaluator.evaluate(1.0, 1.04, 500, 500)
      expect(result.score).toBeCloseTo(0.88, 1)
    })
  })

  describe('tempo methods', () => {
    it('should get beat duration in milliseconds', () => {
      // At 120 BPM, one beat = 500ms
      expect(evaluator.getBeatDurationMs()).toBe(500)
    })

    it('should set and get tempo', () => {
      evaluator.setTempo(60)
      expect(evaluator.getTempo()).toBe(60)
      expect(evaluator.getBeatDurationMs()).toBe(1000) // 60 BPM = 1000ms per beat
    })

    it('should clamp tempo to valid range', () => {
      evaluator.setTempo(10)
      expect(evaluator.getTempo()).toBe(20) // Min 20

      evaluator.setTempo(500)
      expect(evaluator.getTempo()).toBe(300) // Max 300
    })
  })
})
