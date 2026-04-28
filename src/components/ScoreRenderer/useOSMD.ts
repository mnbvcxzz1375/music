import { useCallback, useEffect, useRef, useState } from 'react'
import { CursorType, OpenSheetMusicDisplay } from 'opensheetmusicdisplay'
import type { ScorePosition } from '@/types'
import type { UseOSMDHookParams, UseOSMDResult } from './types'

const DEFAULT_HIGHLIGHT_COLOR = '#f97316'

interface StyledSvgSnapshot {
  element: SVGElement
  previousFill: string
  previousStroke: string
  previousStrokeWidth: string
}

export function useOSMD({ containerRef, options }: UseOSMDHookParams): UseOSMDResult {
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const osmdRef = useRef<OpenSheetMusicDisplay | null>(null)
  const highlightedElementsRef = useRef<StyledSvgSnapshot[]>([])

  const highlightColor = options?.highlightColor ?? DEFAULT_HIGHLIGHT_COLOR

  const clearHighlights = useCallback(() => {
    for (const snapshot of highlightedElementsRef.current) {
      snapshot.element.style.fill = snapshot.previousFill
      snapshot.element.style.stroke = snapshot.previousStroke
      snapshot.element.style.strokeWidth = snapshot.previousStrokeWidth
      snapshot.element.removeAttribute('data-score-highlight')
    }

    highlightedElementsRef.current = []
  }, [])

  const highlightCurrentNote = useCallback(() => {
    const osmd = osmdRef.current
    if (!osmd) {
      return
    }

    clearHighlights()

    const graphicalNotes = osmd.cursor.GNotesUnderCursor() as Array<{
      getSVGGElement?: () => SVGGElement
    }>

    for (const graphicalNote of graphicalNotes) {
      const group = graphicalNote.getSVGGElement?.()
      if (!group) {
        continue
      }

      const targets = group.querySelectorAll<SVGElement>('path, circle, ellipse, polygon, line, rect')

      for (const target of targets) {
        highlightedElementsRef.current.push({
          element: target,
          previousFill: target.style.fill,
          previousStroke: target.style.stroke,
          previousStrokeWidth: target.style.strokeWidth,
        })
        target.style.fill = highlightColor
        target.style.stroke = highlightColor
        target.style.strokeWidth = '1.5px'
        target.setAttribute('data-score-highlight', 'true')
      }
    }
  }, [clearHighlights, highlightColor])

  const resetCursor = useCallback(() => {
    const osmd = osmdRef.current
    if (!osmd) {
      return
    }

    osmd.cursor.reset()
    highlightCurrentNote()
  }, [highlightCurrentNote])

  const showCursor = useCallback(() => {
    const osmd = osmdRef.current
    if (!osmd) {
      return
    }

    osmd.cursor.show()
    highlightCurrentNote()
  }, [highlightCurrentNote])

  const hideCursor = useCallback(() => {
    const osmd = osmdRef.current
    if (!osmd) {
      return
    }

    osmd.cursor.hide()
    clearHighlights()
  }, [clearHighlights])

  const moveCursorNext = useCallback(() => {
    const osmd = osmdRef.current
    if (!osmd) {
      return
    }

    osmd.cursor.next()
    highlightCurrentNote()
  }, [highlightCurrentNote])

  const moveCursorPrevious = useCallback(() => {
    const osmd = osmdRef.current
    if (!osmd) {
      return
    }

    osmd.cursor.previous()
    highlightCurrentNote()
  }, [highlightCurrentNote])

  const moveCursorTo = useCallback(
    (measureIndex: number, noteIndex: number) => {
      const osmd = osmdRef.current
      if (!osmd) {
        return
      }

      const targetMeasure = Math.max(0, measureIndex)
      const targetNote = Math.max(0, noteIndex)

      osmd.cursor.reset()
      osmd.cursor.show()

      let safetyCounter = 20000
      while (
        osmd.cursor.Iterator.CurrentMeasureIndex < targetMeasure &&
        !osmd.cursor.Iterator.EndReached &&
        safetyCounter > 0
      ) {
        osmd.cursor.next()
        safetyCounter -= 1
      }

      let movedNotes = 0
      while (!osmd.cursor.Iterator.EndReached && movedNotes < targetNote && safetyCounter > 0) {
        const currentMeasure = osmd.cursor.Iterator.CurrentMeasureIndex
        osmd.cursor.next()
        if (osmd.cursor.Iterator.CurrentMeasureIndex !== currentMeasure) {
          break
        }
        movedNotes += 1
        safetyCounter -= 1
      }

      highlightCurrentNote()
    },
    [highlightCurrentNote],
  )

  const highlightPosition = useCallback(
    (position: ScorePosition) => {
      moveCursorTo(position.measureIndex, 0)
    },
    [moveCursorTo],
  )

  const loadAndRender = useCallback(async (xml: string) => {
    const osmd = osmdRef.current
    if (!osmd) {
      return
    }

    try {
      setError(null)
      await osmd.load(xml)
      osmd.render()
      osmd.cursor.reset()
      setIsReady(true)
      highlightCurrentNote()
    } catch (unknownError) {
      const parsedError =
        unknownError instanceof Error ? unknownError : new Error('Failed to load MusicXML into OSMD')
      setError(parsedError)
      setIsReady(false)
      throw parsedError
    }
  }, [highlightCurrentNote])

  useEffect(() => {
    const container = containerRef.current
    if (!container || osmdRef.current) {
      return
    }

    const osmd = new OpenSheetMusicDisplay(container, {
      autoResize: true,
      backend: 'svg',
      drawTitle: false,
      cursorsOptions: [{ type: CursorType.Standard, color: '#1db954', alpha: 0.34, follow: false }],
    })

    osmdRef.current = osmd

    return () => {
      clearHighlights()

      if (osmdRef.current) {
        osmdRef.current.clear()
        osmdRef.current = null
      }
    }
  }, [clearHighlights, containerRef])

  useEffect(() => {
    const container = containerRef.current
    const osmd = osmdRef.current
    if (!container || !osmd) {
      return
    }

    if (typeof ResizeObserver !== 'undefined') {
      const resizeObserver = new ResizeObserver(() => {
        if (osmdRef.current && isReady) {
          osmdRef.current.render()
          highlightCurrentNote()
        }
      })

      resizeObserver.observe(container)
      return () => resizeObserver.disconnect()
    } else {
      const handleWindowResize = () => {
        if (osmdRef.current && isReady) {
          osmdRef.current.render()
          highlightCurrentNote()
        }
      }

      window.addEventListener('resize', handleWindowResize)
      return () => window.removeEventListener('resize', handleWindowResize)
    }
  }, [containerRef, highlightCurrentNote, isReady])

  return {
    osmd: osmdRef.current,
    isReady,
    error,
    loadAndRender,
    showCursor,
    hideCursor,
    moveCursorNext,
    moveCursorPrevious,
    moveCursorTo,
    highlightPosition,
    clearHighlights,
    resetCursor,
  }
}
