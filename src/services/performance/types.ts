export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'KB' | 'MB' | 'fps' | 'percent';
  timestamp: Date;
  category: 'loading' | 'rendering' | 'audio' | 'interaction';
}

export interface PerformanceBudget {
  name: string;
  budget: number;
  unit: 'ms' | 'KB' | 'MB' | 'fps' | 'percent';
  category: 'loading' | 'rendering' | 'audio' | 'interaction';
}

export interface PerformanceViolation {
  metric: PerformanceMetric;
  budget: PerformanceBudget;
  exceededBy: number;
  severity: 'warning' | 'critical';
}

export interface PerformanceReport {
  metrics: PerformanceMetric[];
  violations: PerformanceViolation[];
  score: number;
  timestamp: Date;
}

export type MetricCategory = 'loading' | 'rendering' | 'audio' | 'interaction';