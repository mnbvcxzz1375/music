# 数据埋点与监控文档

## 文档信息

| 项目 | 内容 |
|------|------|
| 文档版本 | v1.0 |
| 创建日期 | 2026-04-14 |
| 关联Spec | music-practice-app-refactor/spec.md |
| 责任人 | 数据工程师 |

---

## 1. 用户行为埋点事件

### 1.1 事件分类

| 类别 | 事件类型 | 说明 |
|------|----------|------|
| 页面访问 | page_view | 页面浏览 |
| 练习行为 | practice_start, practice_end | 练习开始/结束 |
| 曲目操作 | piece_select, piece_upload, piece_delete | 曲目相关操作 |
| 订阅行为 | subscription_view, subscription_convert | 订阅相关 |
| 成就行为 | achievement_unlock | 成就解锁 |
| 错误行为 | error_occurred | 错误发生 |

### 1.2 基础事件Schema

```typescript
interface BaseEvent {
  event_type: string;
  user_id: string;
  timestamp: number;
  session_id: string;
  device_info: {
    platform: 'web' | 'ios' | 'android';
    os_version: string;
    app_version: string;
    screen_width: number;
    screen_height: number;
  };
  location?: {
    country: string;
    region: string;
  };
}
```

### 1.3 页面访问事件

```typescript
interface PageViewEvent extends BaseEvent {
  event_type: 'page_view';
  page_name: string;
  page_path: string;
  referrer: string;
  duration_ms: number;
  scroll_depth: number;
}

const trackPageView = (pageName: string): void => {
  const event: PageViewEvent = {
    event_type: 'page_view',
    user_id: getCurrentUserId(),
    timestamp: Date.now(),
    session_id: getSessionId(),
    device_info: getDeviceInfo(),
    page_name: pageName,
    page_path: window.location.pathname,
    referrer: document.referrer,
    duration_ms: 0,
    scroll_depth: 0,
  };
  
  sendEvent(event);
  
  const startTime = Date.now();
  const trackScroll = () => {
    event.scroll_depth = calculateScrollDepth();
  };
  const trackDuration = () => {
    event.duration_ms = Date.now() - startTime;
    sendEvent(event);
  };
  
  window.addEventListener('scroll', trackScroll);
  window.addEventListener('beforeunload', trackDuration);
};
```

### 1.4 练习行为事件

```typescript
interface PracticeStartEvent extends BaseEvent {
  event_type: 'practice_start';
  piece_id: string;
  piece_title: string;
  difficulty: number;
  practice_mode: 'normal' | 'slow' | 'segment' | 'loop';
  tempo: number;
  instrument_type: string;
  part_id: string;
}

interface PracticeEndEvent extends BaseEvent {
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

const trackPracticeStart = (piece: Piece, settings: PracticeSettings): void => {
  const event: PracticeStartEvent = {
    event_type: 'practice_start',
    user_id: getCurrentUserId(),
    timestamp: Date.now(),
    session_id: getSessionId(),
    device_info: getDeviceInfo(),
    piece_id: piece.id,
    piece_title: piece.title,
    difficulty: piece.difficulty,
    practice_mode: settings.mode,
    tempo: settings.tempo,
    instrument_type: piece.instrumentType,
    part_id: settings.partId,
  };
  
  sendEvent(event);
};

const trackPracticeEnd = (session: PracticeSession): void => {
  const event: PracticeEndEvent = {
    event_type: 'practice_end',
    user_id: getCurrentUserId(),
    timestamp: Date.now(),
    session_id: getSessionId(),
    device_info: getDeviceInfo(),
    piece_id: session.pieceId,
    duration_seconds: session.duration,
    total_notes: session.totalNotes,
    correct_notes: session.correctNotes,
    accuracy: session.accuracy,
    pitch_errors: session.pitchErrors,
    rhythm_errors: session.rhythmErrors,
    retry_count: session.retries,
    completion_status: session.status,
  };
  
  sendEvent(event);
};
```

### 1.5 曲目操作事件

