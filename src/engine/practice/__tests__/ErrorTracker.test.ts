import { describe, it, expect, beforeEach } from 'vitest'
import { ErrorTracker } from '../ErrorTracker'
import type { PracticeError } from '../types'

describe('ErrorTracker', () => {
  let tracker: ErrorTracker

  beforeEach(() => {
    tracker = new ErrorTracker()
  })

  describe('addError', () => {
    it('should add an error to the tracker', () => {
      const error: PracticeError = {
        position: 1.0,
        type: 'pitch',
        severity: 'moderate',
        timestamp: Date.now(),
      }

      tracker.addError(error)
      expect(tracker.getErrorCount()).toBe(1)
    })

    it('should add timestamp if not provided', () => {
      const error: PracticeError = {
        position: 1.0,
        type: 'pitch',
        severity: 'slight',
        timestamp: 0,
      }

      tracker.addError(error)
      const errors = tracker.getErrors()
      expect(errors[0].timestamp).toBeGreaterThan(0)
    })
  })

  describe('recordError', () => {
    it('should record an error with simplified parameters', () => {
      tracker.recordError(2.0, 'rhythm', 'severe')
      expect(tracker.getErrorCount()).toBe(1)

      const errors = tracker.getErrors()
      expect(errors[0].position).toBe(2.0)
      expect(errors[0].type).toBe('rhythm')
      expect(errors[0].severity).toBe('severe')
    })

    it('should record error with optional details', () => {
      tracker.recordError(1.0, 'timing', 'slight', undefined, 'Late by 50ms')
      const errors = tracker.getErrors()
      expect(errors[0].details).toBe('Late by 50ms')
    })
  })

  describe('getErrorsAtPosition', () => {
    it('should return errors at specific position', () => {
      tracker.recordError(1.0, 'pitch', 'slight')
      tracker.recordError(1.0, 'rhythm', 'moderate')
      tracker.recordError(2.0, 'timing', 'severe')

      const errorsAtPos1 = tracker.getErrorsAtPosition(1.0)
      expect(errorsAtPos1).toHaveLength(2)

      const errorsAtPos2 = tracker.getErrorsAtPosition(2.0)
      expect(errorsAtPos2).toHaveLength(1)
    })

    it('should return empty array if no errors at position', () => {
      tracker.recordError(1.0, 'pitch', 'slight')
      expect(tracker.getErrorsAtPosition(2.0)).toHaveLength(0)
    })
  })

  describe('hasErrorsAtPosition', () => {
    it('should return true if errors exist at position', () => {
      tracker.recordError(1.0, 'pitch', 'slight')
      expect(tracker.hasErrorsAtPosition(1.0)).toBe(true)
    })

    it('should return false if no errors at position', () => {
      tracker.recordError(1.0, 'pitch', 'slight')
      expect(tracker.hasErrorsAtPosition(2.0)).toBe(false)
    })
  })

  describe('getErrorCount', () => {
    it('should return total error count', () => {
      tracker.recordError(1.0, 'pitch', 'slight')
      tracker.recordError(2.0, 'rhythm', 'moderate')
      tracker.recordError(3.0, 'timing', 'severe')
      expect(tracker.getErrorCount()).toBe(3)
    })

    it('should return 0 when empty', () => {
      expect(tracker.getErrorCount()).toBe(0)
    })
  })

  describe('getErrorCountByType', () => {
    it('should count errors by type', () => {
      tracker.recordError(1.0, 'pitch', 'slight')
      tracker.recordError(2.0, 'pitch', 'moderate')
      tracker.recordError(3.0, 'rhythm', 'severe')

      expect(tracker.getErrorCountByType('pitch')).toBe(2)
      expect(tracker.getErrorCountByType('rhythm')).toBe(1)
      expect(tracker.getErrorCountByType('timing')).toBe(0)
    })
  })

  describe('getErrorCountBySeverity', () => {
    it('should count errors by severity', () => {
      tracker.recordError(1.0, 'pitch', 'slight')
      tracker.recordError(2.0, 'pitch', 'slight')
      tracker.recordError(3.0, 'rhythm', 'moderate')
      tracker.recordError(4.0, 'timing', 'severe')

      expect(tracker.getErrorCountBySeverity('slight')).toBe(2)
      expect(tracker.getErrorCountBySeverity('moderate')).toBe(1)
      expect(tracker.getErrorCountBySeverity('severe')).toBe(1)
    })
  })

  describe('getErrorBreakdown', () => {
    it('should return breakdown by type', () => {
      tracker.recordError(1.0, 'pitch', 'slight')
      tracker.recordError(2.0, 'rhythm', 'moderate')
      tracker.recordError(3.0, 'rhythm', 'severe')
      tracker.recordError(4.0, 'timing', 'slight')

      const breakdown = tracker.getErrorBreakdown()
      expect(breakdown.pitch).toBe(1)
      expect(breakdown.rhythm).toBe(2)
      expect(breakdown.timing).toBe(1)
    })
  })

  describe('getSevereErrors', () => {
    it('should return only severe errors', () => {
      tracker.recordError(1.0, 'pitch', 'slight')
      tracker.recordError(2.0, 'rhythm', 'severe')
      tracker.recordError(3.0, 'timing', 'severe')

      const severe = tracker.getSevereErrors()
      expect(severe).toHaveLength(2)
    })
  })

  describe('clear', () => {
    it('should clear all errors', () => {
      tracker.recordError(1.0, 'pitch', 'slight')
      tracker.recordError(2.0, 'rhythm', 'moderate')
      expect(tracker.getErrorCount()).toBe(2)

      tracker.clear()
      expect(tracker.getErrorCount()).toBe(0)
    })
  })

  describe('getErrorsInRange', () => {
    it('should return errors within range', () => {
      tracker.recordError(1.0, 'pitch', 'slight')
      tracker.recordError(2.0, 'rhythm', 'moderate')
      tracker.recordError(3.0, 'timing', 'severe')
      tracker.recordError(4.0, 'pitch', 'moderate')

      const inRange = tracker.getErrorsInRange(1.5, 3.5)
      expect(inRange).toHaveLength(2)
    })
  })

  describe('removeErrorsAtPosition', () => {
    it('should remove errors at position and return count', () => {
      tracker.recordError(1.0, 'pitch', 'slight')
      tracker.recordError(1.0, 'rhythm', 'moderate')
      tracker.recordError(2.0, 'timing', 'severe')

      const removed = tracker.removeErrorsAtPosition(1.0)
      expect(removed).toBe(2)
      expect(tracker.getErrorCount()).toBe(1)
    })
  })
})
