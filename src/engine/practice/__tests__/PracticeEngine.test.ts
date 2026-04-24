import { describe, it, expect, beforeEach } from 'vitest'
import { PracticeEngine } from '../PracticeEngine'

describe('PracticeEngine', () => {
  let engine: PracticeEngine

  beforeEach(() => {
    engine = new PracticeEngine({ totalNotes: 10, maxRetries: 2 })
  })

  describe('start', () => {
    it('should initialize practice state', () => {
      engine.start()
      const state = engine.getState()

      expect(state.currentPosition).toBe(0)
      expect(state.correctNotes).toBe(0)
      expect(state.errors).toHaveLength(0)
      expect(state.isComplete).toBe(false)
      expect(state.passed).toBe(false)
    })
  })

  describe('advanceNote', () => {
    it('should advance position on correct note', () => {
      engine.start()
      engine.advanceNote(true)

      const state = engine.getState()
      expect(state.currentPosition).toBe(1)
      expect(state.correctNotes).toBe(1)
    })

    it('should advance position without counting incorrect notes', () => {
      engine.start()
      engine.advanceNote(false)

      const state = engine.getState()
      expect(state.currentPosition).toBe(1)
      expect(state.correctNotes).toBe(0)
    })

    it('should complete practice after all notes', () => {
      engine.start()
      for (let i = 0; i < 10; i++) {
        engine.advanceNote(true)
      }

      const state = engine.getState()
      expect(state.isComplete).toBe(true)
    })

    it('should not advance after completion', () => {
      engine.start()
      for (let i = 0; i < 10; i++) {
        engine.advanceNote(true)
      }

      const result = engine.advanceNote(true)
      expect(result).toBe(false)
    })
  })

  describe('recordError', () => {
    it('should record errors', () => {
      engine.start()
      engine.recordError('pitch', 'moderate')

      const state = engine.getState()
      expect(state.errors).toHaveLength(1)
      expect(state.errors[0].type).toBe('pitch')
      expect(state.errors[0].severity).toBe('moderate')
    })

    it('should not record errors after completion', () => {
      engine.start()
      for (let i = 0; i < 10; i++) {
        engine.advanceNote(true)
      }

      engine.recordError('pitch', 'moderate')
      const state = engine.getState()
      expect(state.errors).toHaveLength(0)
    })
  })

  describe('retry', () => {
    it('should allow retry when retries available', () => {
      engine.start()
      for (let i = 0; i < 10; i++) {
        engine.advanceNote(i % 3 === 0) // Mix of correct/incorrect
      }

      const result = engine.retry()
      expect(result).toBe(true)

      const state = engine.getState()
      expect(state.currentPosition).toBe(0)
      expect(state.correctNotes).toBe(0)
      expect(state.retryCount).toBe(1)
    })

    it('should not allow retry when max retries exceeded', () => {
      engine.start()
      for (let i = 0; i < 10; i++) {
        engine.advanceNote(i % 3 === 0)
      }
      engine.retry()

      for (let i = 0; i < 10; i++) {
        engine.advanceNote(i % 3 === 0)
      }
      engine.retry()

      // Third retry should fail
      for (let i = 0; i < 10; i++) {
        engine.advanceNote(i % 3 === 0)
      }
      const result = engine.retry()
      expect(result).toBe(false)
    })

    it('should not allow retry during active practice', () => {
      engine.start()
      engine.advanceNote(true)

      const result = engine.retry()
      expect(result).toBe(false)
    })
  })

  describe('isPassed', () => {
    it('should pass with 80% accuracy and few severe errors', () => {
      engine = new PracticeEngine({
        totalNotes: 10,
        maxRetries: 2,
        passThreshold: 0.8,
        maxSevereErrors: 3,
      })
      engine.start()

      // 8 correct, 2 incorrect - 80% accuracy
      for (let i = 0; i < 8; i++) {
        engine.advanceNote(true)
      }
      for (let i = 0; i < 2; i++) {
        engine.advanceNote(false)
      }

      expect(engine.isPassed()).toBe(true)
    })

    it('should fail with accuracy below threshold', () => {
      engine = new PracticeEngine({ totalNotes: 10, maxRetries: 2, passThreshold: 0.8 })
      engine.start()

      // Only 5 correct - 50% accuracy
      for (let i = 0; i < 5; i++) {
        engine.advanceNote(true)
      }
      for (let i = 0; i < 5; i++) {
        engine.advanceNote(false)
      }

      expect(engine.isPassed()).toBe(false)
    })

    it('should fail with too many severe errors', () => {
      engine = new PracticeEngine({ totalNotes: 10, maxRetries: 2, maxSevereErrors: 2 })
      engine.start()

      // All correct but with severe errors
      engine.recordError('pitch', 'severe')
      engine.recordError('pitch', 'severe')
      engine.recordError('pitch', 'severe')

      for (let i = 0; i < 10; i++) {
        engine.advanceNote(true)
      }

      expect(engine.isPassed()).toBe(false)
    })
  })

  describe('getProgress', () => {
    it('should return progress percentage', () => {
      engine.start()
      expect(engine.getProgress()).toBe(0)

      engine.advanceNote(true)
      expect(engine.getProgress()).toBe(10)

      engine.advanceNote(true)
      expect(engine.getProgress()).toBe(20)
    })
  })

  describe('getResult', () => {
    it('should return complete result after practice', () => {
      engine.start()
      engine.recordError('pitch', 'slight')

      for (let i = 0; i < 8; i++) {
        engine.advanceNote(true)
      }
      for (let i = 0; i < 2; i++) {
        engine.advanceNote(false)
      }

      const result = engine.getResult()
      expect(result.totalNotes).toBe(10)
      expect(result.correctNotes).toBe(8)
      expect(result.accuracy).toBe(80)
      expect(result.errors).toHaveLength(1)
    })
  })

  describe('getProgressInfo', () => {
    it('should return progress info for display', () => {
      engine.start()
      engine.advanceNote(true)
      engine.advanceNote(true)

      const progress = engine.getProgressInfo()
      expect(progress.position).toBe(20)
      expect(progress.status).toBe('playing')
    })

    it('should show passed status on successful completion', () => {
      engine = new PracticeEngine({ totalNotes: 5, maxRetries: 2, passThreshold: 0.8 })
      engine.start()

      for (let i = 0; i < 5; i++) {
        engine.advanceNote(true)
      }

      const progress = engine.getProgressInfo()
      expect(progress.status).toBe('passed')
    })

    it('should show failed status on unsuccessful completion', () => {
      engine = new PracticeEngine({ totalNotes: 5, maxRetries: 2, passThreshold: 0.8 })
      engine.start()

      for (let i = 0; i < 2; i++) {
        engine.advanceNote(true)
      }
      for (let i = 0; i < 3; i++) {
        engine.advanceNote(false)
      }

      const progress = engine.getProgressInfo()
      expect(progress.status).toBe('failed')
    })
  })

  describe('setPosition', () => {
    it('should set position within bounds', () => {
      engine.start()
      engine.setPosition(5)
      expect(engine.getState().currentPosition).toBe(5)

      engine.setPosition(-1)
      expect(engine.getState().currentPosition).toBe(0)

      engine.setPosition(100)
      expect(engine.getState().currentPosition).toBe(10)
    })
  })

  describe('reset', () => {
    it('should reset practice to initial state', () => {
      engine.start()
      engine.advanceNote(true)
      engine.recordError('pitch', 'moderate')

      engine.reset()

      const state = engine.getState()
      expect(state.currentPosition).toBe(0)
      expect(state.correctNotes).toBe(0)
      expect(state.errors).toHaveLength(0)
    })
  })

  describe('configuration', () => {
    it('should allow config updates', () => {
      engine.setConfig({ totalNotes: 20, maxRetries: 5 })

      const config = engine.getConfig()
      expect(config.totalNotes).toBe(20)
      expect(config.maxRetries).toBe(5)
    })

    it('should use default config values', () => {
      const defaultEngine = new PracticeEngine()
      const config = defaultEngine.getConfig()

      expect(config.totalNotes).toBe(100)
      expect(config.maxRetries).toBe(3)
      expect(config.passThreshold).toBe(0.8)
    })
  })
})