```typescript
interface PieceSelectEvent extends BaseEvent {
  event_type: 'piece_select';
  piece_id: string;
  source: 'search' | 'recommend' | 'favorite' | 'recent' | 'upload';
  search_query?: string;
  position?: number;
}

interface PieceUploadEvent extends BaseEvent {
  event_type: 'piece_upload';
  piece_id: string;
  file_format: 'musicxml' | 'xml' | 'mxl';
  file_size_kb: number;
  parse_status: 'success' | 'failed';
  error_message?: string;
}

const trackPieceSelect = (piece: Piece, source: string, query?: string): void => {
  const event: PieceSelectEvent = {
    event_type: 'piece_select',
    user_id: getCurrentUserId(),
    timestamp: Date.now(),
    session_id: getSessionId(),
    device_info: getDeviceInfo(),
    piece_id: piece.id,
    source: source,
    search_query: query,
  };
  
  sendEvent(event);
};
```

### 1.6 订阅行为事件

```typescript
interface SubscriptionViewEvent extends BaseEvent {
  event_type: 'subscription_view';
  plan_type: 'monthly' | 'yearly';
  price: number;
  currency: string;
  source: 'settings' | 'feature_gate' | 'promo';
}

interface SubscriptionConvertEvent extends BaseEvent {
  event_type: 'subscription_convert';
  plan_type: 'monthly' | 'yearly';
  payment_provider: 'stripe' | 'alipay' | 'wechat';
  price: number;
  currency: string;
  trial_used: boolean;
}

const trackSubscriptionConvert = (subscription: Subscription): void => {
  const event: SubscriptionConvertEvent = {
    event_type: 'subscription_convert',
    user_id: getCurrentUserId(),
    timestamp: Date.now(),
    session_id: getSessionId(),
    device_info: getDeviceInfo(),
    plan_type: subscription.planType,
    payment_provider: subscription.paymentProvider,
    price: subscription.price,
    currency: subscription.currency,
    trial_used: subscription.trialUsed,
  };
  
  sendEvent(event);
};
```

### 1.7 成就行为事件

```typescript
interface AchievementUnlockEvent extends BaseEvent {
  event_type: 'achievement_unlock';
  achievement_type: string;
  achievement_id: string;
  achievement_name: string;
  trigger_condition: string;
  progress_value: number;
  progress_target: number;
}

const trackAchievementUnlock = (achievement: Achievement): void => {
  const event: AchievementUnlockEvent = {
    event_type: 'achievement_unlock',
    user_id: getCurrentUserId(),
    timestamp: Date.now(),
    session_id: getSessionId(),
    device_info: getDeviceInfo(),
    achievement_type: achievement.type,
    achievement_id: achievement.id,
    achievement_name: achievement.name,
    trigger_condition: achievement.condition,
    progress_value: achievement.progress,
    progress_target: achievement.target,
  };
  
  sendEvent(event);
};
```

---

## 2. 数据采集方案

### 2.1 前端SDK封装

```typescript
class AnalyticsSDK {
  private endpoint: string = '/api/v1/analytics';
  private batchSize: number = 10;
  private batchInterval: number = 5000;
  private eventQueue: BaseEvent[] = [];
  private userId: string;
  private sessionId: string;
  
  init(userId: string): void {
    this.userId = userId;
    this.sessionId = this.generateSessionId();
    this.startBatchSender();
  }
  
  track(event: BaseEvent): void {
    this.eventQueue.push({
      ...event,
      user_id: this.userId,
      session_id: this.sessionId,
      timestamp: Date.now(),
    });
    
    if (this.eventQueue.length >= this.batchSize) {
      this.flush();
    }
  }
  
  private flush(): void {
    if (this.eventQueue.length === 0) return;
    
    const events = [...this.eventQueue];
    this.eventQueue = [];
    
    navigator.sendBeacon(this.endpoint, JSON.stringify({ events }));
  }
  
  private startBatchSender(): void {
    setInterval(() => this.flush(), this.batchInterval);
    
    window.addEventListener('beforeunload', () => this.flush());
  }
  
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

const analytics = new AnalyticsSDK();
export default analytics;
```

### 2.2 后端事件接收API

