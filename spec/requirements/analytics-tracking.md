# 数据埋点与监控规范

## 文档信息

| 项目 | 内容 |
|------|------|
| 文档版本 | v1.0 |
| 创建日期 | 2026-04-15 |
| 适用范围 | Resonance 音乐练习应用 |

---

## 1. 埋点设计概览

### 1.1 埋点分类

| 分类 | 说明 | 数据用途 |
|------|------|----------|
| 行为埋点 | 用户交互行为 | 用户行为分析、产品优化 |
| 性能埋点 | 系统性能指标 | 性能监控、问题排查 |
| 业务埋点 | 业务关键指标 | 业务分析、运营决策 |
| 错误埋点 | 异常和错误信息 | 问题排查、稳定性监控 |

### 1.2 埋点原则

- **最小化原则**: 仅埋必要数据，避免过度采集
- **隐私优先**: 不采集用户敏感信息
- **本地优先**: 本地存储优先，按需上报
- **批量上报**: 数据批量上报，减少请求次数

---

## 2. 行为埋点设计

### 2.1 页面访问埋点

| 事件名称 | 触发时机 | 属性 |
|----------|----------|------|
| page_view | 页面加载完成 | page_name, referrer, duration |
| page_exit | 页面离开 | page_name, duration |

### 2.2 练习行为埋点

| 事件名称 | 触发时机 | 属性 |
|----------|----------|------|
| practice_start | 开始练习 | piece_id, part_id, tempo, mode |
| practice_stop | 停止练习 | piece_id, duration, accuracy, error_count |
| practice_complete | 完成练习 | piece_id, duration, accuracy, retries |
| practice_error | 检测到错误 | piece_id, measure_index, error_type, deviation |
| practice_retry | 重试练习 | piece_id, measure_index, retry_count |

### 2.3 乐谱操作埋点

| 事件名称 | 触发时机 | 属性 |
|----------|----------|------|
| score_load | 加载乐谱 | piece_id, source, load_time |
| score_upload | 上传乐谱 | piece_id, file_size, format |
| part_select | 选择声部 | piece_id, part_id, part_name |
| tempo_change | 调整速度 | old_tempo, new_tempo |

### 2.4 用户交互埋点

| 事件名称 | 触发时机 | 属性 |
|----------|----------|------|
| button_click | 点击按钮 | button_name, page_name |
| setting_change | 修改设置 | setting_key, old_value, new_value |
| theme_change | 切换主题 | old_theme, new_theme |
| calibration_complete | 完成校准 | instrument_type, calibration_result |

---

## 3. 性能埋点设计

### 3.1 Web Vitals 埋点

| 指标名称 | 说明 | 上报时机 |
|----------|------|----------|
| FCP | First Contentful Paint | 页面加载完成 |
| LCP | Largest Contentful Paint | 页面加载完成 |
| TTI | Time to Interactive | 页面可交互 |
| CLS | Cumulative Layout Shift | 页面离开 |
| FID | First Input Delay | 首次交互 |

### 3.2 音频性能埋点

| 指标名称 | 说明 | 上报时机 |
|----------|------|----------|
| pitch_detection_latency | 音高检测延迟 | 每次检测 |
| audio_buffer_size | 音频缓冲区大小 | 初始化时 |
| detection_accuracy | 检测准确率 | 练习结束时 |

### 3.3 渲染性能埋点

| 指标名称 | 说明 | 上报时机 |
|----------|------|----------|
| score_render_time | 乐谱渲染时间 | 加载乐谱时 |
| cursor_move_time | Cursor移动时间 | 每次移动 |
| animation_fps | 动画帧率 | 动画运行时 |

---

## 4. 业务埋点设计

### 4.1 用户统计埋点

| 指标名称 | 说明 | 计算方式 |
|----------|------|----------|
| daily_active_users | 日活跃用户 | 每日统计 |
| weekly_active_users | 周活跃用户 | 每周统计 |
| monthly_active_users | 月活跃用户 | 每月统计 |
| average_session_duration | 平均会话时长 | 会话结束统计 |

### 4.2 练习统计埋点

| 指标名称 | 说明 | 计算方式 |
|----------|------|----------|
| total_practice_time | 总练习时长 | 累计统计 |
| pieces_practiced | 练习曲目数 | 累计统计 |
| average_accuracy | 平均准确率 | 练习结束统计 |
| streak_days | 连续练习天数 | 每日统计 |

### 4.3 转化埋点

| 事件名称 | 触发时机 | 属性 |
|----------|----------|------|
| signup_complete | 注册完成 | method, source |
| login_success | 登录成功 | method |
| subscription_start | 开始订阅 | plan_type, price |
| subscription_cancel | 取消订阅 | plan_type, reason |

---

## 5. 错误埋点设计

### 5.1 JavaScript错误

| 错误类型 | 捕获方式 | 属性 |
|----------|----------|------|
| runtime_error | window.onerror | message, stack, filename, lineno |
| promise_rejection | unhandledrejection | reason, stack |
| resource_error | error事件 | resource_url, type |

### 5.2 音频错误

| 错误类型 | 捕获方式 | 属性 |
|----------|----------|------|
| microphone_permission_denied | getUserMedia失败 | error_message |
| audio_context_error | AudioContext创建失败 | error_message |
| detection_error | 检测算法异常 | error_type, frequency |

