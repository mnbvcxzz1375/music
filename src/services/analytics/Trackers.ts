import { analytics } from './AnalyticsSDK';
import type { PageViewEvent, PracticeStartEvent, PracticeEndEvent, PieceSelectEvent, ErrorEvent } from './EventTypes';

export function trackPageView(pageName: string): void {
  analytics.track({
    event_type: 'page_view',
    page_name: pageName,
    page_path: window.location.pathname,
    referrer: document.referrer,
    duration_ms: 0,
    scroll_depth: 0,
  } as Omit<PageViewEvent, 'user_id' | 'timestamp' | 'session_id' | 'device_info'>);
}

export function trackPageViewEnd(pageName: string, durationMs: number, scrollDepth: number): void {
  analytics.track({
    event_type: 'page_view',
    page_name: pageName,
    page_path: window.location.pathname,
    referrer: document.referrer,
    duration_ms: durationMs,
    scroll_depth: scrollDepth,
  } as Omit<PageViewEvent, 'user_id' | 'timestamp' | 'session_id' | 'device_info'>);
}

export interface PracticeStartParams {
  pieceId: string;
  pieceTitle: string;
  difficulty: number;
  practiceMode: 'normal' | 'slow' | 'segment' | 'loop';
  tempo: number;
  instrumentType: string;
  partId: string;
}

export function trackPracticeStart(params: PracticeStartParams): void {
  analytics.track({
    event_type: 'practice_start',
    piece_id: params.pieceId,
    piece_title: params.pieceTitle,
    difficulty: params.difficulty,
    practice_mode: params.practiceMode,
    tempo: params.tempo,
    instrument_type: params.instrumentType,
    part_id: params.partId,
  } as Omit<PracticeStartEvent, 'user_id' | 'timestamp' | 'session_id' | 'device_info'>);
}

export interface PracticeEndParams {
  pieceId: string;
  durationSeconds: number;
  totalNotes: number;
  correctNotes: number;
  accuracy: number;
  pitchErrors: number;
  rhythmErrors: number;
  retryCount: number;
  completionStatus: 'completed' | 'abandoned' | 'failed';
}

export function trackPracticeEnd(params: PracticeEndParams): void {
  analytics.track({
    event_type: 'practice_end',
    piece_id: params.pieceId,
    duration_seconds: params.durationSeconds,
    total_notes: params.totalNotes,
    correct_notes: params.correctNotes,
    accuracy: params.accuracy,
    pitch_errors: params.pitchErrors,
    rhythm_errors: params.rhythmErrors,
    retry_count: params.retryCount,
    completion_status: params.completionStatus,
  } as Omit<PracticeEndEvent, 'user_id' | 'timestamp' | 'session_id' | 'device_info'>);
}

export interface PieceSelectParams {
  pieceId: string;
  source: 'search' | 'recommend' | 'favorite' | 'recent' | 'upload';
  searchQuery?: string;
  position?: number;
}

export function trackPieceSelect(params: PieceSelectParams): void {
  analytics.track({
    event_type: 'piece_select',
    piece_id: params.pieceId,
    source: params.source,
    search_query: params.searchQuery,
    position: params.position,
  } as Omit<PieceSelectEvent, 'user_id' | 'timestamp' | 'session_id' | 'device_info'>);
}

export interface ErrorParams {
  errorType: 'api' | 'audio' | 'render' | 'network' | 'unknown';
  errorMessage: string;
  errorCode?: number;
  stackTrace?: string;
}

export function trackError(params: ErrorParams): void {
  analytics.track({
    event_type: 'error_occurred',
    error_type: params.errorType,
    error_message: params.errorMessage,
    error_code: params.errorCode,
    stack_trace: params.stackTrace,
  } as Omit<ErrorEvent, 'user_id' | 'timestamp' | 'session_id' | 'device_info'>);
}

export { analytics } from './AnalyticsSDK';