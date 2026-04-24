# API接口规范文档

## 文档信息

| 项目 | 内容 |
|------|------|
| 文档版本 | v1.0 |
| 创建日期 | 2026-04-14 |
| 关联Spec | music-practice-app-refactor/spec.md |
| 关联架构 | backend-architecture.md |

---

## 1. RESTful API规范定义

### 1.1 URL设计规范

```
基础URL: https://api.music-practice.app/api/v1

命名规则:
- 使用小写字母
- 使用连字符分隔单词
- 使用复数形式表示资源集合
- 避免深层嵌套（最多2层）

示例:
- /api/v1/users
- /api/v1/pieces
- /api/v1/practice-sessions
- /api/v1/subscriptions
- /api/v1/achievements
```

### 1.2 HTTP方法使用规范

| 方法 | 用途 | 示例 |
|------|------|------|
| GET | 获取资源 | GET /pieces 获取曲目列表 |
| POST | 创建资源 | POST /pieces 创建新曲目 |
| PUT | 更新资源 | PUT /pieces/:id 更新曲目 |
| DELETE | 删除资源 | DELETE /pieces/:id 删除曲目 |
| PATCH | 部分更新 | PATCH /users/me/settings |

### 1.3 查询参数规范

```typescript
// 分页参数
interface PaginationParams {
  page?: number;      // 页码，默认1
  limit?: number;     // 每页数量，默认20，最大100
  offset?: number;    // 偏移量，可选
}

// 排序参数
interface SortParams {
  sort_by?: string;   // 排序字段
  order?: 'asc' | 'desc'; // 排序方向
}

// 过滤参数
interface FilterParams {
  filter?: string;    // 过滤条件JSON
  q?: string;         // 搜索关键词
}

// 示例请求
GET /api/v1/pieces?page=1&limit=20&sort_by=created_at&order=desc&filter={"difficulty":5}
```

---

## 2. OpenAPI 3.0规范文档结构

```yaml
openapi: 3.0.3
info:
  title: Music Practice App API
  description: 音乐练习应用后端API接口文档
  version: 1.0.0
  contact:
    name: API Support
    email: api@music-practice.app

servers:
  - url: https://api.music-practice.app/api/v1
    description: Production server
  - url: https://staging-api.music-practice.app/api/v1
    description: Staging server

security:
  - bearerAuth: []

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
  
  schemas:
    User:
      type: object
      properties:
        id:
          type: string
          format: uuid
        email:
          type: string
          format: email
        nickname:
          type: string
        subscriptionStatus:
          type: string
          enum: [free, active, expired, cancelled]
    
    Piece:
      type: object
      properties:
        id:
          type: string
          format: uuid
        title:
          type: string
        composer:
          type: string
        difficulty:
          type: integer
          minimum: 1
          maximum: 10
        musicxmlUrl:
          type: string
    
    PracticeSession:
      type: object
      properties:
        id:
          type: string
          format: uuid
        userId:
          type: string
        pieceId:
          type: string
        startTime:
          type: string
          format: date-time
        accuracy:
          type: number
    
    Error:
      type: object
      properties:
        success:
          type: boolean
          example: false
        error:
          type: object
          properties:
            code:
              type: integer
            message:
              type: string
            timestamp:
              type: integer
            requestId:
              type: string
```

---

## 3. Swagger文档生成说明

```typescript
// Fastify Swagger配置
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';

app.register(fastifySwagger, {
  swagger: {
    info: {
      title: 'Music Practice App API',
      version: '1.0.0',
    },
    securityDefinitions: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
});

app.register(fastifySwaggerUi, {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: true,
  },
});

// 路由注解示例
app.get('/pieces', {
  schema: {
    description: '获取曲目列表',
    tags: ['Pieces'],
    querystring: {
      type: 'object',
      properties: {
        page: { type: 'integer', default: 1 },
        limit: { type: 'integer', default: 20 },
      },
    },
    response: {
      200: {
        type: 'object',
        properties: {
          data: { type: 'array', items: { $ref: 'Piece#' } },
          pagination: { $ref: 'Pagination#' },
        },
      },
    },
  },
}, getPiecesHandler);

// 文档访问地址
// Production: https://api.music-practice.app/docs
// Staging: https://staging-api.music-practice.app/docs
```

---

## 4. API版本管理策略

### 4.1 版本生命周期

