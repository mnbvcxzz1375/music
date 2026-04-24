# 性能预算分配文档

## 文档信息

| 项目 | 内容 |
|------|------|
| 文档版本 | v1.0 |
| 创建日期 | 2026-04-14 |
| 关联Spec | music-practice-app-refactor/spec.md |
| 责任人 | 性能工程师 |

---

## 1. 各模块性能预算

### 1.1 性能预算总览

| 模块 | 预算指标 | 目标值 | 测量工具 | 说明 |
|------|----------|--------|----------|------|
| 页面加载 | 首屏渲染时间 | <3s | Lighthouse | FCP < 1.5s, LCP < 3s |
| 音频检测 | YIN算法延迟 | <80ms | Chrome DevTools Performance | 单音检测延迟 |
| 乐谱渲染 | OSMD渲染时间 | <500ms | Performance API timing | 首次渲染时间 |
| API响应 | 后端接口响应 | <200ms | Sentry APM | P95响应时间 |
| 内存占用 | 浏览器运行时 | <200MB | Chrome DevTools Memory Panel | 峰值内存 |
| FPS | 动效帧率 | 60fps | Chrome DevTools FPS计数器 | 无明显掉帧 |

### 1.2 前端性能预算

```typescript
interface FrontendPerformanceBudget {
  pageLoad: {
    FCP: { target: 1500, unit: 'ms' };
    LCP: { target: 3000, unit: 'ms' };
    TTI: { target: 5000, unit: 'ms' };
    CLS: { target: 0.1, unit: 'score' };
    FID: { target: 100, unit: 'ms' };
  };
  
  bundleSize: {
    total: { target: 500, unit: 'KB' };
    firstLoad: { target: 200, unit: 'KB' };
    lazyLoad: { target: 300, unit: 'KB' };
  };
  
  runtime: {
    memory: { target: 200, unit: 'MB' };
    cpu: { target: 50, unit: '%' };
    fps: { target: 60, unit: 'fps' };
  };
}
```

### 1.3 音频处理性能预算

```typescript
interface AudioPerformanceBudget {
  detection: {
    latency: { target: 80, unit: 'ms', method: 'YIN单音检测' };
    accuracy: { target: 95, unit: '%', method: '标准音高测试' };
    confidenceThreshold: { target: 0.5, unit: 'score' };
  };
  
  processing: {
    sampleRate: { target: 44100, unit: 'Hz' };
    bufferSize: { target: 2048, unit: 'samples' };
    processingTime: { target: 50, unit: 'ms' };
  };
  
  memory: {
    audioBuffer: { target: 10, unit: 'MB' };
    detectorState: { target: 1, unit: 'MB' };
  };
}
```

### 1.4 乐谱渲染性能预算

```typescript
interface ScoreRenderPerformanceBudget {
  initialRender: {
    loadTime: { target: 500, unit: 'ms' };
    firstNoteVisible: { target: 300, unit: 'ms' };
  };
  
  interaction: {
    cursorMove: { target: 16, unit: 'ms' };
    zoom: { target: 100, unit: 'ms' };
    scroll: { target: 50, unit: 'ms' };
  };
  
  memory: {
    osmdInstance: { target: 50, unit: 'MB' };
    svgCache: { target: 20, unit: 'MB' };
  };
}
```

### 1.5 API性能预算

```typescript
interface APIPerformanceBudget {
  endpoints: {
    auth: { P50: 100, P95: 200, P99: 500, unit: 'ms' };
    pieces: { P50: 150, P95: 300, P99: 600, unit: 'ms' };
    practice: { P50: 100, P95: 200, P99: 400, unit: 'ms' };
    stats: { P50: 200, P95: 400, P99: 800, unit: 'ms' };
  };
  
  throughput: {
    concurrentUsers: { target: 1000, unit: 'users' };
    requestsPerSecond: { target: 100, unit: 'rps' };
  };
  
  database: {
    queryTime: { target: 50, unit: 'ms' };
    connectionPool: { target: 20, unit: 'connections' };
  };
}
```

---

## 2. 性能监控方案

### 2.1 Chrome DevTools监控

```typescript
const devToolsMetrics = {
  performance: {
    metrics: ['FCP', 'LCP', 'CLS', 'FID', 'TTI'],
    collection: 'automatic',
    reporting: 'console + custom dashboard',
  },
  
  memory: {
    metrics: ['JSHeapSize', 'TotalJSHeapSize', 'DOMNodes'],
    collection: 'manual',
    reporting: 'memory profiler',
  },
  
  network: {
    metrics: ['requestTime', 'responseTime', 'transferSize'],
    collection: 'automatic',
    reporting: 'network panel',
  },
};

const collectPerformanceMetrics = (): PerformanceMetrics => {
  const perf = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  
  return {
    FCP: performance.getEntriesByName('first-contentful-paint')[0]?.startTime,
    LCP: performance.getEntriesByName('largest-contentful-paint')[0]?.startTime,
    CLS: calculateCLS(),
    FID: performance.getEntriesByName('first-input')[0]?.processingStart - 
         performance.getEntriesByName('first-input')[0]?.startTime,
    TTI: perf.domInteractive,
    domContentLoaded: perf.domContentLoadedEventEnd,
    loadComplete: perf.loadEventEnd,
  };
};
```

