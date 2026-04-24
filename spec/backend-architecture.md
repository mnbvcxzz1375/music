# 后端架构设计文档

## 文档信息

| 项目 | 内容 |
|------|------|
| 文档版本 | v1.0 |
| 创建日期 | 2026-04-14 |
| 关联Spec | music-practice-app-refactor/spec.md |
| 责任人 | 后端工程师A |

---

## 1. 技术栈选型

### 1.1 核心框架

| 层级 | 技术选型 | 版本 | 说明 |
|------|----------|------|------|
| 运行环境 | Node.js | 18.x LTS | 稳定版本，长期支持 |
| Web框架 | Fastify | 4.x | 高性能，内置JSON Schema验证 |
| ORM | Prisma | 5.x | 类型安全，自动生成客户端 |
| 缓存 | Redis | 7.x | 高性能缓存，支持持久化 |
| 数据库 | PostgreSQL | 15.x | 主数据库，支持JSONB |

### 1.2 辅助工具

| 工具 | 用途 | 说明 |
|------|------|------|
| TypeScript | 类型系统 | 严格模式，类型安全 |
| Zod | Schema验证 | API输入验证 |
| JWT | 认证令牌 | RS256签名 |
| Swagger/OpenAPI | API文档 | 自动生成 |
| Sentry | 监控告警 | 错误追踪 |
| PM2 | 进程管理 | 生产环境部署 |

---

## 2. 数据库设计

### 2.1 表结构定义

#### 2.1.1 用户表 (users)

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20) UNIQUE,
  password_hash VARCHAR(255),
  nickname VARCHAR(100),
  avatar_url TEXT,
  instrument_type VARCHAR(50),
  level VARCHAR(20) DEFAULT 'beginner',
  subscription_status VARCHAR(20) DEFAULT 'free',
  subscription_id UUID REFERENCES subscriptions(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP,
  settings JSONB DEFAULT '{}'
);

COMMENT ON TABLE users IS '用户基础信息表';
COMMENT ON COLUMN users.instrument_type IS '乐器类型：piano, guitar, violin等';
COMMENT ON COLUMN users.level IS '用户等级：beginner, intermediate, advanced, professional';
COMMENT ON COLUMN users.subscription_status IS '订阅状态：free, active, expired, cancelled';
```

#### 2.1.2 曲目表 (pieces)

```sql
CREATE TABLE pieces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  composer VARCHAR(255),
  difficulty INTEGER CHECK (difficulty BETWEEN 1 AND 10),
  instrument_types JSONB,
  genres JSONB,
  duration_seconds INTEGER,
  musicxml_url TEXT NOT NULL,
  audio_demo_url TEXT,
  tags JSONB,
  is_official BOOLEAN DEFAULT FALSE,
  is_premium BOOLEAN DEFAULT FALSE,
  play_count INTEGER DEFAULT 0,
  favorite_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE pieces IS '曲目库表';
COMMENT ON COLUMN pieces.difficulty IS '难度等级：1-10';
COMMENT ON COLUMN pieces.is_official IS '是否为官方曲目';
COMMENT ON COLUMN pieces.is_premium IS '是否为付费曲目';
```

#### 2.1.3 练习记录表 (practice_sessions)

```sql
CREATE TABLE practice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  piece_id UUID REFERENCES pieces(id) NOT NULL,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  duration_seconds INTEGER,
  total_notes INTEGER,
  correct_notes INTEGER,
  accuracy DECIMAL(5,2),
  pitch_errors INTEGER,
  rhythm_errors INTEGER,
  retries INTEGER,
  average_pitch_deviation INTEGER,
  average_timing_deviation INTEGER,
  errors JSONB,
  settings JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE practice_sessions IS '练习记录表';
