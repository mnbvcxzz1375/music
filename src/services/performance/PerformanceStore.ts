import { create } from 'zustand';
import {
  PerformanceMetric,
  PerformanceBudget,
  PerformanceViolation,
  PerformanceReport,
  MetricCategory,
} from './types';

interface PerformanceState {
  metrics: PerformanceMetric[];
  budgets: PerformanceBudget[];
  violations: PerformanceViolation[];
  
  recordMetric: (name: string, value: number, unit: PerformanceMetric['unit'], category: MetricCategory) => void;
  getMetrics: (category?: MetricCategory) => PerformanceMetric[];
  
  checkBudget: (metric: PerformanceMetric) => PerformanceViolation | null;
  getViolations: () => PerformanceViolation[];
  
  generateReport: () => PerformanceReport;
  clearMetrics: () => void;
  
  measureAsync: <T>(name: string, fn: () => Promise<T>, category: MetricCategory) => Promise<T>;
  measureSync: <T>(name: string, fn: () => T, category: MetricCategory) => T;
}

const defaultBudgets: PerformanceBudget[] = [
  { name: 'FCP', budget: 1500, unit: 'ms', category: 'loading' },
  { name: 'LCP', budget: 2500, unit: 'ms', category: 'loading' },
  { name: 'TTI', budget: 3500, unit: 'ms', category: 'loading' },
  { name: 'TBT', budget: 200, unit: 'ms', category: 'loading' },
  { name: 'CLS', budget: 0.1, unit: 'percent', category: 'loading' },
  
  { name: 'scoreLoadTime', budget: 2000, unit: 'ms', category: 'rendering' },
  { name: 'cursorMoveTime', budget: 16, unit: 'ms', category: 'rendering' },
  { name: 'pageSwitchTime', budget: 300, unit: 'ms', category: 'rendering' },
  { name: 'animationFPS', budget: 60, unit: 'fps', category: 'rendering' },
  
  { name: 'pitchDetectionLatency', budget: 80, unit: 'ms', category: 'audio' },
  { name: 'polyphonicDetectionLatency', budget: 200, unit: 'ms', category: 'audio' },
  { name: 'audioBufferSize', budget: 1024, unit: 'KB', category: 'audio' },
  
  { name: 'inputResponseTime', budget: 50, unit: 'ms', category: 'interaction' },
  { name: 'clickResponseTime', budget: 100, unit: 'ms', category: 'interaction' },
];

export const usePerformanceStore = create<PerformanceState>()(
  (set, get) => ({
    metrics: [],
    budgets: defaultBudgets,
    violations: [],

    recordMetric: (name, value, unit, category) => {
      const metric: PerformanceMetric = {
        name,
        value,
        unit,
        timestamp: new Date(),
        category,
      };
      
      set((state) => {
        const newMetrics = [...state.metrics, metric];
        const violation = get().checkBudget(metric);
        const newViolations = violation
          ? [...state.violations, violation]
          : state.violations;
        
        return {
          metrics: newMetrics.slice(-1000),
          violations: newViolations.slice(-100),
        };
      });
    },

    getMetrics: (category) => {
      const metrics = get().metrics;
      if (category) {
        return metrics.filter((m) => m.category === category);
      }
      return metrics;
    },

    checkBudget: (metric) => {
      const budget = get().budgets.find(
        (b) => b.name === metric.name && b.unit === metric.unit
      );
      
      if (!budget) return null;
      
      let exceeded = false;
      let exceededBy = 0;
      
      if (metric.unit === 'fps') {
        exceeded = metric.value < budget.budget;
        exceededBy = budget.budget - metric.value;
      } else {
        exceeded = metric.value > budget.budget;
        exceededBy = metric.value - budget.budget;
      }
      
      if (!exceeded) return null;
      
      const threshold = budget.budget * 0.2;
      const severity = exceededBy > threshold ? 'critical' : 'warning';
      
      return {
        metric,
        budget,
        exceededBy,
        severity,
      };
    },

    getViolations: () => get().violations,

    generateReport: () => {
      const metrics = get().metrics;
      const violations = get().violations;
      
      const categoryScores: Record<MetricCategory, number> = {
        loading: 100,
        rendering: 100,
        audio: 100,
        interaction: 100,
      };
      
      violations.forEach((v) => {
        const deduction = v.severity === 'critical' ? 20 : 10;
        categoryScores[v.metric.category] -= deduction;
      });
      
      const score = Math.round(
        (categoryScores.loading + categoryScores.rendering + categoryScores.audio + categoryScores.interaction) / 4
      );
      
      return {
        metrics,
        violations,
        score: Math.max(0, score),
        timestamp: new Date(),
      };
    },

    clearMetrics: () => {
      set({ metrics: [], violations: [] });
    },

    measureAsync: async (name, fn, category) => {
      const start = performance.now();
      const result = await fn();
      const duration = performance.now() - start;
      get().recordMetric(name, duration, 'ms', category);
      return result;
    },

    measureSync: (name, fn, category) => {
      const start = performance.now();
      const result = fn();
      const duration = performance.now() - start;
      get().recordMetric(name, duration, 'ms', category);
      return result;
    },
  })
);

export function getPerformanceStore() {
  return usePerformanceStore.getState();
}

export function initWebVitals() {
  if (typeof window === 'undefined') return;
  
  const store = getPerformanceStore();
  
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.entryType === 'paint') {
        if (entry.name === 'first-contentful-paint') {
          store.recordMetric('FCP', entry.startTime, 'ms', 'loading');
        }
      }
      if (entry.entryType === 'largest-contentful-paint') {
        store.recordMetric('LCP', entry.startTime, 'ms', 'loading');
      }
      if (entry.entryType === 'layout-shift') {
        const cls = (entry as unknown as { value?: number }).value || 0;
        store.recordMetric('CLS', cls * 100, 'percent', 'loading');
      }
    }
  });
  
  try {
    observer.observe({ entryTypes: ['paint', 'largest-contentful-paint', 'layout-shift'] });
  } catch (e) {
    console.warn('PerformanceObserver not supported');
  }
}