import type { RefObject } from 'react'
import type { OpenSheetMusicDisplay } from 'opensheetmusicdisplay'
import type { ScorePosition } from '@/types'

export interface ScoreRendererProps {
  xml: string
  onReady?: () => void
  onError?: (error: Error) => void
  className?: string
  highlightColor?: string
}

export interface ScoreRendererHandle {
  showCursor: () => void
  hideCursor: () => void
  moveCursorNext: () => void
  moveCursorPrevious: () => void
  moveCursorTo: (measureIndex: number, noteIndex: number) => void
  highlightPosition: (position: ScorePosition) => void
  clearHighlights: () => void
  resetCursor: () => void
}

export interface UseOSMDOptions {
  highlightColor?: string
}

export interface UseOSMDResult {
  osmd: OpenSheetMusicDisplay | null
  isReady: boolean
  error: Error | null
  loadAndRender: (xml: string) => Promise<void>
  showCursor: () => void
  hideCursor: () => void
  moveCursorNext: () => void
  moveCursorPrevious: () => void
  moveCursorTo: (measureIndex: number, noteIndex: number) => void
  highlightPosition: (position: ScorePosition) => void
  clearHighlights: () => void
  resetCursor: () => void
}

export interface UseOSMDHookParams {
  containerRef: RefObject<HTMLDivElement>
  options?: UseOSMDOptions
}