COMMENT ON COLUMN practice_sessions.accuracy IS '准确率百分比';
COMMENT ON COLUMN practice_sessions.errors IS '错误详情JSON数组';
```

#### 2.1.4 订阅表 (subscriptions)

```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  plan_type VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP,
  auto_renew BOOLEAN DEFAULT TRUE,
  payment_provider VARCHAR(50),
  payment_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  stripe_customer_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE subscriptions IS '订阅记录表';
COMMENT ON COLUMN subscriptions.plan_type IS '订阅类型：monthly, yearly';
COMMENT ON COLUMN subscriptions.status IS '订阅状态：active, expired, cancelled, pending';
COMMENT ON COLUMN subscriptions.payment_provider IS '支付渠道：stripe, alipay, wechat';
```

#### 2.1.5 成就表 (achievements)

```sql
CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  achievement_type VARCHAR(50) NOT NULL,
  achievement_id VARCHAR(50) NOT NULL,
  unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB,
  UNIQUE(user_id, achievement_id)
);

COMMENT ON TABLE achievements IS '成就解锁记录表';
COMMENT ON COLUMN achievements.achievement_type IS '成就类型：practice, streak, mastery等';
```

#### 2.1.6 Refresh Token表 (refresh_tokens)

```sql
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  token_id VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  is_revoked BOOLEAN DEFAULT FALSE,
  revoked_at TIMESTAMP,
  device_info JSONB
);

COMMENT ON TABLE refresh_tokens IS 'Refresh Token存储表';
COMMENT ON COLUMN refresh_tokens.is_revoked IS '是否已撤销';
```

### 2.2 索引策略

#### 2.2.1 基础索引

```sql
-- 用户表索引
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_subscription_status ON users(subscription_status);

-- 曲目表索引
CREATE INDEX idx_pieces_user_id ON pieces(user_id);
CREATE INDEX idx_pieces_difficulty ON pieces(difficulty);
CREATE INDEX idx_pieces_difficulty_genre ON pieces(difficulty, genres);
CREATE INDEX idx_pieces_is_official ON pieces(is_official);

-- 练习记录表索引
CREATE INDEX idx_practice_sessions_user_id ON practice_sessions(user_id);
CREATE INDEX idx_practice_sessions_piece_id ON practice_sessions(piece_id);
CREATE INDEX idx_practice_sessions_start_time ON practice_sessions(start_time);
CREATE INDEX idx_practice_sessions_accuracy ON practice_sessions(accuracy);

-- 订阅表索引
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- 成就表索引
CREATE INDEX idx_achievements_user_id ON achievements(user_id);