| 状态 | 说明 | 持续时间 |
|------|------|----------|
| Current | 当前活跃版本 | - |
| Deprecated | 已弃用但仍可用 | 6个月 |
| Sunset | 即将停用 | 3个月 |
| Retired | 已停用 | - |

### 4.2 弃用通知头

```typescript
// 弃用API响应头
headers: {
  'X-API-Version': '1.0.0';
  'X-API-Deprecated': 'true';
  'X-API-Sunset': '2026-12-31';
  'Link': '</api/v2/pieces>; rel="successor-version"';
}
```

### 4.3 版本兼容性规则

```typescript
// 兼容性规则
const compatibilityRules = {
  // 允许的变更（向后兼容）
  allowed: [
    '添加新的可选参数',
    '添加新的响应字段',
    '添加新的API端点',
    '添加新的错误码',
  ],
  
  // 禁止的变更（破坏兼容性）
  forbidden: [
    '删除API端点',
    '删除请求/响应字段',
    '修改字段类型',
    '修改必填参数',
    '修改错误码含义',
  ],
};
```

---

## 5. API端点定义

### 5.1 认证模块 (Auth)

| 端点 | 方法 | 说明 | 认证 |
|------|------|------|------|
| /auth/register | POST | 用户注册 | 无 |
| /auth/login | POST | 用户登录 | 无 |
| /auth/logout | POST | 用户登出 | 需要 |
| /auth/refresh | POST | 刷新Token | 需要 |
| /auth/oauth/:provider | POST | OAuth登录 | 无 |

### 5.2 用户模块 (Users)

| 端点 | 方法 | 说明 | 认证 |
|------|------|------|------|
| /users/me | GET | 获取当前用户信息 | 需要 |
| /users/me | PUT | 更新用户信息 | 需要 |
| /users/me/settings | GET | 获取用户设置 | 需要 |
| /users/me/settings | PUT | 更新用户设置 | 需要 |

### 5.3 曲目模块 (Pieces)

| 端点 | 方法 | 说明 | 认证 |
|------|------|------|------|
| /pieces | GET | 获取曲目列表 | 可选 |
| /pieces | POST | 上传曲目 | 需要 |
| /pieces/:id | GET | 获取曲目详情 | 可选 |
| /pieces/:id | PUT | 更新曲目 | 需要 |
| /pieces/:id | DELETE | 删除曲目 | 需要 |
| /pieces/search | GET | 搜索曲目 | 可选 |
| /pieces/ocr | POST | OCR导入 | 需要 |
| /pieces/:id/favorite | POST | 收藏曲目 | 需要 |
| /pieces/:id/favorite | DELETE | 取消收藏 | 需要 |

### 5.4 练习模块 (Practice)

| 端点 | 方法 | 说明 | 认证 |
|------|------|------|------|
| /practice/sessions | GET | 获取练习记录列表 | 需要 |
| /practice/sessions | POST | 创建练习记录 | 需要 |
| /practice/sessions/:id | GET | 获取练习记录详情 | 需要 |
| /practice/sessions/:id/end | POST | 结束练习 | 需要 |
| /practice/stats | GET | 获取统计数据 | 需要 |
| /practice/report | GET | 导出报告 | 需要 |

### 5.5 订阅模块 (Subscriptions)

| 端点 | 方法 | 说明 | 认证 |
|------|------|------|------|
| /subscriptions | GET | 获取订阅状态 | 需要 |
| /subscriptions/plans | GET | 获取订阅方案 | 无 |
| /subscriptions/checkout | POST | 创建订阅 | 需要 |
| /subscriptions/cancel | POST | 取消订阅 | 需要 |

### 5.6 成就模块 (Achievements)

| 端点 | 方法 | 说明 | 认证 |
|------|------|------|------|
| /achievements | GET | 获取成就列表 | 需要 |
| /achievements/:id | GET | 获取成就详情 | 需要 |
| /achievements/unlock | POST | 解锁成就 | 需要 |

---

## 6. 请求/响应格式规范

### 6.1 请求头规范

```typescript
const requiredHeaders = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'Authorization': 'Bearer <token>', // 需认证的端点
  'X-Request-ID': '<uuid>', // 请求追踪ID
  'X-Client-Version': '<version>', // 客户端版本
};
```

### 6.2 响应头规范

