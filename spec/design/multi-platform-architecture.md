# 多端适配技术方案

## 文档信息

| 项目 | 内容 |
|------|------|
| 文档版本 | v1.0 |
| 创建日期 | 2026-04-15 |
| 适用范围 | Resonance 音乐练习应用 |

---

## 1. 多端适配概览

### 1.1 目标平台

| 平台 | 优先级 | 技术方案 | 发布时间 |
|------|--------|----------|----------|
| Web桌面 | P0 | React + Vite | V1.0 |
| Tauri桌面 | P1 | Tauri + React | V1.1 |
| iOS原生 | P2 | React Native / Capacitor | V2.0 |
| Android原生 | P2 | React Native / Capacitor | V2.0 |

### 1.2 平台特性对比

| 特性 | Web | Tauri | iOS | Android |
|------|-----|-------|-----|---------|
| 音频API | Web Audio | Web Audio | AVAudioEngine | AudioRecord |
| 文件系统 | 有限 | 完整 | 完整 | 完整 |
| 离线支持 | Service Worker | 本地存储 | 本地存储 | 本地存储 |
| 性能 | 中等 | 高 | 高 | 高 |
| 开发成本 | 低 | 低 | 高 | 高 |

---

## 2. 响应式设计系统

### 2.1 断点系统

```typescript
const breakpoints = {
  xs: '320px',    // 手机竖屏
  sm: '576px',    // 手机横屏/小平板
  md: '768px',    // 平板
  lg: '1024px',   // 小桌面
  xl: '1280px',   // 大桌面
  xxl: '1536px',  // 超大桌面
};

const mediaQueries = {
  xs: `@media (max-width: ${breakpoints.sm})`,
  sm: `@media (min-width: ${breakpoints.sm}) and (max-width: ${breakpoints.md})`,
  md: `@media (min-width: ${breakpoints.md}) and (max-width: ${breakpoints.lg})`,
  lg: `@media (min-width: ${breakpoints.lg}) and (max-width: ${breakpoints.xl})`,
  xl: `@media (min-width: ${breakpoints.xl})`,
};
```

### 2.2 响应式组件

```typescript
import { useMediaQuery } from '@/hooks/useMediaQuery';

function ResponsiveComponent() {
  const isMobile = useMediaQuery('(max-width: 576px)');
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1024px)');
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  
  return (
    <div className={isMobile ? 'mobile-layout' : isTablet ? 'tablet-layout' : 'desktop-layout'}>
      {/* 内容 */}
    </div>
  );
}
```

### 2.3 CSS响应式类

```css
/* 响应式容器 */
.container {
  width: 100%;
  padding: var(--spacing-4);
}

@media (min-width: 576px) {
  .container { max-width: 540px; }
}

@media (min-width: 768px) {
  .container { max-width: 720px; }
}

@media (min-width: 1024px) {
  .container { max-width: 960px; }
}

@media (min-width: 1280px) {
  .container { max-width: 1140px; }
}

/* 响应式网格 */
.grid {
  display: grid;
  gap: var(--spacing-4);
  grid-template-columns: 1fr;
}

@media (min-width: 576px) {
  .grid-2 { grid-template-columns: repeat(2, 1fr); }
}

@media (min-width: 768px) {
  .grid-3 { grid-template-columns: repeat(3, 1fr); }
  .grid-4 { grid-template-columns: repeat(4, 1fr); }
}

@media (min-width: 1024px) {
  .grid-5 { grid-template-columns: repeat(5, 1fr); }
  .grid-6 { grid-template-columns: repeat(6, 1fr); }
}
```

---

## 3. Tauri桌面应用

### 3.1 Tauri配置

