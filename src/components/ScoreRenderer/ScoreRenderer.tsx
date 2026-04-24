import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import type { ScoreRendererHandle, ScoreRendererProps } from './types'
import { useOSMD } from './useOSMD'

const ScoreRenderer = forwardRef<ScoreRendererHandle, ScoreRendererProps>(
  ({ xml, onReady, onError, className, highlightColor }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null)

    const {
      loadAndRender,
      showCursor,
      hideCursor,
      moveCursorNext,
      moveCursorPrevious,
      moveCursorTo,
      highlightPosition,
      clearHighlights,
      resetCursor,
    } = useOSMD({ containerRef, options: { highlightColor } })

    useEffect(() => {
      if (!xml.trim()) {
        return
      }

      void loadAndRender(xml)
        .then(() => {
          onReady?.()
        })
        .catch((unknownError) => {
          const parsedError =
            unknownError instanceof Error
              ? unknownError
              : new Error('Failed to render score from MusicXML')
          onError?.(parsedError)
        })
    }, [loadAndRender, onError, onReady, xml])

    useImperativeHandle(
      ref,
      () => ({
        showCursor,
        hideCursor,
        moveCursorNext,
        moveCursorPrevious,
        moveCursorTo,
        highlightPosition,
        clearHighlights,
        resetCursor,
      }),
      [
        clearHighlights,
        hideCursor,
        highlightPosition,
        moveCursorNext,
        moveCursorPrevious,
        moveCursorTo,
        resetCursor,
        showCursor,
      ],
    )

    return (
      <div className={className}>
        <div ref={containerRef} data-testid="score-renderer-container" />
      </div>
    )
  },
)

ScoreRenderer.displayName = 'ScoreRenderer'

export default ScoreRenderer