```typescript
const responseHeaders = {
  'Content-Type': 'application/json',
  'X-Request-ID': '<uuid>',
  'X-Response-Time': '<ms>',
  'X-RateLimit-Limit': '<limit>',
  'X-RateLimit-Remaining': '<remaining>',
  'X-RateLimit-Reset': '<timestamp>',
};
```

### 6.3 成功响应格式

```typescript
interface SuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    timestamp: number;
  };
}
```

### 6.4 错误响应格式

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
```

### 6.5 分页响应格式

```typescript
interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
```

---

## 7. 错误码定义

### 7.1 错误码分类

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

### 7.2 HTTP状态码映射

```typescript
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

### 7.3 国际化错误消息

```typescript
const errorMessages: Record<ErrorCode, Record<string, string>> = {
  [ErrorCode.UNAUTHORIZED]: {
    'en': 'Unauthorized access',
    'zh-CN': '未授权访问',
    'ja': '認証されていません',
    'ko': '인증되지 않았습니다',
  },
  [ErrorCode.TOKEN_EXPIRED]: {
    'en': 'Token has expired',
    'zh-CN': '令牌已过期',
    'ja': 'トークンの有効期限が切れています',
    'ko': '토큰이 만료되었습니다',
  },
  // ... 其他错误码
};
```

---

## 8. 认证机制说明

### 8.1 JWT双令牌机制

```typescript
// Access Token: 15分钟有效期
// Refresh Token: 7天有效期

interface TokenPayload {
  userId: string;
  email: string;
  subscriptionStatus: string;
  permissions: string[];
  iat: number;
  exp: number;
}

// 请求认证头
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 8.2 Token验证流程

```typescript
const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: { code: ErrorCode.UNAUTHORIZED, message: 'Missing authorization header' }
    });
  }
  
  const token = authHeader.substring(7);
  
  try {
    const payload = jwt.verify(token, publicKey, { algorithms: ['RS256'] });
    req.user = payload;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: { code: ErrorCode.TOKEN_EXPIRED, message: 'Token expired' }
      });
    }
    return res.status(401).json({
      success: false,
      error: { code: ErrorCode.TOKEN_INVALID, message: 'Invalid token' }
    });
  }
};
```

### 8.3 OAuth 2.0流程

```typescript
// OAuth登录流程
// 1. 前端重定向到OAuth提供商
// 2. 用户授权后返回code
// 3. 后端用code换取access_token
// 4. 获取用户信息并创建/关联账户
// 5. 返回JWT令牌

// 支持的OAuth提供商
const oauthProviders = ['google', 'apple', 'wechat'];
```

---

## 9. Rate Limiting策略

### 9.1 分级限制规则

| 级别 | 端点类型 | 限制 | 时间窗口 |
|------|----------|------|----------|
| 全局 | 所有API | 1000请求 | 1分钟 |
| 认证 | /auth/* | 10请求 | 1分钟 |
| API | /api/v1/* | 100请求 | 1分钟 |
| OCR | /pieces/ocr | 5请求 | 1分钟 |

### 9.2 Fastify插件配置

```typescript
import rateLimit from '@fastify/rate-limit';

app.register(rateLimit, {
  global: true,
  max: 1000,
  timeWindow: '1 minute',
  keyGenerator: (req) => req.ip,
  errorResponseBuilder: () => ({
    success: false,
    error: {
      code: ErrorCode.RATE_LIMIT_EXCEEDED,
      message: 'Rate limit exceeded',
    },
  }),
});

// 认证端点特殊限制
app.register(rateLimit, {
  max: 10,
  timeWindow: '1 minute',
}, { routePrefix: '/auth' });
```

### 9.3 响应头信息

```typescript
headers: {
  'X-RateLimit-Limit': 1000,
  'X-RateLimit-Remaining': 995,
  'X-RateLimit-Reset': 1713120000,
}
```

---

## 10. 测试用例

| 用例ID | 测试内容 | 测试方法 | 预期结果 |
|--------|----------|----------|----------|
| API-01 | 认证成功 | 有效Token访问 | 200响应 |
| API-02 | 认证失败 | 无Token访问 | 401响应 |
| API-03 | Token过期 | 过期Token访问 | 401响应 |
| API-04 | Rate Limit | 超限请求 | 429响应 |
| API-05 | 分页参数 | page=2&limit=10 | 正确分页 |
| API-06 | 错误码 | 触发业务错误 | 正确错误码 |

---

*文档结束*