### 5.3 乐谱错误

| 错误类型 | 捕获方式 | 属性 |
|----------|----------|------|
| parse_error | MusicXML解析失败 | piece_id, error_message |
| render_error | OSMD渲染失败 | piece_id, error_message |
| load_error | 乐谱加载失败 | piece_id, source |

---

## 6. 埋点实现

### 6.1 埋点SDK

```typescript
// 埋点SDK核心接口
interface AnalyticsSDK {
  // 初始化
  init(config: AnalyticsConfig): void;
  
  // 事件上报
  track(eventName: string, properties?: Record<string, unknown>): void;
  
  // 页面追踪
  trackPageView(pageName: string): void;
  
  // 性能追踪
  trackPerformance(metric: PerformanceMetric): void;
  
  // 错误追踪
  trackError(error: ErrorInfo): void;
  
  // 用户标识
  identify(userId: string, traits?: Record<string, unknown>): void;
  
  // 批量上报
  flush(): Promise<void>;
}
```

### 6.2 埋点配置

```typescript
// 埋点配置
interface AnalyticsConfig {
  // 上报端点
  endpoint: string;
  
  // 上报频率
  flushInterval: 30000; // 30秒
  
  // 批量大小
  batchSize: 20;
  
  // 是否启用
  enabled: true;
  
  // 隐私模式
  privacyMode: 'standard' | 'strict';
  
  // 本地存储
  localStorageKey: 'analytics_queue';
}
```

### 6.3 埋点使用示例

```typescript
// 练习开始埋点
analytics.track('practice_start', {
  piece_id: piece.id,
  piece_title: piece.title,
  part_id: selectedPartId,
  tempo: tempo,
  mode: 'normal',
});

// 练习结束埋点
analytics.track('practice_stop', {
  piece_id: piece.id,
  duration_seconds: duration,
  accuracy: accuracy,
  error_count: errorCount,
  pitch_errors: pitchErrors,
  rhythm_errors: rhythmErrors,
});
```

---

## 7. 数据上报策略

### 7.1 上报时机

| 场景 | 上报时机 | 策略 |
|------|----------|------|
| 页面加载 | load事件后 | 立即上报 |
| 页面离开 | beforeunload | 批量上报 |
| 练习结束 | 停止练习时 | 立即上报 |
| 错误发生 | 错误捕获时 | 立即上报 |
| 定时上报 | 每30秒 | 批量上报 |

### 7.2 数据格式

```typescript
// 上报数据格式
interface AnalyticsEvent {
  // 事件ID
  id: string;
  
  // 事件名称
  event: string;
  
  // 事件属性
  properties: Record<string, unknown>;
  
  // 时间戳
  timestamp: number;
  
  // 用户ID（匿名）
  user_id: string;
  
  // 会话ID
  session_id: string;
  
  // 设备信息
  device: {
    platform: string;
    browser: string;
    version: string;
    language: string;
  };
}
```

### 7.3 数据压缩

```typescript
// 数据压缩策略
const compressData = (events: AnalyticsEvent[]): string => {
  // 1. 移除冗余字段
  // 2. 使用短字段名
  // 3. JSON压缩
  // 4. Base64编码
  return JSON.stringify(events);
};
```

---

## 8. 监控告警

### 8.1 告警规则

| 告警类型 | 触发条件 | 告警级别 |
|----------|----------|----------|
| 错误率告警 | 错误率 > 1% | P2 |
| 性能告警 | LCP > 3s | P2 |
| 业务告警 | DAU下降 > 20% | P1 |
| 稳定性告警 | JS错误 > 10次/分钟 | P1 |

### 8.2 告警通知

```typescript
// 告警通知配置
interface AlertConfig {
  // 通知渠道
  channels: ['email', 'slack', 'sms'];
  
  // 通知频率
  frequency: 'immediate' | 'hourly' | 'daily';
  
  // 通知接收者
  recipients: string[];
  
  // 告警阈值
  thresholds: Record<string, number>;
}
```

---

## 9. 数据隐私

### 9.1 数据脱敏

| 数据类型 | 脱敏方式 |
|----------|----------|
| 用户ID | 使用匿名UUID |
| IP地址 | 保留前3段 |
| 设备信息 | 仅保留类型 |
| 位置信息 | 仅保留城市级别 |

### 9.2 数据保留

| 数据类型 | 保留期限 |
|----------|----------|
| 行为数据 | 90天 |
| 性能数据 | 30天 |
| 错误数据 | 30天 |
| 业务数据 | 365天 |

---

## 10. 监控仪表盘

### 10.1 核心指标仪表盘

| 指标 | 展示方式 | 更新频率 |
|------|----------|----------|
| DAU/MAU | 数字+趋势图 | 实时 |
| 平均练习时长 | 数字+趋势图 | 实时 |
| 平均准确率 | 数字+趋势图 | 实时 |
| 错误率 | 数字+趋势图 | 实时 |
| LCP分布 | 柱状图 | 每小时 |

### 10.2 业务仪表盘

| 指标 | 展示方式 | 更新频率 |
|------|----------|----------|
| 练习曲目分布 | 饼图 | 每日 |
| 用户留存率 | 折线图 | 每日 |
| 转化漏斗 | 漏斗图 | 每日 |

---

*文档结束*