-- Refresh Token表索引
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token_id ON refresh_tokens(token_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
```

#### 2.2.2 复合索引（高频查询优化）

```sql
-- 用户订阅状态查询
CREATE INDEX idx_users_subscription_composite ON users(subscription_status, subscription_id);

-- 练习统计查询（用户+时间范围）
CREATE INDEX idx_practice_sessions_stats ON practice_sessions(user_id, start_time DESC);

-- 曲目搜索（难度+类型）
CREATE INDEX idx_pieces_search ON pieces(difficulty, instrument_types, is_official);
```

---

## 3. Redis缓存策略

### 3.1 缓存键设计

| 缓存数据 | 缓存键格式 | 过期时间 | 说明 |
|----------|------------|----------|------|
| 用户信息 | `user:{id}` | 30分钟 | 登录后缓存完整用户信息 |
| 用户权限 | `user:perms:{id}` | 15分钟 | 订阅状态和权限列表 |
| 曲目详情 | `piece:{id}` | 1小时 | 高频访问曲目 |
| 曲目列表 | `pieces:list:{filter_hash}` | 5分钟 | 搜索结果缓存 |
| 订阅状态 | `subscription:{user_id}` | 15分钟 | 权限检查缓存 |
| 练习统计 | `stats:{user_id}:{date}` | 10分钟 | 当日统计缓存 |
| Refresh Token | `rt:{token_id}` | 7天 | Token有效性检查 |

### 3.2 缓存更新策略

```typescript
// 缓存更新模式
enum CacheUpdateStrategy {
  WRITE_THROUGH = 'write_through',  // 写入时同步更新缓存
  WRITE_BEHIND = 'write_behind',    // 写入后异步更新缓存
  REFRESH_ON_READ = 'refresh_on_read', // 读取时刷新
}

// 缓存失效策略
const cacheInvalidationRules = {
  user: {
    onUpdate: ['user:{id}', 'user:perms:{id}'],
    onSubscriptionChange: ['subscription:{user_id}', 'user:perms:{id}'],
  },
  piece: {
    onUpdate: ['piece:{id}'],
    onDelete: ['piece:{id}', 'pieces:list:*'],
  },
  practice: {
    onSessionEnd: ['stats:{user_id}:{date}'],
  },
};
```

---

## 4. API错误码规范

### 4.1 错误码定义

```typescript
enum ErrorCode {
  // 认证错误 4xxx
  UNAUTHORIZED = 4001,
  TOKEN_EXPIRED = 4002,
  TOKEN_INVALID = 4003,
  REFRESH_TOKEN_REVOKED = 4004,
  OAUTH_FAILED = 4005,
  
  // 业务错误 5xxx
  PIECE_NOT_FOUND = 5001,
  PIECE_PARSE_FAILED = 5002,
  SUBSCRIPTION_EXPIRED = 5003,
  SUBSCRIPTION_NOT_ACTIVE = 5004,
  OCR_CONFIDENCE_TOO_LOW = 5005,
  PRACTICE_SESSION_NOT_FOUND = 5006,
  ACHIEVEMENT_ALREADY_UNLOCKED = 5007,
  
  // 权限错误 51xx
  FEATURE_NOT_AVAILABLE = 5101,
  PREMIUM_REQUIRED = 5102,
  
  // 系统错误 6xxx
  DATABASE_ERROR = 6001,
  EXTERNAL_SERVICE_ERROR = 6002,
  OCR_SERVICE_UNAVAILABLE = 6003,
  PAYMENT_SERVICE_ERROR = 6004,
  RATE_LIMIT_EXCEEDED = 6005,
}
```

### 4.2 错误响应格式

```typescript
interface APIErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
    timestamp: number;
    requestId: string;
  };
}