```json
{
  "build": {
    "beforeBuildCommand": "npm run build",
    "beforeDevCommand": "npm run dev",
    "devPath": "http://localhost:5173",
    "distDir": "../dist"
  },
  "tauri": {
    "bundle": {
      "active": true,
      "targets": ["msi", "app", "dmg"],
      "identifier": "com.resonance.app",
      "icon": ["icons/32x32.png", "icons/128x128.png", "icons/icon.icns"]
    },
    "security": {
      "csp": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
    },
    "windows": [
      {
        "title": "Resonance",
        "width": 1280,
        "height": 800,
        "minWidth": 800,
        "minHeight": 600,
        "resizable": true,
        "fullscreen": false
      }
    ],
    "allowlist": {
      "all": false,
      "fs": {
        "all": true,
        "scope": ["$APP/*", "$DOCUMENT/*"]
      },
      "shell": {
        "all": false,
        "open": true
      },
      "dialog": {
        "all": true,
        "open": true,
        "save": true
      }
    }
  }
}
```

### 3.2 Tauri API集成

```typescript
import { invoke } from '@tauri-apps/api/tauri';
import { open, save } from '@tauri-apps/api/dialog';
import { readTextFile, writeTextFile } from '@tauri-apps/api/fs';

export const TauriAPI = {
  async openFile() {
    const selected = await open({
      multiple: false,
      filters: [{ name: 'MusicXML', extensions: ['xml', 'musicxml'] }],
    });
    if (selected) {
      const content = await readTextFile(selected as string);
      return { path: selected, content };
    }
    return null;
  },
  
  async saveFile(content: string, defaultPath?: string) {
    const path = await save({
      defaultPath,
      filters: [{ name: 'MusicXML', extensions: ['xml'] }],
    });
    if (path) {
      await writeTextFile(path, content);
      return path;
    }
    return null;
  },
  
  async getSettings() {
    return invoke('get_settings');
  },
  
  async saveSettings(settings: unknown) {
    return invoke('save_settings', { settings });
  },
};
```

---

## 4. 移动端适配

### 4.1 Capacitor配置

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.resonance.app',
  appName: 'Resonance',
  webDir: 'dist',
  bundledWebRuntime: false,
  
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0a0a0a',
      showSpinner: false,
    },
    
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },
  
  ios: {
    contentInset: 'automatic',
    allowsLinkPreview: false,
  },
  
  android: {
    backgroundColor: '#0a0a0a',
  },
};

export default config;
```

### 4.2 移动端音频适配

```typescript
import { Capacitor } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();

export const MobileAudio = {
  async requestPermission() {
    if (isNative) {
      const { Permissions } = await import('@capacitor/permissions');
      const result = await Permissions.query({ name: 'microphone' });
      if (result.state !== 'granted') {
        await Permissions.request({ name: 'microphone' });
      }
    }
  },
  
  async initAudioContext() {
    if (isNative) {
      // 移动端需要特殊处理
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      return new AudioContext({ latencyHint: 'interactive' });
    }
    return new AudioContext();
  },
};
```

### 4.3 移动端UI适配

```typescript
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function MobileLayout() {
  const insets = useSafeAreaInsets();
  
  return (
    <div style={{
      paddingTop: insets.top,
      paddingBottom: insets.bottom,
      paddingLeft: insets.left,
      paddingRight: insets.right,
    }}>
      {/* 内容 */}
    </div>
  );
}
```

---

## 5. 平台特定功能

### 5.1 文件系统

| 平台 | API | 功能 |
|------|-----|------|
| Web | File API + IndexedDB | 上传/下载/本地存储 |
| Tauri | @tauri-apps/api/fs | 完整文件系统访问 |
| iOS | Capacitor Filesystem | 应用沙盒文件访问 |
| Android | Capacitor Filesystem | 应用沙盒文件访问 |

### 5.2 音频处理

| 平台 | API | 延迟 |
|------|-----|------|
| Web | Web Audio API | 20-50ms |
| Tauri | Web Audio API | 20-50ms |
| iOS | AVAudioEngine | 10-30ms |
| Android | AudioRecord + Oboe | 10-30ms |

### 5.3 离线支持

| 平台 | 技术 | 存储容量 |
|------|------|----------|
| Web | Service Worker + Cache API | ~50MB |
| Tauri | 本地文件系统 | 无限制 |
| iOS | CoreData + FileManager | 应用沙盒 |
| Android | SQLite + SharedPreferences | 应用沙盒 |

---

## 6. 代码共享策略

### 6.1 共享代码结构

```
src/
├── shared/           # 跨平台共享代码
│   ├── components/   # 共享UI组件
│   ├── services/     # 共享业务逻辑
│   ├── stores/       # 共享状态管理
│   ├── types/        # 共享类型定义
│   └── utils/        # 共享工具函数
│
├── platforms/
│   ├── web/          # Web特定代码
│   ├── tauri/        # Tauri特定代码
│   ├── ios/          # iOS特定代码
│   └── android/      # Android特定代码
│
└── native/           # 原生模块
    ├── audio/        # 原生音频处理
    ├── filesystem/   # 原生文件系统
    └── notifications/ # 原生通知
