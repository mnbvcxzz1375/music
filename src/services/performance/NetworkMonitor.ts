export interface NetworkStatus {
  online: boolean;
  latency: number;
  failures: number;
  lastCheck: number;
}

export class NetworkMonitor {
  private failures: number = 0;
  private latency: number = 0;
  private lastCheck: number = 0;
  private checkInterval: number = 30000;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private onOffline?: () => void;
  private onOnline?: () => void;

  start(): void {
    this.check();
    this.intervalId = setInterval(() => this.check(), this.checkInterval);

    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async check(): Promise<void> {
    try {
      const start = performance.now();
      const response = await fetch('/api/v1/health', {
        method: 'GET',
        cache: 'no-store',
      });

      this.latency = performance.now() - start;
      this.lastCheck = Date.now();

      if (response.ok) {
        this.failures = 0;
        if (this.onOnline) {
          this.onOnline();
        }
      } else {
        this.failures++;
      }
    } catch {
      this.failures++;
      this.latency = Infinity;
      this.lastCheck = Date.now();
      if (this.onOffline) {
        this.onOffline();
      }
    }
  }

  private handleOnline(): void {
    this.failures = 0;
    if (this.onOnline) {
      this.onOnline();
    }
  }

  private handleOffline(): void {
    this.failures++;
    if (this.onOffline) {
      this.onOffline();
    }
  }

  getStatus(): NetworkStatus {
    return {
      online: navigator.onLine && this.failures < 3,
      latency: this.latency,
      failures: this.failures,
      lastCheck: this.lastCheck,
    };
  }

  isOnline(): boolean {
    return navigator.onLine && this.failures < 3;
  }

  isHighLatency(): boolean {
    return this.latency > 1000;
  }

  getLatency(): number {
    return this.latency;
  }

  setOnOffline(callback: () => void): void {
    this.onOffline = callback;
  }

  setOnOnline(callback: () => void): void {
    this.onOnline = callback;
  }
}

export const networkMonitor = new NetworkMonitor();