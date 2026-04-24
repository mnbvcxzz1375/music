import { useState, useEffect } from 'react';

export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

export interface BreakpointValues {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
}

const defaultBreakpoints: BreakpointValues = {
  xs: 320,
  sm: 576,
  md: 768,
  lg: 1024,
  xl: 1280,
  xxl: 1536,
};

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

export function useBreakpoint(breakpoints?: Partial<BreakpointValues>): Breakpoint {
  const bp = { ...defaultBreakpoints, ...breakpoints };

  const isSm = useMediaQuery(`(min-width: ${bp.sm}px) and (max-width: ${bp.md}px)`);
  const isMd = useMediaQuery(`(min-width: ${bp.md}px) and (max-width: ${bp.lg}px)`);
  const isLg = useMediaQuery(`(min-width: ${bp.lg}px) and (max-width: ${bp.xl}px)`);
  const isXl = useMediaQuery(`(min-width: ${bp.xl}px) and (max-width: ${bp.xxl}px)`);
  const isXxl = useMediaQuery(`(min-width: ${bp.xxl}px)`);

  if (isXxl) return 'xxl';
  if (isXl) return 'xl';
  if (isLg) return 'lg';
  if (isMd) return 'md';
  if (isSm) return 'sm';
  return 'xs';
}

export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 576px)');
}

export function useIsTablet(): boolean {
  return useMediaQuery('(min-width: 576px) and (max-width: 1024px)');
}

export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1024px)');
}

export function useOrientation(): 'portrait' | 'landscape' {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

  useEffect(() => {
    const checkOrientation = () => {
      setOrientation(window.innerWidth > window.innerHeight ? 'landscape' : 'portrait');
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    return () => window.removeEventListener('resize', checkOrientation);
  }, []);

  return orientation;
}

export function useWindowSize() {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateSize = () => {
      setSize({ width: window.innerWidth, height: window.innerHeight });
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  return size;
}