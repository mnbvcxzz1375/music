import { act } from 'react'
import { createRoot, Root } from 'react-dom/client'
import { PartSelector } from '../index'
import { Score } from '../../../types/score'
import { Part } from '../../../types/part'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

// Mock data
const mockParts: Part[] = [
  {
    id: 'part-1',
    name: 'Violin 1',
    instrument: {
      id: 'inst-1',
      name: 'Violin',
      category: 'string',
    },
    voices: [],
  },
  {
    id: 'part-2',
    name: 'Cello',
    instrument: {
      id: 'inst-2',
      name: 'Cello',
      category: 'string',
    },
    voices: [],
  },
]

const mockScore: Score = {
  id: 'score-1',
  metadata: {
    title: 'Test Score',
  },
  parts: mockParts,
}

describe('PartSelector Component', () => {
  let container: HTMLDivElement
  let root: Root
  const mockOnPartChange = vi.fn()

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    // @ts-expect-error - IS_REACT_ACT_ENVIRONMENT is a global test environment flag
    global.IS_REACT_ACT_ENVIRONMENT = true
    mockOnPartChange.mockClear()
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
    vi.clearAllMocks()
  })

  it('renders list of parts correctly', () => {
    act(() => {
      root.render(<PartSelector score={mockScore} onPartChange={mockOnPartChange} />)
    })

    expect(container.textContent).toContain('Violin 1')
    expect(container.textContent).toContain('Cello')
    // Instrument name shown if different from part name
    expect(container.textContent).toContain('Violin')
  })

  it('highlights the selected part', () => {
    act(() => {
      root.render(
        <PartSelector score={mockScore} selectedPartId="part-1" onPartChange={mockOnPartChange} />
      )
    })

    const buttons = container.querySelectorAll('button')
    const selectedButton = Array.from(buttons).find((b) => b.textContent?.includes('Violin 1'))
    const unselectedButton = Array.from(buttons).find((b) => b.textContent?.includes('Cello'))

    expect(selectedButton?.classList.contains('part-selector__button--selected')).toBe(true)
    expect(selectedButton?.getAttribute('aria-pressed')).toBe('true')

    expect(unselectedButton?.classList.contains('part-selector__button--selected')).toBe(false)
    expect(unselectedButton?.getAttribute('aria-pressed')).toBe('false')
  })

  it('calls onPartChange when a different part is clicked', () => {
    act(() => {
      root.render(
        <PartSelector score={mockScore} selectedPartId="part-1" onPartChange={mockOnPartChange} />
      )
    })

    const celloButton = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Cello')
    )

    act(() => {
      if (celloButton) {
        celloButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      }
    })

    expect(mockOnPartChange).toHaveBeenCalledWith('part-2')
  })

  it('does not call onPartChange when the same part is clicked', () => {
    act(() => {
      root.render(
        <PartSelector score={mockScore} selectedPartId="part-1" onPartChange={mockOnPartChange} />
      )
    })

    const violinButton = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Violin 1')
    )

    act(() => {
      if (violinButton) {
        violinButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      }
    })

    expect(mockOnPartChange).not.toHaveBeenCalled()
  })

  it('renders empty message when score has no parts', () => {
    const emptyScore: Score = { ...mockScore, parts: [] }

    act(() => {
      root.render(<PartSelector score={emptyScore} onPartChange={mockOnPartChange} />)
    })

    expect(container.textContent).toContain('No parts available')
  })
})
