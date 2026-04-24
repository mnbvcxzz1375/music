# Phase 7: 真实后端集成规划

## 概述

Phase 7的目标是将模拟后端替换为真实的生产级后端服务，包括数据库、支付、认证和云存储等核心功能。

## Phase 7.1: 数据库集成

### 技术选型
- **主数据库**: PostgreSQL (关系型，适合用户数据、订阅、交易)
- **缓存层**: Redis (会话缓存、排行榜、实时数据)
- **文件存储**: MongoDB (乐谱文件、用户上传文件)

### 数据模型设计

#### PostgreSQL 表结构

```sql
-- 用户表
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  role VARCHAR(20) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_active_at TIMESTAMP,
  is_verified BOOLEAN DEFAULT FALSE,
  is_premium BOOLEAN DEFAULT FALSE
);

-- 订阅表
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  plan VARCHAR(20) NOT NULL, -- free/premium/premium_plus
  status VARCHAR(20) NOT NULL, -- active/canceled/expired
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP,
  auto_renew BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 支付记录表
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  subscription_id UUID REFERENCES subscriptions(id),
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'CNY',
  status VARCHAR(20) NOT NULL, -- pending/completed/failed/refunded
  payment_method VARCHAR(20), -- stripe/alipay/wechat
  transaction_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 曲目表
CREATE TABLE pieces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  composer VARCHAR(255),
  difficulty VARCHAR(20) NOT NULL,
  genre VARCHAR(50),
  instrument VARCHAR(50),
  duration_seconds INTEGER,
  is_official BOOLEAN DEFAULT FALSE,
  is_premium BOOLEAN DEFAULT FALSE,
  file_path TEXT NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 练习记录表
CREATE TABLE practice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  piece_id UUID REFERENCES pieces(id),
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  duration_seconds INTEGER NOT NULL,
  total_notes INTEGER,
  correct_notes INTEGER,
  accuracy DECIMAL(5,2),
  pitch_errors INTEGER DEFAULT 0,
  rhythm_errors INTEGER DEFAULT 0,
  tempo INTEGER,
  mode VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 成就表
CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  achievement_type VARCHAR(50) NOT NULL,
  achievement_name VARCHAR(100) NOT NULL,
  unlocked_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB
);

-- 签到表
CREATE TABLE checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  checkin_date DATE NOT NULL,
  streak_days INTEGER DEFAULT 1,
  reward_points INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, checkin_date)
);
```

### 实现任务

| 任务 | 文件 | 描述 |
|------|------|------|
| 数据库连接配置 | `src/backend/db/connection.ts` | PostgreSQL/Redis/MongoDB连接 |
| 用户数据访问层 | `src/backend/db/users.ts` | 用户CRUD操作 |
| 订阅数据访问层 | `src/backend/db/subscriptions.ts` | 订阅CRUD操作 |
| 曲目数据访问层 | `src/backend/db/pieces.ts` | 曲目CRUD操作 |
| 练习记录数据访问层 | `src/backend/db/sessions.ts` | 练习记录CRUD操作 |
| 数据迁移脚本 | `src/backend/db/migrations/` | 数据库迁移管理 |

---

## Phase 7.2: 真实支付集成

### 支付渠道

#### 国际支付 - Stripe
- 信用卡/借记卡
- Apple Pay / Google Pay
- 支持订阅周期付款

#### 国内支付
- 支付宝
- 微信支付

### 实现架构

```
前端 → PaymentStore → PaymentService → 支付网关API
                              ↓
                         数据库记录
```

### 实现任务

| 任务 | 文件 | 描述 |
|------|------|------|
| Stripe集成 | `src/backend/payment/stripe.ts` | Stripe API封装 |
| 支付宝集成 | `src/backend/payment/alipay.ts` | 支付宝API封装 |
| 微信支付集成 | `src/backend/payment/wechat.ts` | 微信支付API封装 |
| 支付回调处理 | `src/backend/routes/payment-callback.ts` | 支付结果回调 |
| 订单状态管理 | `src/backend/payment/order.ts` | 订单状态流转 |
| 前端支付组件 | `src/components/payment/PaymentModal.tsx` | 支付弹窗组件 |

### API设计

```typescript
// 创建支付订单
POST /api/payments/create
{
  plan: 'premium',
  period: 'monthly',
  paymentMethod: 'stripe'
}

// 支付回调
POST /api/payments/callback/:provider
{
  transactionId: 'xxx',
  status: 'success'
}

// 查询订单状态
GET /api/payments/:orderId/status
```

---

## Phase 7.3: OAuth认证集成

### OAuth提供商

| 提供商 | 适用场景 | OAuth版本 |
|--------|----------|-----------|
| Google | 国际用户 | OAuth 2.0 |
| 微信 | 国内用户 | OAuth 2.0 |
| Apple | iOS用户 | Sign in with Apple |
| GitHub | 开发者用户 | OAuth 2.0 |

### 认证流程

```
用户 → 点击OAuth登录 → 跳转OAuth提供商 → 用户授权 → 回调获取token → 创建/登录账户
```

### 实现任务

