export interface PerformanceMetrics {
  timestamp: number;
  pageLoad: PageLoadMetrics;
  audio: AudioMetrics;
  score: ScoreMetrics;
  memory: MemoryMetrics;
  fps: FPSMetrics;
}

export interface PageLoadMetrics {
  FCP: number | null;
  LCP: number | null;
  CLS: number | null;
  FID: number | null;
  TTI: number | null;
  domContentLoaded: number | null;
  loadComplete: number | null;
}

export interface AudioMetrics {
  detectionLatency: number | null;
  processingTime: number | null;
  sampleRate: number | null;
}

export interface ScoreMetrics {
  renderTime: number | null;
  cursorMoveTime: number | null;
}

export interface MemoryMetrics {
  usedJSHeapSize: number | null;
  totalJSHeapSize: number | null;
  jsHeapSizeLimit: number | null;
}

export interface FPSMetrics {
  current: number | null;
  average: number | null;
  min: number | null;
  max: number | null;
}

export interface PerformanceThresholds {
  FCP: number;
  LCP: number;
  CLS: number;
  FID: number;
  detectionLatency: number;
  renderTime: number;
  memoryMB: number;
  minFPS: number;
}

interface BrowserMemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

export const defaultThresholds: PerformanceThresholds = {
  FCP: 1500,
  LCP: 3000,
  CLS: 0.1,
  FID: 100,
  detectionLatency: 80,
  renderTime: 500,
  memoryMB: 200,
  minFPS: 30,
};

export class PerformanceCollector {
  private thresholds: PerformanceThresholds;

  constructor(thresholds: PerformanceThresholds = defaultThresholds) {
    this.thresholds = thresholds;
  }

  collectPageLoadMetrics(): PageLoadMetrics {
    const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const fcpEntry = performance.getEntriesByName('first-contentful-paint')[0];
    const lcpEntries = performance.getEntriesByType('largest-contentful-paint');

    let cls = 0;
    const layoutShiftEntries = performance.getEntriesByType('layout-shift');
    for (const entry of layoutShiftEntries) {
      if (!(entry as unknown as { hadRecentInput?: boolean }).hadRecentInput) {
        cls += (entry as unknown as { value: number }).value;
      }
    }

    const fidEntry = performance.getEntriesByType('first-input')[0] as PerformanceEventTiming;

    return {
      FCP: fcpEntry?.startTime ?? null,
      LCP: lcpEntries[lcpEntries.length - 1]?.startTime ?? null,
      CLS: cls,
      FID: fidEntry ? fidEntry.processingStart - fidEntry.startTime : null,
      TTI: navEntry?.domInteractive ?? null,
      domContentLoaded: navEntry?.domContentLoadedEventEnd ?? null,
      loadComplete: navEntry?.loadEventEnd ?? null,
    };
  }

  collectMemoryMetrics(): MemoryMetrics {
    if ('memory' in performance) {
      const memory = (performance as unknown as { memory: BrowserMemoryInfo }).memory;
      return {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
      };
    }
    return {
      usedJSHeapSize: null,
      totalJSHeapSize: null,
      jsHeapSizeLimit: null,
    };
  }

  collectAll(): PerformanceMetrics {
    return {
      timestamp: Date.now(),
      pageLoad: this.collectPageLoadMetrics(),
      audio: {
        detectionLatency: null,
        processingTime: null,
        sampleRate: null,
      },
      score: {
        renderTime: null,
        cursorMoveTime: null,
      },
      memory: this.collectMemoryMetrics(),
      fps: {
        current: null,
        average: null,
        min: null,
        max: null,
      },
    };
  }

  checkThresholds(metrics: PerformanceMetrics): ThresholdViolations {
    const violations: ThresholdViolations = [];

    if (metrics.pageLoad.FCP && metrics.pageLoad.FCP > this.thresholds.FCP) {
      violations.push({
        metric: 'FCP',
        value: metrics.pageLoad.FCP,
        threshold: this.thresholds.FCP,
        severity: 'warning',
      });
    }

    if (metrics.pageLoad.LCP && metrics.pageLoad.LCP > this.thresholds.LCP) {
      violations.push({
        metric: 'LCP',
        value: metrics.pageLoad.LCP,
        threshold: this.thresholds.LCP,
        severity: 'critical',
      });
    }

    if (metrics.pageLoad.CLS && metrics.pageLoad.CLS > this.thresholds.CLS) {
      violations.push({
        metric: 'CLS',
        value: metrics.pageLoad.CLS,
        threshold: this.thresholds.CLS,
        severity: 'warning',
      });
    }

    if (metrics.memory.usedJSHeapSize) {
      const memoryMB = metrics.memory.usedJSHeapSize / (1024 * 1024);
      if (memoryMB > this.thresholds.memoryMB) {
        violations.push({
          metric: 'Memory',
          value: memoryMB,
          threshold: this.thresholds.memoryMB,
          severity: 'warning',
        });
      }
    }

    return violations;
  }
}

export interface ThresholdViolation {
  metric: string;
  value: number;
  threshold: number;
  severity: 'warning' | 'critical';
}

export type ThresholdViolations = ThresholdViolation[];

export const performanceCollector = new PerformanceCollector();