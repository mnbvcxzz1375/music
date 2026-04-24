/**
 * Score Graph Types
 *
 * Types for handling music score repeats, jumps, and navigation marks.
 */

/**
 * Types of navigation marks in a score
 */
export type JumpType =
  | 'repeat-start' // ||:
  | 'repeat-end' // :||
  | 'volta-start' // Start of volta bracket
  | 'volta-end' // End of volta bracket
  | 'dc' // Da Capo
  | 'ds' // Dal Segno
  | 'fine' // Fine (end)
  | 'coda' // Coda symbol
  | 'segno' // Segno symbol (𝄋)
  | 'to-coda' // "To Coda" instruction
  | 'al-fine' // "al Fine" instruction
  | 'al-coda' // "al Coda" instruction

/**
 * Jump point in the score
 */
export interface JumpPoint {
  /** Measure index where the mark is located */
  measureIndex: number
  /** Beat position within the measure */
  beatInMeasure: number
  /** Type of navigation mark */
  type: JumpType
  /** Target measure index (where to jump to) */
  targetMeasureIndex?: number
  /** Target beat position */
  targetBeat?: number
  /** Volta number (1, 2, 3, etc.) */
  voltaNumber?: number
  /** Which iteration this applies to (1, 2, etc.) */
  iteration?: number
}

/**
 * Repeat context - tracks state within a repeat section
 */
export interface RepeatContext {
  /** Unique identifier for this repeat */
  repeatId: string
  /** Measure where the repeat starts (||:) */
  startMeasure: number
  /** Measure where the repeat ends (:||) */
  endMeasure: number
  /** Current iteration (1 = first time, 2 = second time) */
  currentIteration: number
  /** Maximum iterations (usually 2) */
  maxIterations: number
  /** Volta endings: iteration -> measure index */
  voltaEndings: Map<number, number>
  /** Whether currently inside this repeat */
  isActive: boolean
}

/**
 * Jump context - tracks navigation marks like D.C., D.S.
 */
export interface JumpContext {
  /** Whether we've encountered a D.C. or D.S. */
  hasSeenJumpMark: boolean
  /** Whether we've already performed the jump */
  hasJumped: boolean
  /** Type of jump (dc or ds) */
  jumpType: 'dc' | 'ds' | null
  /** Whether we've seen "al Fine" */
  hasSeenAlFine: boolean
  /** Whether we've seen "al Coda" */
  hasSeenAlCoda: boolean
  /** Whether we're currently in the coda section */
  isInCoda: boolean
  /** Segno position (measure index) */
  segnoPosition: number | null
  /** Coda position (measure index) */
  codaPosition: number | null
  /** Fine position (measure index) */
  finePosition: number | null
}

/**
 * Position in the score with navigation state
 */
export interface ScorePosition {
  /** Current measure index */
  measureIndex: number
  /** Current beat within measure */
  beatInMeasure: number
  /** Current iteration count (for repeats) */
  iteration: number
  /** Active repeat contexts */
  activeRepeats: RepeatContext[]
  /** Jump context */
  jumpContext: JumpContext
  /** Whether we've reached the end */
  isComplete: boolean
}

/**
 * Score graph - control flow representation
 */
export interface ScoreGraph {
  /** All jump points in the score */
  jumps: JumpPoint[]
  /** Repeat sections indexed by ID */
  repeats: Map<string, RepeatContext>
  /** Segno position (measure index) */
  segnoPosition?: number
  /** Coda position (measure index) */
  codaPosition?: number
  /** Fine position (measure index) */
  finePosition?: number
  /** Total number of measures */
  totalMeasures: number
  /** Measure index where coda section starts */
  codaStartMeasure?: number
}

/**
 * Navigation result
 */
export interface NavigationResult {
  /** Next measure index */
  nextMeasureIndex: number
  /** Next beat position */
  nextBeat: number
  /** Whether a jump occurred */
  didJump: boolean
  /** Type of jump if any */
  jumpType: JumpType | null
  /** Updated iteration count */
  iteration: number
  /** Whether the piece is complete */
  isComplete: boolean
  /** Reason for navigation (for debugging) */
  reason: string
}

/**
 * Graph builder options
 */
export interface ScoreGraphOptions {
  /** Maximum repeat iterations (default: 2) */
  maxRepeatIterations?: number
  /** Enable debug logging */
  debug?: boolean
}
