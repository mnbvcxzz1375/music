export interface BaseEvent {
  event_type: string;
  user_id: string | null;
  timestamp: number;
  session_id: string;
  device_info: DeviceInfo;
  location?: LocationInfo;
}

export interface DeviceInfo {
  platform: 'web' | 'ios' | 'android';
  os_version: string;
  app_version: string;
  screen_width: number;
  screen_height: number;
  language: string;
  timezone: string;
}

export interface LocationInfo {
  country: string | null;
  region: string | null;
}

export interface PageViewEvent extends BaseEvent {
  event_type: 'page_view';
  page_name: string;
  page_path: string;
  referrer: string;
  duration_ms: number;
  scroll_depth: number;
}

export interface PracticeStartEvent extends BaseEvent {
  event_type: 'practice_start';
  piece_id: string;
  piece_title: string;
  difficulty: number;
  practice_mode: 'normal' | 'slow' | 'segment' | 'loop';
  tempo: number;
  instrument_type: string;
  part_id: string;
}

export interface PracticeEndEvent extends BaseEvent {
  event_type: 'practice_end';
  piece_id: string;
  duration_seconds: number;
  total_notes: number;
  correct_notes: number;
  accuracy: number;
  pitch_errors: number;
  rhythm_errors: number;
  retry_count: number;
  completion_status: 'completed' | 'abandoned' | 'failed';
}

export interface PieceSelectEvent extends BaseEvent {
  event_type: 'piece_select';
  piece_id: string;
  source: 'search' | 'recommend' | 'favorite' | 'recent' | 'upload';
  search_query?: string;
  position?: number;
}

export interface ErrorEvent extends BaseEvent {
  event_type: 'error_occurred';
  error_type: 'api' | 'audio' | 'render' | 'network' | 'unknown';
  error_message: string;
  error_code?: number;
  stack_trace?: string;
}

export type AnalyticsEvent =
  | PageViewEvent
  | PracticeStartEvent
  | PracticeEndEvent
  | PieceSelectEvent
  | ErrorEvent;