```typescript
interface EventBatchRequest {
  events: BaseEvent[];
}

const receiveEventsHandler = async (req: Request, res: Response) => {
  const { events } = req.body as EventBatchRequest;
  
  for (const event of events) {
    await validateEvent(event);
    await storeEvent(event);
  }
  
  res.status(200).json({ received: events.length });
};

const validateEvent = async (event: BaseEvent): boolean => {
  if (!event.event_type || !event.user_id || !event.timestamp) {
    throw new Error('Invalid event format');
  }
  
  if (event.timestamp > Date.now() + 60000) {
    throw new Error('Event timestamp too far in future');
  }
  
  return true;
};

const storeEvent = async (event: BaseEvent): void => {
  await clickhouse.insert({
    table: 'events',
    values: [event],
  });
};
```

### 2.3 ClickHouse存储设计

```sql
CREATE TABLE events (
  event_type String,
  user_id String,
  timestamp DateTime64(3),
  session_id String,
  platform String,
  os_version String,
  app_version String,
  screen_width UInt16,
  screen_height UInt16,
  country String,
  region String,
  event_data String, -- JSON格式的扩展数据
  created_at DateTime DEFAULT now()
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (event_type, user_id, timestamp);

CREATE TABLE practice_events (
  event_type String,
  user_id String,
  timestamp DateTime64(3),
  session_id String,
  piece_id String,
  piece_title String,
  difficulty UInt8,
  practice_mode String,
  tempo UInt16,
  instrument_type String,
  duration_seconds UInt32,
  accuracy Float32,
  pitch_errors UInt16,
  rhythm_errors UInt16,
  completion_status String,
  created_at DateTime DEFAULT now()
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (user_id, piece_id, timestamp);

CREATE TABLE subscription_events (
  event_type String,
  user_id String,
  timestamp DateTime64(3),
  session_id String,
  plan_type String,
  payment_provider String,
  price Float32,
  currency String,
  trial_used UInt8,
  created_at DateTime DEFAULT now()
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (user_id, timestamp);
```

---

## 3. 隐私合规

### 3.1 用户同意机制

```typescript
interface ConsentState {
  analytics: boolean;
  marketing: boolean;
  personalization: boolean;
  timestamp: number;
}

const getConsent = (): ConsentState => {
  const stored = localStorage.getItem('user_consent');
  return stored ? JSON.parse(stored) : { analytics: false, marketing: false, personalization: false };
};

const setConsent = (consent: ConsentState): void => {
  localStorage.setItem('user_consent', JSON.stringify(consent));
  
  if (consent.analytics) {
    analytics.init(getCurrentUserId());
  } else {
    analytics.disable();
  }
};

const showConsentBanner = (): void => {
  const banner = {
    title: '数据收集同意',
    message: '我们收集数据以改善您的体验',
    options: [
      { id: 'analytics', label: '使用分析', default: true },
      { id: 'personalization', label: '个性化推荐', default: true },
      { id: 'marketing', label: '营销信息', default: false },
    ],
  };
};

const checkConsentBeforeTracking = (event: BaseEvent): boolean => {
  const consent = getConsent();
  
  if (!consent.analytics) {
    return false;
  }
  
  return true;
};
```

### 3.2 数据匿名化处理

```typescript
const anonymizeEvent = (event: BaseEvent): AnonymizedEvent => {
  return {
    ...event,
    user_id: hashUserId(event.user_id),
    session_id: hashSessionId(event.session_id),
    device_info: {
      platform: event.device_info.platform,
      os_version: event.device_info.os_version,
      app_version: event.device_info.app_version,
      screen_width: event.device_info.screen_width,
      screen_height: event.device_info.screen_height,
    },
    location: event.location ? {
      country: event.location.country,
      region: null,
    } : null,
  };
};

const hashUserId = (userId: string): string => {
  const salt = process.env.ANONYMIZATION_SALT;
  return crypto.createHash('sha256').update(userId + salt).digest('hex').substring(0, 16);
};

const anonymizePII = (data: string): string => {
  return data
    .replace(/\b[\w.-]+@[\w.-]+\.\w+\b/g, '[email]')
    .replace(/\b\d{10,11}\b/g, '[phone]')
    .replace(/\b[\w\s]+\b/g, '[name]');
};
```

### 3.3 数据保留策略

