export interface FPSMonitorConfig {
  sampleSize: number;
  reportInterval: number;
  lowFpsThreshold: number;
  lowFpsDurationThreshold: number;
}

const defaultConfig: FPSMonitorConfig = {
  sampleSize: 60,
  reportInterval: 1000,
  lowFpsThreshold: 30,
  lowFpsDurationThreshold: 5000,
};

export class FPSMonitor {
  private frames: number[] = [];
  private lastFrameTime: number = performance.now();
  private lowFpsDuration: number = 0;
  private config: FPSMonitorConfig;
  private running: boolean = false;
  private onLowFps?: (duration: number) => void;
  private onFpsRecovered?: () => void;

  constructor(config: FPSMonitorConfig = defaultConfig) {
    this.config = config;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.loop();
  }

  stop(): void {
    this.running = false;
  }

  private loop(): void {
    if (!this.running) return;

    const now = performance.now();
    const delta = now - this.lastFrameTime;
    const fps = 1000 / delta;

    this.frames.push(fps);
    if (this.frames.length > this.config.sampleSize) {
      this.frames.shift();
    }

    this.lastFrameTime = now;

    const avgFps = this.getAverageFPS();
    if (avgFps < this.config.lowFpsThreshold) {
      this.lowFpsDuration += delta;
      if (
        this.lowFpsDuration >= this.config.lowFpsDurationThreshold &&
        this.onLowFps
      ) {
        this.onLowFps(this.lowFpsDuration);
      }
    } else {
      if (this.lowFpsDuration > 0 && this.onFpsRecovered) {
        this.onFpsRecovered();
      }
      this.lowFpsDuration = 0;
    }

    requestAnimationFrame(() => this.loop());
  }

  getAverageFPS(): number {
    if (this.frames.length === 0) return 60;
    return this.frames.reduce((a, b) => a + b, 0) / this.frames.length;
  }

  getCurrentFPS(): number {
    return this.frames[this.frames.length - 1] ?? 60;
  }

  getMinFPS(): number {
    return Math.min(...this.frames);
  }

  getMaxFPS(): number {
    return Math.max(...this.frames);
  }

  getLowFpsDuration(): number {
    return this.lowFpsDuration;
  }

  isLowFps(): boolean {
    return this.getAverageFPS() < this.config.lowFpsThreshold;
  }

  setOnLowFps(callback: (duration: number) => void): void {
    this.onLowFps = callback;
  }

  setOnFpsRecovered(callback: () => void): void {
    this.onFpsRecovered = callback;
  }

  getStats(): FPSStats {
    return {
      current: this.getCurrentFPS(),
      average: this.getAverageFPS(),
      min: this.getMinFPS(),
      max: this.getMaxFPS(),
      lowFpsDuration: this.lowFpsDuration,
      isLowFps: this.isLowFps(),
    };
  }
}

export interface FPSStats {
  current: number;
  average: number;
  min: number;
  max: number;
  lowFpsDuration: number;
  isLowFps: boolean;
}

export const fpsMonitor = new FPSMonitor();