import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { PitchIndicator } from '../index';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('PitchIndicator', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  it('renders "No Pitch Detected" when confidence is low', () => {
    act(() => {
      root.render(
        <PitchIndicator 
          centsDeviation={null} 
          expectedPitch={null} 
          detectedPitch={null} 
          confidence={0.5} 
        />
      );
    });
    
    expect(container.textContent).toContain('No Pitch Detected');
  });

  it('displays correct pitch info when detected', () => {
    act(() => {
      root.render(
        <PitchIndicator
          centsDeviation={10}
          expectedPitch={60} // C4
          detectedPitch={60}
          confidence={0.9}
          showDetails={true}
        />
      );
    });
    
    // Check for "C4" and "C4" in details
    expect(container.textContent).toContain('Expected:');
    expect(container.textContent).toContain('Detected:');
    expect(container.textContent).toContain('C4');
    
    // Check for cents deviation
    expect(container.textContent).toContain('+10 cents');
  });

  it('shows correct visual indicator for sharp pitch', () => {
    act(() => {
      root.render(
        <PitchIndicator
          centsDeviation={30} // Sharp
          expectedPitch={60}
          detectedPitch={60}
          confidence={0.9}
        />
      );
    });
    
    expect(container.textContent).toContain('↑');
  });

  it('shows correct visual indicator for flat pitch', () => {
    act(() => {
      root.render(
        <PitchIndicator
          centsDeviation={-30} // Flat
          expectedPitch={60}
          detectedPitch={60}
          confidence={0.9}
        />
      );
    });
    
    expect(container.textContent).toContain('↓');
  });
});