// HTTP状态码映射
const errorCodeToHttpStatus: Record<ErrorCode, number> = {
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.TOKEN_EXPIRED]: 401,
  [ErrorCode.TOKEN_INVALID]: 401,
  [ErrorCode.PIECE_NOT_FOUND]: 404,
  [ErrorCode.SUBSCRIPTION_EXPIRED]: 403,
  [ErrorCode.FEATURE_NOT_AVAILABLE]: 403,
  [ErrorCode.RATE_LIMIT_EXCEEDED]: 429,
  [ErrorCode.DATABASE_ERROR]: 500,
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: 503,
};
```

---

## 5. 服务架构

### 5.1 模块划分

```
src/
├── modules/
│   ├── auth/           # 认证模块
│   │   ├── jwt.service.ts
│   │   ├── oauth.service.ts
│   │   └── refresh-token.service.ts
│   ├── user/           # 用户模块
│   │   ├── user.service.ts
│   │   ├── user.controller.ts
│   ├── piece/          # 曲目模块
│   │   ├── piece.service.ts
│   │   ├── piece.controller.ts
│   │   ├── parser.service.ts
│   ├── practice/       # 练习模块
│   │   ├── session.service.ts
│   │   ├── stats.service.ts
│   ├── subscription/   # 订阅模块
│   │   ├── subscription.service.ts
│   │   ├── stripe.service.ts
│   ├── achievement/    # 成就模块
│   │   ├── achievement.service.ts
│   ├── ocr/            # OCR模块
│   │   ├── ocr.service.ts
│   │   ├── image-processor.service.ts
│
├── middleware/
│   ├── auth.middleware.ts
│   ├── rate-limit.middleware.ts
│   ├── error-handler.middleware.ts
│
├── utils/
│   ├── cache.util.ts
│   ├── logger.util.ts
│   ├── validator.util.ts
│
├── config/
│   ├── database.config.ts
│   ├── redis.config.ts
│   ├── jwt.config.ts
│
├── app.ts
└── server.ts
```

### 5.2 API路由设计

```typescript
// API路由结构
const routes = {
  '/api/v1': {
    '/auth': {
      POST: {
        '/login': '登录',
        '/logout': '登出',
        '/refresh': '刷新Token',
        '/oauth/:provider': 'OAuth登录',
      },
      POST: {
        '/register': '注册',
      },
    },
    '/users': {
      GET: {
        '/me': '获取当前用户信息',
        '/me/settings': '获取用户设置',
      },
      PUT: {
        '/me': '更新用户信息',
        '/me/settings': '更新用户设置',
      },
    },
    '/pieces': {
      GET: {
        '/': '获取曲目列表',
        '/:id': '获取曲目详情',
        '/search': '搜索曲目',
      },
      POST: {
        '/': '上传曲目',
        '/ocr': 'OCR导入',
      },
      PUT: {
        '/:id': '更新曲目',
      },
      DELETE: {
        '/:id': '删除曲目',
      },
    },
    '/practice': {
      GET: {
        '/sessions': '获取练习记录列表',
        '/sessions/:id': '获取练习记录详情',
        '/stats': '获取统计数据',
      },
      POST: {
        '/sessions': '创建练习记录',
        '/sessions/:id/end': '结束练习',
      },
      GET: {
        '/report': '导出报告',
      },
    },
    '/subscriptions': {
      GET: {
        '/': '获取订阅状态',
        '/plans': '获取订阅方案',
      },
      POST: {
        '/checkout': '创建订阅',
        '/cancel': '取消订阅',
      },
    },
    '/achievements': {
      GET: {
        '/': '获取成就列表',
        '/:id': '获取成就详情',
      },
    },
  },
};
```

---

## 6. 认证方案

### 6.1 JWT双令牌机制

```typescript
interface TokenPayload {
  userId: string;
  email: string;
  subscriptionStatus: string;
  permissions: string[];
  iat: number;
  exp: number;
}

interface JWTConfig {
  accessToken: {
    algorithm: 'RS256';
    expiresIn: '15m';
    issuer: 'music-practice-app';
  };
  refreshToken: {
    algorithm: 'RS256';
    expiresIn: '7d';
    issuer: 'music-practice-app';
  };
}

// Token生成
const generateTokens = async (user: User) => {
  const accessToken = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      subscriptionStatus: user.subscriptionStatus,
      permissions: getPermissions(user),
    },
    privateKey,
    { algorithm: 'RS256', expiresIn: '15m' }
  );
  
  const refreshTokenId = uuidv4();
  const refreshToken = jwt.sign(
    { userId: user.id, tokenId: refreshTokenId },
    privateKey,
    { algorithm: 'RS256', expiresIn: '7d' }
  );
  
  // 存储Refresh Token到Redis
  await redis.set(`rt:${refreshTokenId}`, JSON.stringify({
    userId: user.id,
    createdAt: Date.now(),
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
  }), 'EX', 7 * 24 * 60 * 60);
  
  return { accessToken, refreshToken };
};
```

### 6.2 Token刷新流程

```typescript
const refreshTokens = async (refreshToken: string) => {
  // 1. 验证Refresh Token
  const decoded = jwt.verify(refreshToken, publicKey, { algorithms: ['RS256'] });
  
  // 2. 检查Redis中是否存在且未撤销
  const tokenData = await redis.get(`rt:${decoded.tokenId}`);
  if (!tokenData || tokenData.isRevoked) {
    throw new Error(ErrorCode.REFRESH_TOKEN_REVOKED);
  }
  
  // 3. 获取用户信息
  const user = await userService.getById(decoded.userId);
  
  // 4. 生成新的Access Token
  const newAccessToken = generateAccessToken(user);
  
  // 5. 可选：滚动刷新（生成新的Refresh Token）
  const newRefreshToken = await generateRefreshToken(user);
  
  // 6. 撤销旧的Refresh Token
  await redis.del(`rt:${decoded.tokenId}`);
  
  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
};
```

### 6.3 Token撤销方案

```typescript
// 登出时撤销
const logout = async (refreshToken: string) => {
  const decoded = jwt.verify(refreshToken, publicKey);
  await redis.del(`rt:${decoded.tokenId}`);
};

