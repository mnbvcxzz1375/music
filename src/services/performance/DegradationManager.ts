export interface DegradationConfig {
  fpsThreshold: { trigger: number; duration: number; recover: number };
  memoryThreshold: { trigger: number; recover: number };
  networkThreshold: { maxFailures: number; maxLatency: number };
  cpuThreshold: { trigger: number; duration: number; recover: number };
}

const defaultConfig: DegradationConfig = {
  fpsThreshold: { trigger: 30, duration: 5000, recover: 45 },
  memoryThreshold: { trigger: 180, recover: 150 },
  networkThreshold: { maxFailures: 3, maxLatency: 5000 },
  cpuThreshold: { trigger: 80, duration: 10000, recover: 60 },
};

export type DegradationLevel = 'none' | 'low' | 'medium' | 'high';

export type DegradationAction =
  | 'reduce_render_quality'
  | 'reduce_sample_rate'
  | 'clear_cache'
  | 'enable_offline_mode';

export interface DegradationState {
  level: DegradationLevel;
  actions: DegradationAction[];
  triggeredAt: number | null;
  recoveredAt: number | null;
}

export class DegradationManager {
  private config: DegradationConfig;
  private state: DegradationState = {
    level: 'none',
    actions: [],
    triggeredAt: null,
    recoveredAt: null,
  };
  private onDegradation?: (action: DegradationAction, level: DegradationLevel) => void;
  private onRecovery?: () => void;

  constructor(config: DegradationConfig = defaultConfig) {
    this.config = config;
  }

  checkFPS(fps: number, lowFpsDuration: number): DegradationAction[] {
    const actions: DegradationAction[] = [];

    if (fps < this.config.fpsThreshold.trigger && lowFpsDuration > this.config.fpsThreshold.duration) {
      actions.push('reduce_render_quality');
    }

    return actions;
  }

  checkMemory(memoryMB: number): DegradationAction[] {
    const actions: DegradationAction[] = [];

    if (memoryMB > this.config.memoryThreshold.trigger) {
      actions.push('clear_cache');
    }

    return actions;
  }

  checkNetwork(failures: number, latency: number): DegradationAction[] {
    const actions: DegradationAction[] = [];

    if (failures > this.config.networkThreshold.maxFailures || latency > this.config.networkThreshold.maxLatency) {
      actions.push('enable_offline_mode');
    }

    return actions;
  }

  evaluate(metrics: {
    fps: number;
    lowFpsDuration: number;
    memoryMB: number;
    networkFailures: number;
    networkLatency: number;
  }): DegradationAction[] {
    const allActions: DegradationAction[] = [];

    allActions.push(...this.checkFPS(metrics.fps, metrics.lowFpsDuration));
    allActions.push(...this.checkMemory(metrics.memoryMB));
    allActions.push(...this.checkNetwork(metrics.networkFailures, metrics.networkLatency));

    return allActions;
  }

  applyActions(actions: DegradationAction[]): void {
    if (actions.length === 0) {
      if (this.state.level !== 'none' && this.onRecovery) {
        this.onRecovery();
      }
      this.state = {
        level: 'none',
        actions: [],
        triggeredAt: null,
        recoveredAt: Date.now(),
      };
      return;
    }

    const level = this.calculateLevel(actions);
    this.state = {
      level,
      actions,
      triggeredAt: Date.now(),
      recoveredAt: null,
    };

    for (const action of actions) {
      if (this.onDegradation) {
        this.onDegradation(action, level);
      }
    }
  }

  private calculateLevel(actions: DegradationAction[]): DegradationLevel {
    if (actions.includes('enable_offline_mode')) return 'high';
    if (actions.includes('reduce_render_quality') && actions.includes('clear_cache')) return 'medium';
    if (actions.length > 0) return 'low';
    return 'none';
  }

  getState(): DegradationState {
    return this.state;
  }

  isDegraded(): boolean {
    return this.state.level !== 'none';
  }

  getLevel(): DegradationLevel {
    return this.state.level;
  }

  setOnDegradation(callback: (action: DegradationAction, level: DegradationLevel) => void): void {
    this.onDegradation = callback;
  }

  setOnRecovery(callback: () => void): void {
    this.onRecovery = callback;
  }

  getRecommendations(): string[] {
    const recommendations: string[] = [];

    if (this.state.actions.includes('reduce_render_quality')) {
      recommendations.push('已降低乐谱渲染精度以提升性能');
    }

    if (this.state.actions.includes('clear_cache')) {
      recommendations.push('已清理缓存以释放内存');
    }

    if (this.state.actions.includes('enable_offline_mode')) {
      recommendations.push('已启用离线模式');
    }

    return recommendations;
  }
}

export const degradationManager = new DegradationManager();