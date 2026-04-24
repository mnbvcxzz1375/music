import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  AnalyticsEvent,
  AnalyticsConfig,
  EventCategory,
  ErrorInfo,
  PageViewEvent,
  PracticeEvent,
} from './types';

interface AnalyticsState {
  config: AnalyticsConfig;
  events: AnalyticsEvent[];
  userId: string;
  sessionId: string;
  
  track: (event: string, category: EventCategory, properties?: Record<string, unknown>) => void;
  trackPageView: (pageView: PageViewEvent) => void;
  trackPracticeStart: (practice: PracticeEvent) => void;
  trackPracticeStop: (practice: PracticeEvent) => void;
  trackError: (error: ErrorInfo) => void;
  
  identify: (userId: string) => void;
  startSession: () => void;
  endSession: () => void;
  
  flush: () => AnalyticsEvent[];
  clearEvents: () => void;
  
  getEvents: (category?: EventCategory) => AnalyticsEvent[];
  getEventCount: () => number;
}

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const generateSessionId = () => `session-${generateId()}`;

const generateUserId = () => {
  const stored = localStorage.getItem('analytics_user_id');
  if (stored) return stored;
  const newId = `user-${generateId()}`;
  localStorage.setItem('analytics_user_id', newId);
  return newId;
};

const defaultConfig: AnalyticsConfig = {
  endpoint: '/api/analytics',
  flushInterval: 30000,
  batchSize: 20,
  enabled: true,
  privacyMode: 'standard',
};

export const useAnalyticsStore = create<AnalyticsState>()(
  persist(
    (set, get) => ({
      config: defaultConfig,
      events: [],
      userId: generateUserId(),
      sessionId: generateSessionId(),

      track: (event, category, properties = {}) => {
        if (!get().config.enabled) return;
        
        const analyticsEvent: AnalyticsEvent = {
          id: generateId(),
          event,
          category,
          properties,
          timestamp: Date.now(),
          userId: get().userId,
          sessionId: get().sessionId,
        };
        
        set((state) => ({
          events: [...state.events, analyticsEvent],
        }));
        
        if (get().events.length >= get().config.batchSize) {
          get().flush();
        }
      },

      trackPageView: (pageView) => {
        get().track('page_view', 'behavior', {
          page_name: pageView.pageName,
          referrer: pageView.referrer,
          duration: pageView.duration,
        });
      },

      trackPracticeStart: (practice) => {
        get().track('practice_start', 'behavior', {
          piece_id: practice.pieceId,
          piece_title: practice.pieceTitle,
          part_id: practice.partId,
          tempo: practice.tempo,
          mode: practice.mode,
        });
      },

      trackPracticeStop: (practice) => {
        get().track('practice_stop', 'behavior', {
          piece_id: practice.pieceId,
          duration_seconds: practice.duration,
          accuracy: practice.accuracy,
          error_count: practice.errorCount,
          pitch_errors: practice.pitchErrors,
          rhythm_errors: practice.rhythmErrors,
        });
      },

      trackError: (error) => {
        get().track('error_occurred', 'error', {
          error_type: error.type,
          message: error.message,
          stack: error.stack,
          filename: error.filename,
          lineno: error.lineno,
          colno: error.colno,
          additional_info: error.additionalInfo,
        });
      },

      identify: (userId) => {
        set({ userId });
        localStorage.setItem('analytics_user_id', userId);
      },

      startSession: () => {
        const sessionId = generateSessionId();
        set({ sessionId });
        get().track('session_start', 'behavior', {});
      },

      endSession: () => {
        get().track('session_end', 'behavior', {
          duration: Date.now() - parseInt(get().sessionId.split('-')[1]),
        });
      },

      flush: () => {
        const events = get().events;
        if (events.length === 0) return events;
        
        if (get().config.privacyMode === 'strict') {
          const sanitizedEvents = events.map((e) => ({
            ...e,
            userId: 'anonymous',
            properties: Object.fromEntries(
              Object.entries(e.properties).filter(([key]) => 
                !['email', 'phone', 'name', 'address'].includes(key)
              )
            ),
          }));
          set({ events: [] });
          return sanitizedEvents;
        }
        
        set({ events: [] });
        return events;
      },

      clearEvents: () => {
        set({ events: [] });
      },

      getEvents: (category) => {
        const events = get().events;
        if (category) {
          return events.filter((e) => e.category === category);
        }
        return events;
      },

      getEventCount: () => get().events.length,
    }),
    {
      name: 'analytics-storage',
      partialize: (state) => ({
        userId: state.userId,
        config: state.config,
      }),
    }
  )
);

export function getAnalyticsStore() {
  return useAnalyticsStore.getState();
}

export function initAnalytics() {
  const store = getAnalyticsStore();
  store.startSession();
  
  window.addEventListener('beforeunload', () => {
    store.endSession();
    store.flush();
  });
  
  window.addEventListener('error', (event) => {
    store.trackError({
      type: 'runtime',
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });
  
  window.addEventListener('unhandledrejection', (event) => {
    store.trackError({
      type: 'promise',
      message: event.reason?.message || 'Unhandled promise rejection',
      stack: event.reason?.stack,
    });
  });
}