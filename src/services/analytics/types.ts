export type EventCategory = 'behavior' | 'performance' | 'business' | 'error';

export interface AnalyticsEvent {
  id: string;
  event: string;
  category: EventCategory;
  properties: Record<string, unknown>;
  timestamp: number;
  userId: string;
  sessionId: string;
}

export interface AnalyticsConfig {
  endpoint: string;
  flushInterval: number;
  batchSize: number;
  enabled: boolean;
  privacyMode: 'standard' | 'strict';
}

export interface ErrorInfo {
  type: 'runtime' | 'promise' | 'resource' | 'audio' | 'score';
  message: string;
  stack?: string;
  filename?: string;
  lineno?: number;
  colno?: number;
  additionalInfo?: Record<string, unknown>;
}

export interface PageViewEvent {
  pageName: string;
  referrer?: string;
  duration?: number;
}

export interface PracticeEvent {
  pieceId: string;
  pieceTitle?: string;
  partId?: string;
  tempo?: number;
  mode?: string;
  duration?: number;
  accuracy?: number;
  errorCount?: number;
  pitchErrors?: number;
  rhythmErrors?: number;
}