# 性能预算分配

## 文档信息

| 项目 | 内容 |
|------|------|
| 文档版本 | v1.0 |
| 创建日期 | 2026-04-15 |
| 适用范围 | Resonance 音乐练习应用 |

---

## 1. 性能预算总览

### 1.1 核心性能指标

| 指标 | 目标值 | 测量方式 | 优先级 |
|------|--------|----------|--------|
| FCP (First Contentful Paint) | < 1.5s | Lighthouse | P0 |
| LCP (Largest Contentful Paint) | < 2.5s | Lighthouse | P0 |
| TTI (Time to Interactive) | < 3.5s | Lighthouse | P0 |
| TBT (Total Blocking Time) | < 200ms | Lighthouse | P1 |
| CLS (Cumulative Layout Shift) | < 0.1 | Lighthouse | P1 |
| SI (Speed Index) | < 3.0s | Lighthouse | P1 |

### 1.2 音频处理性能预算

| 指标 | 目标值 | 说明 |
|------|--------|------|
| 单音检测延迟 | < 80ms | YIN算法 |
| 复音检测延迟 | < 200ms | Basic Pitch |
| 音频缓冲区大小 | 1024 samples | 约23ms @44.1kHz |
| 检测置信度阈值 | 0.5 | 最低可信度 |

### 1.3 乐谱渲染性能预算

| 指标 | 目标值 | 说明 |
|------|--------|------|
| 乐谱加载时间 | < 2s | MusicXML解析+渲染 |
| Cursor移动响应 | < 16ms | 60fps流畅 |
| 页面切换时间 | < 300ms | SPA路由切换 |
| 动画帧率 | 60fps | CSS动画 |

---

## 2. 资源预算分配

### 2.1 JavaScript 资源预算

| 资源类型 | 预算大小 | 实际大小 | 状态 |
|----------|----------|----------|------|
| 主包 (main.js) | < 200KB | 待测量 | ⏳ |
| OSMD库 | < 500KB | ~400KB | ✅ |
| Vendor包 | < 300KB | 待测量 | ⏳ |
| 总JS大小 | < 1MB | 待测量 | ⏳ |

### 2.2 CSS 资源预算

| 资源类型 | 预算大小 | 说明 |
|----------|----------|------|
| 主样式文件 | < 50KB | variables + components |
| 字体文件 | < 100KB | 3个字体，woff2格式 |
| 总CSS大小 | < 150KB | 含字体 |

### 2.3 图片资源预算

| 资源类型 | 预算大小 | 格式 |
|----------|----------|------|
| Logo/图标 | < 20KB | SVG |
| 背景图 | < 100KB | WebP |
| 用户上传图片 | < 5MB | 限制上传大小 |

### 2.4 内存预算

| 资源类型 | 预算大小 | 说明 |
|----------|----------|------|
| AudioContext | < 10MB | 音频缓冲区 |
| OSMD实例 | < 50MB | 乐谱渲染 |
| 状态管理 | < 5MB | Zustand stores |
| 总内存占用 | < 100MB | 运行时峰值 |

---

## 3. 性能优化策略

### 3.1 代码分割策略

```typescript
// vite.config.ts 配置
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-osmd': ['opensheetmusicdisplay'],
          'vendor-zustand': ['zustand'],
          'audio': ['./src/audio'],
          'engine': ['./src/engine'],
          'services': ['./src/services'],
          'components': ['./src/components'],
        },
      },
    },
  },
});
```

### 3.2 懒加载策略

```typescript
// 页面组件懒加载
import { lazy, Suspense } from 'react';

const HomePage = lazy(() => import('./pages/HomePage'));
const PracticePage = lazy(() => import('./pages/PracticePage'));
const LibraryPage = lazy(() => import('./pages/LibraryPage'));
const StatisticsPage = lazy(() => import('./pages/StatisticsPage'));

// OSMD 懒加载
const loadOSMD = async () => {
  const { OpenSheetMusicDisplay } = await import('opensheetmusicdisplay');
  return OpenSheetMusicDisplay;
};
```

### 3.3 预加载策略

```typescript
// 关键资源预加载
const preloadCriticalResources = () => {
  // 预加载字体
  const fonts = [
    '/fonts/CormorantGaramond.woff2',
    '/fonts/PlusJakartaSans.woff2',
    '/fonts/FiraCode.woff2',
  ];
  
  fonts.forEach((font) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'font';
    link.type = 'font/woff2';
    link.href = font;
    document.head.appendChild(link);
  });
};
```

### 3.4 缓存策略

```typescript
// Service Worker 缓存配置
const cacheConfig = {
  staticAssets: {
    cacheName: 'static-v1',
    maxAge: 30 * 24 * 60 * 60, // 30天
    strategy: 'cache-first',
  },
  apiRequests: {
    cacheName: 'api-v1',
    maxAge: 5 * 60, // 5分钟
    strategy: 'network-first',
  },
  musicXml: {
    cacheName: 'scores-v1',
    maxAge: 7 * 24 * 60 * 60, // 7天
    strategy: 'cache-first',
  },
};
```

