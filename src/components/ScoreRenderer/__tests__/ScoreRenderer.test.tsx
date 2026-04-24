import { act, createRef } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { ScoreRenderer } from '../index'
import type { ScoreRendererHandle } from '../types'
import { SIMPLE_MUSIC_XML } from './fixtures/simple.musicxml'

const { MockOpenSheetMusicDisplay } = vi.hoisted(() => {
  class MockCursor {
    public Iterator = {
      CurrentMeasureIndex: 0,
      EndReached: false,
    }

    public show = vi.fn()
    public hide = vi.fn()
    public previous = vi.fn()
    public reset = vi.fn(() => {
      this.Iterator.CurrentMeasureIndex = 0
    })
    public next = vi.fn(() => {
      this.Iterator.CurrentMeasureIndex += 1
    })
    public GNotesUnderCursor = vi.fn((): Array<{ getSVGGElement: () => SVGGElement }> => [])
  }

  class MockOpenSheetMusicDisplay {
    public static instances: MockOpenSheetMusicDisplay[] = []

    public cursor = new MockCursor()
    public load = vi.fn(async (_xml: string) => ({}))
    public render = vi.fn()
    public clear = vi.fn()

    public constructor(_container: HTMLElement, _options?: unknown) {
      MockOpenSheetMusicDisplay.instances.push(this)
    }
  }

  return { MockOpenSheetMusicDisplay }
})

vi.mock('opensheetmusicdisplay', () => ({
  OpenSheetMusicDisplay: MockOpenSheetMusicDisplay,
  CursorType: {
    Standard: 0,
  },
}))

describe('ScoreRenderer', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    MockOpenSheetMusicDisplay.instances = []
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(async () => {
    await act(async () => {
      root.unmount()
    })
    container.remove()
    vi.clearAllMocks()
  })

  it('renders without crash', async () => {
    await act(async () => {
      root.render(<ScoreRenderer xml={SIMPLE_MUSIC_XML} />)
    })

    const rendererContainer = container.querySelector('[data-testid="score-renderer-container"]')
    expect(rendererContainer).not.toBeNull()
  })

  it('loads and renders score from MusicXML string', async () => {
    const onReady = vi.fn()

    await act(async () => {
      root.render(<ScoreRenderer xml={SIMPLE_MUSIC_XML} onReady={onReady} />)
    })

    const instance = MockOpenSheetMusicDisplay.instances[0]
    expect(instance).toBeDefined()
    expect(instance.load).toHaveBeenCalledWith(SIMPLE_MUSIC_XML)
    expect(instance.render).toHaveBeenCalled()
    expect(onReady).toHaveBeenCalled()
  })

  it('shows cursor, moves cursor, and highlights current note', async () => {
    const ref = createRef<ScoreRendererHandle>()

    const fakeSvgGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    const fakePath = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    fakeSvgGroup.appendChild(fakePath)

    await act(async () => {
      root.render(<ScoreRenderer ref={ref} xml={SIMPLE_MUSIC_XML} />)
    })

    const instance = MockOpenSheetMusicDisplay.instances[0]
    instance.cursor.GNotesUnderCursor.mockReturnValue([{ getSVGGElement: () => fakeSvgGroup }])

    await act(async () => {
      ref.current?.showCursor()
      ref.current?.moveCursorNext()
      ref.current?.moveCursorTo(0, 1)
      ref.current?.highlightPosition({
        measureIndex: 0,
        beatInMeasure: 0,
        partId: 'P1',
        voiceId: '1',
        iterationCount: 0,
      })
    })

    expect(instance.cursor.show).toHaveBeenCalled()
    expect(instance.cursor.next).toHaveBeenCalled()
    expect(fakePath.style.fill).toBeTruthy()
    expect(fakePath.getAttribute('data-score-highlight')).toBe('true')
  })
})
