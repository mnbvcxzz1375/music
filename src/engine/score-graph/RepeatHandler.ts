/**
 * Repeat Handler
 *
 * Handles repeat sections (||: :||) and volta brackets (1st/2nd endings).
 */

import type { Measure } from '@/types/measure'
import type { RepeatContext, JumpPoint, NavigationResult, ScoreGraph } from './types'

/**
 * Generate unique repeat ID
 */
function generateRepeatId(startMeasure: number): string {
  return `repeat-${startMeasure}`
}

/**
 * Extract repeat information from measures
 */
export function extractRepeats(measures: Measure[]): JumpPoint[] {
  const jumps: JumpPoint[] = []

  let currentRepeatStart: number | null = null

  for (let i = 0; i < measures.length; i++) {
    const measure = measures[i]

    // Check for repeat start (||:)
    if (measure.leftBarline === 'repeat' || measure.repeatStart) {
      currentRepeatStart = i
      jumps.push({
        measureIndex: i,
        beatInMeasure: 0,
        type: 'repeat-start',
        targetMeasureIndex: undefined,
      })
    }

    // Check for repeat end (:||)
    if (measure.rightBarline === 'repeat' || measure.repeatEnd) {
      if (currentRepeatStart !== null) {
        jumps.push({
          measureIndex: i,
          beatInMeasure:
            measure.notes.length > 0
              ? measure.notes[measure.notes.length - 1].startTime +
                measure.notes[measure.notes.length - 1].durationBeats
              : 0,
          type: 'repeat-end',
          targetMeasureIndex: currentRepeatStart,
        })
        currentRepeatStart = null
      }
    }

    // Check for volta (numbered endings)
    if (measure.voltaNumber) {
      jumps.push({
        measureIndex: i,
        beatInMeasure: 0,
        type: 'volta-start',
        voltaNumber: measure.voltaNumber,
        iteration: measure.voltaNumber,
      })
    }
  }

  return jumps
}

/**
 * Repeat Handler class
 */
export class RepeatHandler {
  private repeats: Map<string, RepeatContext> = new Map()

  constructor(_debug = false) {
    // debug parameter intentionally unused
  }

  /**
   * Build repeat contexts from score graph
   */
  buildFromGraph(graph: ScoreGraph): void {
    this.repeats.clear()

    const repeatStarts = graph.jumps.filter((j) => j.type === 'repeat-start')

    for (const start of repeatStarts) {
      const repeatEnd = graph.jumps.find(
        (j) => j.type === 'repeat-end' && j.targetMeasureIndex === start.measureIndex
      )

      if (repeatEnd) {
        const repeatId = generateRepeatId(start.measureIndex)
        const voltaEndings = new Map<number, number>()

        // Find volta endings for this repeat section
        const voltas = graph.jumps.filter(
          (j) =>
            j.type === 'volta-start' &&
            j.measureIndex > start.measureIndex &&
            j.measureIndex <= repeatEnd.measureIndex
        )

        for (const volta of voltas) {
          if (volta.voltaNumber) {
            voltaEndings.set(volta.voltaNumber, volta.measureIndex)
          }
        }

        this.repeats.set(repeatId, {
          repeatId,
          startMeasure: start.measureIndex,
          endMeasure: repeatEnd.measureIndex,
          currentIteration: 1,
          maxIterations: 2,
          voltaEndings,
          isActive: false,
        })
      }
    }
  }

  /**
   * Get active repeat at a given measure
   */
  getActiveRepeat(measureIndex: number): RepeatContext | null {
    for (const repeat of this.repeats.values()) {
      if (measureIndex >= repeat.startMeasure && measureIndex <= repeat.endMeasure) {
        return repeat
      }
    }
    return null
  }

  /**
   * Get repeat that ends at a given measure
   */
  getRepeatEndingAt(measureIndex: number): RepeatContext | null {
    for (const repeat of this.repeats.values()) {
      if (repeat.endMeasure === measureIndex) {
        return repeat
      }
    }
    return null
  }

  /**
   * Handle navigation when reaching a measure
   */
  handleMeasure(
    measureIndex: number,
    _currentIteration: number,
    _graph: ScoreGraph
  ): NavigationResult | null {
    const repeat = this.getRepeatEndingAt(measureIndex)

    if (!repeat) {
      return null
    }

    const nextIteration = repeat.currentIteration + 1

    // Check if we need to jump back (iteration 1) or continue (iteration 2)
    if (nextIteration <= repeat.maxIterations) {
      // Check for volta endings
      const voltaEnd = repeat.voltaEndings.get(nextIteration)

      if (voltaEnd !== undefined) {
        // Jump to the volta ending, not the beginning
        return {
          nextMeasureIndex: voltaEnd,
          nextBeat: 0,
          didJump: true,
          jumpType: 'volta-start',
          iteration: nextIteration,
          isComplete: false,
          reason: `Jumping to volta ${nextIteration} ending at measure ${voltaEnd}`,
        }
      }

      // Jump back to repeat start
      repeat.currentIteration = nextIteration

      return {
        nextMeasureIndex: repeat.startMeasure,
        nextBeat: 0,
        didJump: true,
        jumpType: 'repeat-end',
        iteration: nextIteration,
        isComplete: false,
        reason: `Repeating section, iteration ${nextIteration}`,
      }
    }

    // Repeat section complete, continue
    return null
  }

  /**
   * Get all repeats
   */
  getRepeats(): Map<string, RepeatContext> {
    return this.repeats
  }

  /**
   * Reset repeat state
   */
  reset(): void {
    for (const repeat of this.repeats.values()) {
      repeat.currentIteration = 1
      repeat.isActive = false
    }
  }

  /**
   * Get current state for debugging
   */
  getState(): { repeats: RepeatContext[] } {
    return {
      repeats: Array.from(this.repeats.values()),
    }
  }
}