| 任务 | 文件 | 描述 |
|------|------|------|
| Google OAuth | `src/backend/auth/google.ts` | Google登录集成 |
| 微信 OAuth | `src/backend/auth/wechat.ts` | 微信登录集成 |
| Apple登录 | `src/backend/auth/apple.ts` | Apple登录集成 |
| GitHub OAuth | `src/backend/auth/github.ts` | GitHub登录集成 |
| OAuth回调处理 | `src/backend/routes/oauth-callback.ts` | OAuth回调路由 |
| JWT Token管理 | `src/backend/auth/jwt.ts` | Token生成/验证 |
| 前端OAuth组件 | `src/components/auth/OAuthButtons.tsx` | OAuth登录按钮 |

### API设计

```typescript
// 发起OAuth登录
GET /api/auth/oauth/:provider

// OAuth回调
GET /api/auth/oauth/:provider/callback
Query: code, state

// 刷新Token
POST /api/auth/refresh
{
  refreshToken: 'xxx'
}

// 登出
POST /api/auth/logout
```

---

## Phase 7.4: 云存储集成

### 存储需求

| 类型 | 内容 | 存储方案 |
|------|------|----------|
| 乐谱文件 | MusicXML/PDF | AWS S3 / 阿里云OSS |
| 用户头像 | 图片 | AWS S3 / 阿里云OSS |
| OCR图片 | 扫描乐谱 | AWS S3 / 阿里云OSS |
| 练习录音 | 音频文件 | AWS S3 / 阿里云OSS |

### 实现任务

| 任务 | 文件 | 描述 |
|------|------|------|
| AWS S3集成 | `src/backend/storage/s3.ts` | AWS S3 API封装 |
| 阿里云OSS集成 | `src/backend/storage/oss.ts` | 阿里云OSS API封装 |
| 文件上传服务 | `src/backend/storage/upload.ts` | 文件上传处理 |
| 文件下载服务 | `src/backend/storage/download.ts` | 文件下载处理 |
| CDN配置 | `src/backend/storage/cdn.ts` | CDN加速配置 |
| 前端上传组件 | `src/components/upload/FileUpload.tsx` | 文件上传组件 |

### API设计

```typescript
// 上传文件
POST /api/storage/upload
Body: multipart/form-data

// 获取文件URL
GET /api/storage/:fileId/url

// 删除文件
DELETE /api/storage/:fileId
```

---

## Phase 7.5: API网关与安全

### 安全措施

| 措施 | 描述 |
|------|------|
| API限流 | 防止滥用，每用户每分钟限制请求次数 |
| CORS配置 | 限制跨域请求来源 |
| 输入验证 | 所有输入参数验证 |
| SQL注入防护 | 使用参数化查询 |
| XSS防护 | 输出内容转义 |
| CSRF防护 | Token验证 |

### 实现任务

| 任务 | 文件 | 描述 |
|------|------|------|
| API限流中间件 | `src/backend/middleware/rateLimit.ts` | 请求限流 |
| 输入验证中间件 | `src/backend/middleware/validation.ts` | 参数验证 |
| CORS配置 | `src/backend/middleware/cors.ts` | 跨域配置 |
| 安全头配置 | `src/backend/middleware/security.ts` | 安全响应头 |
| 日志中间件 | `src/backend/middleware/logger.ts` | 请求日志 |
| 错误处理中间件 | `src/backend/middleware/errorHandler.ts` | 统一错误处理 |

---

## Phase 7.6: 监控与运维

### 监控指标

| 类型 | 指标 |
|------|------|
| 应用监控 | CPU/内存/响应时间/错误率 |
| 数据库监控 | 连接数/查询时间/慢查询 |
| 支付监控 | 成功率/失败原因/退款率 |
| 用户监控 | 活跃用户/注册转化/留存率 |

### 实现任务

| 任务 | 文件 | 描述 |
|------|------|------|
| 健康检查API | `src/backend/routes/health.ts` | 服务健康状态 |
| 监控数据收集 | `src/backend/monitoring/collector.ts` | 指标收集 |
| 日志聚合 | `src/backend/monitoring/logger.ts` | 结构化日志 |
| 告警配置 | `src/backend/monitoring/alerts.ts` | 异常告警 |

---

## 时间规划

| Phase | 预计时间 | 优先级 |
|-------|----------|--------|
| Phase 7.1 数据库集成 | 2周 | 高 |
| Phase 7.2 支付集成 | 1周 | 高 |
| Phase 7.3 OAuth认证 | 1周 | 高 |
| Phase 7.4 云存储 | 1周 | 中 |
| Phase 7.5 API安全 | 1周 | 高 |
| Phase 7.6 监控运维 | 1周 | 中 |

**总计**: 约7周

---

## 依赖清单

### 新增npm包

```json
{
  "dependencies": {
    "pg": "^8.x",
    "ioredis": "^5.x",
    "mongodb": "^6.x",
    "stripe": "^14.x",
    "jsonwebtoken": "^9.x",
    "bcryptjs": "^2.x",
    "@aws-sdk/client-s3": "^3.x",
    "ali-oss": "^6.x"
  },
  "devDependencies": {
    "@types/pg": "^8.x",
    "@types/bcryptjs": "^2.x"
  }
}
```

---

**规划日期**: 2026-04-21
**规划版本**: v1.0.0