// 异常检测时撤销所有Token
const revokeAllTokens = async (userId: string) => {
  const tokens = await redis.keys(`rt:*`);
  for (const key of tokens) {
    const data = await redis.get(key);
    if (data.userId === userId) {
      await redis.del(key);
    }
  }
};

// 密码修改时撤销
const onPasswordChange = async (userId: string) => {
  await revokeAllTokens(userId);
};
```

---

## 7. 部署架构

### 7.1 生产环境架构

```
┌─────────────────────────────────────────────────────────────┐
│                      Load Balancer (Nginx)                   │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│  API Server │ │  API Server │ │  API Server │
│   (Node.js) │ │   (Node.js) │ │   (Node.js) │
│    PM2      │ │    PM2      │ │    PM2      │
└─────────────┘ └─────────────┘ └─────────────┘
              │               │               │
              └───────────────┼───────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    PostgreSQL (Primary + Replica)            │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                         Redis Cluster                        │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 Docker配置

```yaml
# docker-compose.yml
version: '3.8'
services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
    depends_on:
      - postgres
      - redis
    
  postgres:
    image: postgres:15
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=music_practice
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    
  redis:
    image: redis:7
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes

volumes:
  postgres_data:
  redis_data:
```

---

## 8. 监控与日志

### 8.1 监控指标

| 指标类型 | 指标名称 | 阈值 | 告警级别 |
|----------|----------|------|----------|
| 性能 | API响应时间 | >200ms | Warning |
| 性能 | API响应时间 | >500ms | Critical |
| 错误率 | 5xx错误率 | >1% | Warning |
| 错误率 | 5xx错误率 | >5% | Critical |
| 资源 | CPU使用率 | >80% | Warning |
| 资源 | 内存使用率 | >85% | Warning |
| 数据库 | 连接数 | >80% | Warning |
| Redis | 内存使用率 | >90% | Critical |

### 8.2 日志格式

```typescript
interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  service: string;
  requestId: string;
  userId?: string;
  action: string;
  duration?: number;
  error?: {
    code: ErrorCode;
    message: string;
    stack?: string;
  };
  metadata?: Record<string, unknown>;
}
```

---

## 9. 安全措施

### 9.1 数据安全

| 数据类型 | 安全措施 | 说明 |
|----------|----------|------|
| 密码 | bcrypt (cost=12) | 哈希存储 |
| 个人信息 | AES-256-GCM | 加密存储 |
| 传输 | TLS 1.3 | 强制加密 |
| Token | RS256签名 | 非对称加密 |

### 9.2 API安全

```typescript
// Rate Limiting配置
const rateLimitConfig = {
  global: {
    max: 1000,
    timeWindow: '1 minute',
  },
  auth: {
    max: 10,
    timeWindow: '1 minute',
  },
  api: {
    max: 100,
    timeWindow: '1 minute',
  },
};

// CORS配置
const corsConfig = {
  origin: ['https://app.example.com', 'https://www.example.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};
```

---

## 10. 版本规划

| 版本 | 功能范围 | 预计完成 |
|------|----------|----------|
| v1.0 | 用户认证、曲目管理、练习记录 | 2026-Q2 W2 |
| v1.5 | 订阅系统、OCR服务 | 2026-Q3 |
| v2.0 | 社交功能、成就系统 | 2026-Q4 |

---

*文档结束*