```typescript
const dataRetentionPolicy = {
  rawEvents: { retention: 30, unit: 'days' },
  aggregatedStats: { retention: 365, unit: 'days' },
  userProfiles: { retention: 'until_deletion_request' },
  
  cleanupSchedule: {
    frequency: 'daily',
    action: 'delete_expired_data',
  },
};

const cleanupExpiredData = async (): void => {
  const cutoffDate = new Date(Date.now() - dataRetentionPolicy.rawEvents.retention * 24 * 60 * 60 * 1000);
  
  await clickhouse.query(`
    DELETE FROM events 
    WHERE timestamp < '${cutoffDate.toISOString()}'
  `);
};
```

---

## 4. 数据分析指标

### 4.1 核心指标定义

| 指标 | 定义 | 计算公式 | 数据源 |
|------|------|----------|--------|
| DAU | 日活跃用户数 | COUNT(DISTINCT user_id) WHERE date=today | events表 |
| MAU | 月活跃用户数 | COUNT(DISTINCT user_id) WHERE month=current | events表 |
| 次留率 | 次日留存率 | DAU(t+1) / DAU(t) WHERE first_visit=t | events表 |
| 练习时长 | 平均每日练习时长 | AVG(duration_seconds) WHERE event_type='practice_end' | practice_events表 |
| 付费转化率 | 付费用户占比 | COUNT(subscription_convert) / COUNT(DISTINCT user_id) | subscription_events表 |

### 4.2 指标计算SQL

```sql
-- DAU计算
SELECT 
  toDate(timestamp) as date,
  COUNT(DISTINCT user_id) as dau
FROM events
WHERE toDate(timestamp) = today()
GROUP BY date;

-- 次留率计算
SELECT 
  toDate(first_visit) as date,
  COUNT(DISTINCT user_id) as retained_users,
  COUNT(DISTINCT user_id) / (
    SELECT COUNT(DISTINCT user_id) 
    FROM events 
    WHERE toDate(timestamp) = toDate(first_visit)
  ) as retention_rate
FROM events
WHERE toDate(timestamp) = toDate(first_visit) + 1
GROUP BY date;

-- 练习时长计算
SELECT 
  toDate(timestamp) as date,
  AVG(duration_seconds) as avg_duration,
  SUM(duration_seconds) as total_duration
FROM practice_events
WHERE event_type = 'practice_end'
GROUP BY date;

-- 付费转化率计算
SELECT 
  COUNT(DISTINCT user_id) as converted_users,
  COUNT(DISTINCT user_id) / (
    SELECT COUNT(DISTINCT user_id) FROM events
  ) as conversion_rate
FROM subscription_events
WHERE event_type = 'subscription_convert';
```

---

## 5. 监控告警

### 5.1 告警规则

```typescript
const alertRules = {
  dauDrop: {
    condition: 'dau < dau_yesterday * 0.8',
    severity: 'warning',
    notify: 'product-team',
  },
  
  conversionDrop: {
    condition: 'conversion_rate < 0.03',
    severity: 'critical',
    notify: 'business-team',
  },
  
  errorRateHigh: {
    condition: 'error_rate > 0.05',
    severity: 'critical',
    notify: 'dev-team',
  },
  
  latencyHigh: {
    condition: 'avg_latency > 500',
    severity: 'warning',
    notify: 'dev-team',
  },
};

const checkAlerts = async (): void => {
  const metrics = await calculateMetrics();
  
  for (const [ruleName, rule] of Object.entries(alertRules)) {
    if (evaluateCondition(rule.condition, metrics)) {
      await sendAlert(ruleName, rule);
    }
  }
};
```

---

## 6. 测试用例

| 用例ID | 测试内容 | 测试方法 | 预期结果 |
|--------|----------|----------|----------|
| ANA-01 | 页面访问埋点 | 访问页面 | 事件发送 |
| ANA-02 | 练习开始埋点 | 开始练习 | 事件发送 |
| ANA-03 | 练习结束埋点 | 结束练习 | 事件发送 |
| ANA-04 | 订阅转化埋点 | 完成订阅 | 事件发送 |
| ANA-05 | 成就解锁埋点 | 解锁成就 | 事件发送 |
| ANA-06 | 用户同意 | 设置同意 | SDK启用 |
| ANA-07 | 数据匿名化 | 检查数据 | PII已匿名 |
| ANA-08 | DAU计算 | 查询数据 | 正确计算 |

---

*文档结束*