### 2.2 Lighthouse自动化测试

```typescript
const lighthouseConfig = {
  onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
  settings: {
    preset: 'desktop',
    throttling: {
      rttMs: 40,
      throughputKbps: 10240,
      cpuSlowdownMultiplier: 1,
    },
  },
  assertions: {
    categories: {
      performance: ['error', { minScore: 0.9 }],
      accessibility: ['error', { minScore: 0.95 }],
    },
    audits: {
      'first-contentful-paint': ['error', { maxNumericValue: 1500 }],
      'largest-contentful-paint': ['error', { maxNumericValue: 3000 }],
      'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
      'total-blocking-time': ['error', { maxNumericValue: 200 }],
    },
  },
};

const runLighthouseTest = async (url: string): LighthouseResult => {
  const runner = await lighthouse(url, lighthouseConfig);
  
  return {
    performance: runner.lhr.categories.performance.score,
    accessibility: runner.lhr.categories.accessibility.score,
    bestPractices: runner.lhr.categories['best-practices'].score,
    seo: runner.lhr.categories.seo.score,
    metrics: {
      FCP: runner.lhr.audits['first-contentful-paint'].numericValue,
      LCP: runner.lhr.audits['largest-contentful-paint'].numericValue,
      CLS: runner.lhr.audits['cumulative-layout-shift'].numericValue,
      TBT: runner.lhr.audits['total-blocking-time'].numericValue,
    },
  };
};
```

### 2.3 Sentry性能监控

```typescript
import * as Sentry from '@sentry/react';

const sentryPerformanceConfig = {
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
  profilesSampleRate: 0.1,
  
  integrations: [
    new Sentry.BrowserTracing({
      tracePropagationTargets: ['api.music-practice.app'],
    }),
    new Sentry.Replay({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],
  
  beforeSend: (event) => {
    if (event.type === 'transaction') {
      const duration = event.contexts?.trace?.op === 'http.client' 
        ? event.contexts?.trace?.data?.duration 
        : null;
      
      if (duration && duration > 200) {
        event.tags = { ...event.tags, performanceAlert: 'slow' };
      }
    }
    return event;
  },
};

Sentry.init(sentryPerformanceConfig);
```

### 2.4 自定义性能监控

```typescript
interface PerformanceMonitor {
  collect: () => PerformanceData;
  report: (data: PerformanceData) => void;
  alert: (threshold: number) => void;
}

const performanceMonitor: PerformanceMonitor = {
  collect: () => {
    return {
      timestamp: Date.now(),
      pageLoad: collectPageLoadMetrics(),
      audio: collectAudioMetrics(),
      score: collectScoreMetrics(),
      memory: collectMemoryMetrics(),
      fps: collectFPSMetrics(),
    };
  },
  
  report: (data) => {
    fetch('/api/v1/performance', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  
  alert: (threshold) => {
    const data = performanceMonitor.collect();
    if (data.pageLoad.LCP > threshold) {
      Sentry.captureMessage('Performance threshold exceeded', {
        level: 'warning',
        extra: data,
      });
    }
  },
};

setInterval(() => performanceMonitor.report(performanceMonitor.collect()), 60000);
```

---

## 3. 降级策略

### 3.1 降级触发阈值

| 降级场景 | 触发阈值 | 持续时间 | 降级措施 | 恢复条件 |
|----------|----------|----------|----------|----------|
| 低端设备 | FPS<30 | 5秒 | 降低乐谱渲染精度 | FPS>45持续10秒 |
| 网络差 | 请求失败>3次或延迟>5s | 立即 | 启用离线模式 | 网络恢复，延迟<1s |
| CPU占用高 | CPU>80% | 10秒 | 降低检测采样率 | CPU<60%持续15秒 |
| 内存不足 | 内存>180MB | 立即 | 清理非必要缓存 | 内存<150MB |

### 3.2 降级实现

