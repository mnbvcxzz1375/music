import type { BaseEvent, DeviceInfo } from './EventTypes';

export interface AnalyticsConfig {
  endpoint: string;
  batchSize: number;
  batchInterval: number;
  enabled: boolean;
  debug: boolean;
}

const defaultConfig: AnalyticsConfig = {
  endpoint: '/api/v1/analytics',
  batchSize: 10,
  batchInterval: 5000,
  enabled: true,
  debug: false,
};

export class AnalyticsSDK {
  private config: AnalyticsConfig;
  private eventQueue: BaseEvent[] = [];
  private userId: string | null = null;
  private sessionId: string;
  private deviceInfo: DeviceInfo;
  private flushIntervalId: ReturnType<typeof setInterval> | null = null;
  private consentGiven: boolean = false;

  constructor(config: Partial<AnalyticsConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    this.sessionId = this.generateSessionId();
    this.deviceInfo = this.collectDeviceInfo();
  }

  init(userId?: string): void {
    this.userId = userId ?? null;
    this.startBatchSender();
  }

  setUserId(userId: string): void {
    this.userId = userId;
  }

  clearUserId(): void {
    this.userId = null;
  }

  setConsent(consent: boolean): void {
    this.consentGiven = consent;
    if (!consent) {
      this.eventQueue = [];
    }
  }

  track(event: Omit<BaseEvent, 'user_id' | 'timestamp' | 'session_id' | 'device_info'>): void {
    if (!this.config.enabled || !this.consentGiven) {
      return;
    }

    const fullEvent: BaseEvent = {
      ...event,
      user_id: this.userId,
      timestamp: Date.now(),
      session_id: this.sessionId,
      device_info: this.deviceInfo,
    };

    if (this.config.debug) {
      console.log('[Analytics] Event tracked:', fullEvent);
    }

    this.eventQueue.push(fullEvent);

    if (this.eventQueue.length >= this.config.batchSize) {
      this.flush();
    }
  }

  private flush(): void {
    if (this.eventQueue.length === 0) return;

    const events = [...this.eventQueue];
    this.eventQueue = [];

    this.sendEvents(events);
  }

  private async sendEvents(events: BaseEvent[]): Promise<void> {
    try {
      const payload = JSON.stringify({ events });

      if (navigator.sendBeacon) {
        navigator.sendBeacon(this.config.endpoint, payload);
      } else {
        await fetch(this.config.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        });
      }

      if (this.config.debug) {
        console.log('[Analytics] Events sent:', events.length);
      }
    } catch (error) {
      if (this.config.debug) {
        console.error('[Analytics] Failed to send events:', error);
      }
      this.eventQueue.unshift(...events);
    }
  }

  private startBatchSender(): void {
    this.flushIntervalId = setInterval(() => this.flush(), this.config.batchInterval);

    window.addEventListener('beforeunload', () => {
      this.flush();
    });

    window.addEventListener('pagehide', () => {
      this.flush();
    });
  }

  stop(): void {
    if (this.flushIntervalId) {
      clearInterval(this.flushIntervalId);
      this.flushIntervalId = null;
    }
    this.flush();
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  private collectDeviceInfo(): DeviceInfo {
    return {
      platform: 'web',
      os_version: this.getOSVersion(),
      app_version: this.getAppVersion(),
      screen_width: window.screen.width,
      screen_height: window.screen.height,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  }

  private getOSVersion(): string {
    const ua = navigator.userAgent;
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Mac')) return 'MacOS';
    if (ua.includes('Linux')) return 'Linux';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
    return 'Unknown';
  }

  private getAppVersion(): string {
    return '1.0.0';
  }

  getSessionId(): string {
    return this.sessionId;
  }

  getDeviceInfo(): DeviceInfo {
    return this.deviceInfo;
  }

  getQueueLength(): number {
    return this.eventQueue.length;
  }

  isEnabled(): boolean {
    return this.config.enabled && this.consentGiven;
  }
}

export const analytics = new AnalyticsSDK();