```

### 6.2 平台适配层

```typescript
// src/shared/platform.ts
export interface PlatformAdapter {
  name: 'web' | 'tauri' | 'ios' | 'android';
  
  // 文件系统
  openFile: (filters?: FileFilter[]) => Promise<FileResult | null>;
  saveFile: (content: string, defaultPath?: string) => Promise<string | null>;
  
  // 音频
  requestAudioPermission: () => Promise<boolean>;
  createAudioContext: () => Promise<AudioContext>;
  
  // 存储
  getStorage: () => StorageAdapter;
  
  // 通知
  showNotification: (title: string, body: string) => Promise<void>;
}

export function getPlatformAdapter(): PlatformAdapter {
  if (window.__TAURI__) {
    return new TauriAdapter();
  }
  if (Capacitor.isNativePlatform()) {
    if (Capacitor.getPlatform() === 'ios') {
      return new IOSAdapter();
    }
    return new AndroidAdapter();
  }
  return new WebAdapter();
}
```

---

## 7. 性能优化

### 7.1 Web性能优化

| 优化项 | 技术 | 效果 |
|--------|------|------|
| 代码分割 | Vite dynamic import | 减少初始加载 |
| 图片优化 | WebP + lazy loading | 减少带宽 |
| 缓存策略 | Service Worker | 离线支持 |
| 预加载 | preload/prefetch | 加快导航 |

### 7.2 移动端性能优化

| 优化项 | 技术 | 效果 |
|--------|------|------|
| 原生音频 | Oboe/AVAudioEngine | 降低延迟 |
| 硬件加速 | GPU渲染 | 流畅动画 |
| 内存管理 | 及时释放 | 防止OOM |
| 后台处理 | Worker线程 | 不阻塞UI |

---

## 8. 发布流程

### 8.1 Web发布

```bash
npm run build
# 部署到 CDN/静态服务器
```

### 8.2 Tauri发布

```bash
npm run tauri build
# 生成 MSI (Windows), APP (macOS), DMG (macOS)
```

### 8.3 iOS发布

```bash
npm run build
npx cap copy ios
npx cap open ios
# Xcode 构建 + App Store 发布
```

### 8.4 Android发布

```bash
npm run build
npx cap copy android
npx cap open android
# Android Studio 构建 + Play Store 发布
```

---

## 9. 测试策略

### 9.1 跨平台测试

| 测试类型 | Web | Tauri | iOS | Android |
|----------|-----|-------|-----|---------|
| 单元测试 | Vitest | Vitest | Vitest | Vitest |
| E2E测试 | Playwright | Playwright | Detox | Espresso |
| 性能测试 | Lighthouse | 内置工具 | Xcode Instruments | Android Profiler |

### 9.2 设备覆盖

| 设备类型 | 测试设备 |
|----------|----------|
| 手机 | iPhone 14, Pixel 7, Galaxy S23 |
| 平板 | iPad Pro, Galaxy Tab |
| 桌面 | Windows 11, macOS 14, Ubuntu 22 |

---

*文档结束*