```typescript
interface DegradationConfig {
  fpsThreshold: { trigger: 30, duration: 5000, recover: 45 };
  networkThreshold: { maxFailures: 3, maxLatency: 5000 };
  cpuThreshold: { trigger: 80, duration: 10000, recover: 60 };
  memoryThreshold: { trigger: 180, recover: 150 };
}

interface DegradationAction {
  type: 'reduce_render_quality' | 'enable_offline_mode' | 'reduce_sample_rate' | 'clear_cache';
  level?: 'low' | 'medium' | 'high';
  newRate?: number;
  priority?: 'low' | 'medium' | 'high';
}

const checkDegradation = (metrics: PerformanceMetrics): DegradationAction[] => {
  const actions: DegradationAction[] = [];
  
  if (metrics.fps < 30 && metrics.lowFpsDuration > 5000) {
    actions.push({ type: 'reduce_render_quality', level: 'medium' });
  }
  
  if (metrics.networkFailures > 3 || metrics.networkLatency > 5000) {
    actions.push({ type: 'enable_offline_mode' });
  }
  
  if (metrics.cpuUsage > 80 && metrics.highCpuDuration > 10000) {
    actions.push({ type: 'reduce_sample_rate', newRate: 22050 });
  }
  
  if (metrics.memoryUsage > 180) {
    actions.push({ type: 'clear_cache', priority: 'low' });
  }
  
  return actions;
};

const applyDegradation = (action: DegradationAction): void => {
  switch (action.type) {
    case 'reduce_render_quality':
      osmd.setOptions({ drawPartNames: false, drawMeasureNumbers: false });
      break;
      
    case 'enable_offline_mode':
      enableOfflineMode();
      break;
      
    case 'reduce_sample_rate':
      audioContext.sampleRate = action.newRate;
      break;
      
    case 'clear_cache':
      clearNonEssentialCache(action.priority);
      break;
  }
};
```

### 3.3 FPS监控实现

```typescript
class FPSMonitor {
  private frames: number[] = [];
  private lastFrameTime: number = performance.now();
  private lowFpsDuration: number = 0;
  
  start(): void {
    const loop = () => {
      const now = performance.now();
      const delta = now - this.lastFrameTime;
      this.frames.push(1000 / delta);
      this.lastFrameTime = now;
      
      if (this.frames.length > 60) {
        this.frames.shift();
      }
      
      const avgFps = this.getAverageFPS();
      if (avgFps < 30) {
        this.lowFpsDuration += delta;
      } else {
        this.lowFpsDuration = 0;
      }
      
      requestAnimationFrame(loop);
    };
    
    requestAnimationFrame(loop);
  }
  
  getAverageFPS(): number {
    return this.frames.reduce((a, b) => a + b, 0) / this.frames.length;
  }
  
  getLowFpsDuration(): number {
    return this.lowFpsDuration;
  }
}

const fpsMonitor = new FPSMonitor();
fpsMonitor.start();
```

### 3.4 网络降级实现

```typescript
class NetworkMonitor {
  private failures: number = 0;
  private latency: number = 0;
  private offlineMode: boolean = false;
  
  async checkNetwork(): Promise<NetworkStatus> {
    try {
      const start = performance.now();
      const response = await fetch('/api/v1/health', { method: 'GET' });
      this.latency = performance.now() - start;
      
      if (!response.ok) {
        this.failures++;
      } else {
        this.failures = 0;
      }
      
      return { online: true, latency: this.latency };
    } catch (error) {
      this.failures++;
      return { online: false, latency: Infinity };
    }
  }
  
  shouldEnableOfflineMode(): boolean {
    return this.failures > 3 || this.latency > 5000;
  }
  
  enableOfflineMode(): void {
    this.offlineMode = true;
    loadFromCache();
  }
  
  disableOfflineMode(): void {
    this.offlineMode = false;
    syncWithServer();
  }
}
```

---

## 4. 性能测试用例

| 用例ID | 测试内容 | 测试方法 | 预期结果 |
|--------|----------|----------|----------|
| PER-01 | 页面加载 | Lighthouse | FCP<1.5s, LCP<3s |
| PER-02 | 音频延迟 | DevTools Performance | <80ms |
| PER-03 | 乐谱渲染 | Performance API | <500ms |
| PER-04 | API响应 | Sentry APM | P95<200ms |
| PER-05 | 内存占用 | Memory Panel | <200MB |
| PER-06 | FPS | FPS计数器 | 60fps |
| PER-07 | 降级触发 | 模拟低端设备 | 自动降级 |
| PER-08 | 网络降级 | 模拟网络差 | 离线模式 |

---

## 5. 性能报告模板

```markdown
# 性能报告

## 报告信息
- 报告日期: YYYY-MM-DD
- 测试环境: Production
- 测试工具: Lighthouse, DevTools, Sentry

## 核心指标

### Web Vitals
| 指标 | 目标 | 实际 | 状态 |
|------|------|------|------|
| FCP | <1.5s | XXs | ✓/✗ |
| LCP | <3s | XXs | ✓/✗ |
| CLS | <0.1 | XX | ✓/✗ |
| FID | <100ms | XXms | ✓/✗ |

### 音频性能
| 指标 | 目标 | 实际 | 状态 |
|------|------|------|------|
| 检测延迟 | <80ms | XXms | ✓/✗ |
| 准确率 | >95% | XX% | ✓/✗ |

### API性能
| 指标 | 目标 | 实际 | 状态 |
|------|------|------|------|
| P50 | <100ms | XXms | ✓/✗ |
| P95 | <200ms | XXms | ✓/✗ |

## 建议
1. ...
2. ...
```

---

*文档结束*