---

## 4. 性能监控

### 4.1 性能指标采集

```typescript
// Web Vitals 采集
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

const collectMetrics = () => {
  getCLS(console.log);
  getFID(console.log);
  getFCP(console.log);
  getLCP(console.log);
  getTTFB(console.log);
};

// 自定义性能指标
const measureCustomMetrics = {
  scoreLoadTime: () => {
    const start = performance.now();
    // 加载乐谱
    return performance.now() - start;
  },
  
  pitchDetectionLatency: () => {
    const start = performance.now();
    // 执行检测
    return performance.now() - start;
  },
};
```

### 4.2 性能预算检查

```typescript
// 性能预算检查脚本
const performanceBudgetCheck = {
  jsSize: { budget: 1024 * 1024, actual: 0 },
  cssSize: { budget: 150 * 1024, actual: 0 },
  imageSize: { budget: 5 * 1024 * 1024, actual: 0 },
  
  check(): boolean {
    const violations: string[] = [];
    
    if (this.jsSize.actual > this.jsSize.budget) {
      violations.push(`JS size exceeds budget: ${this.jsSize.actual} > ${this.jsSize.budget}`);
    }
    
    if (this.cssSize.actual > this.cssSize.budget) {
      violations.push(`CSS size exceeds budget: ${this.cssSize.actual} > ${this.cssSize.budget}`);
    }
    
    return violations.length === 0;
  },
};
```

---

## 5. 音频性能优化

### 5.1 AudioWorklet 优化

```typescript
// AudioWorklet 性能配置
const audioWorkletConfig = {
  bufferSize: 1024, // 约23ms延迟
  sampleRate: 44100,
  
  // YIN算法优化
  yinThreshold: 0.15,
  yinBufferSize: 2048,
  
  // 频率范围限制
  minFrequency: 80,
  maxFrequency: 1000,
};
```

### 5.2 检测算法优化

```typescript
// YIN算法性能优化
const optimizeYIN = {
  // 使用目标频率窗口
  useTargetWindow: true,
  
  // 跳过不必要的计算
  skipSilentFrames: true,
  
  // 缓存计算结果
  cacheCumulativeDiff: true,
  
  // 并行计算（Web Worker）
  useWebWorker: false, // AudioWorklet已足够
};
```

---

## 6. 渲染性能优化

### 6.1 OSMD优化

```typescript
// OSMD 性能配置
const osmdConfig = {
  // 渲染选项
  drawTitle: false,
  drawPartNames: true,
  drawMeasureNumbers: false,
  
  // Cursor优化
  cursorOptions: {
    color: '#d4af37',
    alpha: 0.8,
    width: 3,
  },
  
  // 后台渲染
  renderInBackground: false,
};
```

### 6.2 React渲染优化

```typescript
// React 性能优化
import { memo, useMemo, useCallback } from 'react';

// 组件memo化
const ScoreRenderer = memo(ScoreRendererComponent);

// 状态优化
const useOptimizedState = () => {
  const [state, setState] = useState(initialState);
  
  // 使用useCallback避免重复创建
  const optimizedSetState = useCallback((newState) => {
    setState(newState);
  }, []);
  
  return [state, optimizedSetState];
};

// 列表渲染优化
const renderNoteList = (notes: Note[]) => {
  return useMemo(() => 
    notes.map((note) => <NoteItem key={note.id} note={note} />),
    [notes]
  );
};
```

---

## 7. 性能测试

### 7.1 自动化性能测试

```typescript
// vitest 性能测试配置
describe('Performance Tests', () => {
  it('YIN detection latency < 80ms', async () => {
    const start = performance.now();
    await detectPitch(testAudioBuffer);
    const latency = performance.now() - start;
    expect(latency).toBeLessThan(80);
  });
  
  it('Score load time < 2s', async () => {
    const start = performance.now();
    await loadScore(testXml);
    const loadTime = performance.now() - start;
    expect(loadTime).toBeLessThan(2000);
  });
});
```

### 7.2 性能基准测试

```bash
# Lighthouse CI 配置
lighthouse-ci --config=lighthouse.config.js

# 性能预算检查
npm run build && npm run analyze
```

---

## 8. 性能预算监控

### 8.1 CI/CD集成

```yaml
# GitHub Actions 性能检查
performance-check:
  steps:
    - name: Build
      run: npm run build
    
    - name: Size Check
      run: npx bundlesize
    
    - name: Lighthouse CI
      run: npx lhci autorun
```

### 8.2 性能告警

```typescript
// 性能告警配置
const performanceAlerts = {
  thresholds: {
    jsSize: { warning: 800KB, critical: 1MB },
    cssSize: { warning: 100KB, critical: 150KB },
    lcp: { warning: 2s, critical: 2.5s },
    fid: { warning: 100ms, critical: 200ms },
  },
  
  notify: (metric: string, level: 'warning' | 'critical') => {
    console.warn(`Performance ${level}: ${metric}`);
  },
};
```

---

*文档结束*