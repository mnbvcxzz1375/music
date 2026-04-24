# 安全合规规范

## 文档信息

| 项目 | 内容 |
|------|------|
| 文档版本 | v1.0 |
| 创建日期 | 2026-04-15 |
| 适用范围 | Resonance 音乐练习应用 |

---

## 1. 安全评估概览

### 1.1 安全等级分类

| 等级 | 描述 | 适用数据 |
|------|------|----------|
| L1-公开 | 无敏感信息，可公开访问 | 乐谱元数据、公开曲目 |
| L2-内部 | 用户个人数据，需认证访问 | 练习记录、设置偏好 |
| L3-敏感 | 需加密存储和传输 | 用户身份信息、支付数据 |
| L4-核心 | 最高安全级别 | 密钥、API凭证、审计日志 |

### 1.2 数据分类清单

| 数据类型 | 安全等级 | 存储位置 | 加密要求 |
|----------|----------|----------|----------|
| 乐谱文件(MusicXML) | L1 | 本地/云端 | 无需加密 |
| 用户练习记录 | L2 | 本地localStorage | 无需加密 |
| 用户设置偏好 | L2 | 本地localStorage | 无需加密 |
| 用户邮箱/手机号 | L3 | 云端数据库 | AES-256加密 |
| 用户密码 | L3 | 云端数据库 | bcrypt哈希 |
| 支付信息 | L3 | 第三方支付平台 | PCI-DSS合规 |
| API密钥 | L4 | 环境变量 | 禁止硬编码 |
| 访问令牌 | L3 | 内存/sessionStorage | JWT签名 |

---

## 2. 前端安全措施

### 2.1 XSS防护

```typescript
// 禁止直接使用 innerHTML
// 使用 React 的 JSX 自动转义

// 如需渲染富文本，使用 DOMPurify
import DOMPurify from 'dompurify';

const sanitizeHTML = (html: string): string => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'span'],
    ALLOWED_ATTR: ['class'],
  });
};
```

### 2.2 CSRF防护

```typescript
// 使用 SameSite Cookie 属性
// API请求携带 CSRF Token

interface CSRFConfig {
  headerName: 'X-CSRF-Token';
  cookieName: 'csrf-token';
  tokenLength: 32;
}
```

### 2.3 输入验证

```typescript
// 所有用户输入必须验证
const validateInput = {
  email: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
  phone: (value: string) => /^1[3-9]\d{9}$/.test(value),
  password: (value: string) => value.length >= 8 && /[A-Z]/.test(value) && /[a-z]/.test(value) && /\d/.test(value),
  musicXml: (value: string) => value.includes('<score-partwise') || value.includes('<score-timewise'),
};
```

### 2.4 安全存储

```typescript
// localStorage 安全使用规范
const SecureStorage = {
  // 禁止存储敏感数据
  FORBIDDEN_KEYS: ['password', 'token', 'secret', 'apiKey'],
  
  // 允许存储的数据
  ALLOWED_KEYS: ['settings', 'theme', 'calibration', 'practiceHistory'],
  
  // 存储前检查
  setItem(key: string, value: string): void {
    if (this.FORBIDDEN_KEYS.some(k => key.toLowerCase().includes(k))) {
      throw new Error(`Forbidden storage key: ${key}`);
    }
    localStorage.setItem(key, value);
  },
};
```

---

## 3. API安全规范

### 3.1 认证机制

```typescript
// JWT Token 配置
interface JWTConfig {
  algorithm: 'RS256';
  accessTokenExpiry: '15m';
  refreshTokenExpiry: '7d';
  issuer: 'resonance-app';
}

// Token 存储：内存优先，sessionStorage 备用
// 禁止 localStorage 存储 Token
```

### 3.2 请求安全

```typescript
// API请求安全配置
interface APISecurityConfig {
  // 必须使用 HTTPS
  baseURL: 'https://api.resonance.app';
  
  // 请求超时
  timeout: 30000;
  
  // 重试限制
  maxRetries: 3;
  
  // 必须携带认证头
  headers: {
    'Authorization': 'Bearer <token>';
    'Content-Type': 'application/json';
    'X-Request-ID': '<uuid>';
  };
}
```

### 3.3 错误处理

```typescript
// 安全的错误处理
const handleAPIError = (error: unknown): string => {
  // 不暴露内部错误详情
  if (error instanceof Error) {
    // 仅返回用户友好消息
    const safeMessages: Record<string, string> = {
      'NETWORK_ERROR': '网络连接失败，请检查网络',
      'AUTH_FAILED': '登录已过期，请重新登录',
      'PERMISSION_DENIED': '无权限执行此操作',
      'VALIDATION_ERROR': '输入数据格式错误',
    };
    return safeMessages[error.message] || '操作失败，请稍后重试';
  }
  return '未知错误';
};
```

---

## 4. 音频数据安全

### 4.1 麦克风权限

```typescript
// 麦克风权限请求规范
const requestMicrophone = async (): Promise<MediaStream | null> => {
  try {
    // 明确告知用户用途
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    
    // 仅用于实时检测，不存储原始音频
    return stream;
  } catch (error) {
    // 用户拒绝权限时优雅处理
    console.warn('Microphone permission denied');
    return null;
  }
};
```

### 4.2 音频数据处理

```typescript
// 音频数据安全处理
const AudioDataSecurity = {
  // 禁止存储原始音频数据
  storeRawAudio: false,
  
  // 仅存储检测结果（频率、偏差）
  storeDetectionResults: true,
  
  // 音频缓冲区自动清理
  clearBufferAfterDetection: true,
  
  // 禁止音频数据导出
  allowExport: false,
};
```

---

## 5. 第三方服务安全

### 5.1 OSMD集成

```typescript
// OSMD 安全配置
const OSMDSecurity = {
  // 仅加载可信来源的 MusicXML
  allowedSources: ['local', 'verified-library'],
  
  // 禁止加载外部资源
  disableExternalResources: true,
  
  // SVG 渲染安全
  sanitizeSVG: true,
};
```

### 5.2 支付集成

```typescript
// 支付安全规范
const PaymentSecurity = {
  // 使用 Stripe/支付宝 官方SDK
  provider: 'stripe' | 'alipay',
  
  // 禁止在前端处理支付凭证
  handleCredentialsOnFrontend: false,
  
  // 支付结果验证
  verifyPaymentOnServer: true,
  
  // PCI-DSS 合规
  pciCompliant: true,
};
```

---

## 6. 合规要求

### 6.1 GDPR合规（欧盟用户）

| 要求 | 实现状态 |
|------|----------|
| 用户知情权 | ✅ 隐私政策页面 |
| 用户同意权 | ✅ Cookie同意弹窗 |
| 用户访问权 | ✅ 数据导出功能 |
| 用户删除权 | ✅ 账号注销功能 |
| 数据最小化 | ✅ 仅收集必要数据 |
| 数据加密 | ✅ 传输层加密 |

### 6.2 中国网络安全合规

| 要求 | 实现状态 |
|------|----------|
| 实名认证 | ⏳ 手机号验证 |
| 数据本地化 | ✅ 中国服务器部署 |
| 隐私政策 | ✅ 隐私政策页面 |
| 用户协议 | ✅ 用户协议页面 |
| 数据安全评估 | ⏳ 定期评估 |

### 6.3 儿童隐私保护

```typescript
// COPPA合规（14岁以下用户）
const COPPACompliance = {
  // 年龄验证
  requireAgeVerification: true,
  minimumAge: 14,
  
  // 家长同意
  requireParentalConsent: true,
  
  // 限制数据收集
  limitedDataCollection: true,
  
  // 禁止广告追踪
  disableAdTracking: true,
};
```

---

## 7. 安全审计

### 7.1 定期审计清单

| 审计项 | 频率 | 负责人 |
|--------|------|--------|
| 代码安全扫描 | 每次提交 | CI/CD |
| 依赖漏洞检查 | 每周 | 自动化 |
| 权限配置审计 | 每月 | 安全团队 |
| 渗透测试 | 每季度 | 第三方 |
| 数据访问审计 | 每月 | 安全团队 |

### 7.2 安全事件响应

```typescript
// 安全事件分级
const SecurityIncidentLevel = {
  P1_CRITICAL: '数据泄露、系统入侵',
  P2_HIGH: '未授权访问、权限绕过',
  P3_MEDIUM: '异常请求、可疑行为',
  P4_LOW: '配置错误、日志异常',
};

// 响应流程
const IncidentResponse = {
  P1: { notifyTime: '5min', responseTime: '30min' },
  P2: { notifyTime: '30min', responseTime: '2h' },
  P3: { notifyTime: '2h', responseTime: '24h' },
  P4: { notifyTime: '24h', responseTime: '72h' },
};
```

---

## 8. 安全配置清单

### 8.1 HTTP安全头

```nginx
# Nginx 安全配置
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';" always;
add_header Permissions-Policy "microphone=(self), camera=()" always;
```

### 8.2 Cookie安全

```typescript
// Cookie 安全配置
const CookieConfig = {
  sameSite: 'strict',
  secure: true,
  httpOnly: true,
  maxAge: 7 * 24 * 60 * 60, // 7天
};
```

---

## 9. 安全开发规范

### 9.1 代码规范

- 禁止硬编码密钥、密码、Token
- 禁止使用 `eval()`、`Function()` 动态执行代码
- 禁止直接使用 `innerHTML`、`outerHTML`
- 所有 API 调用必须验证响应
- 所有用户输入必须验证和清理

### 9.2 依赖管理

```json
// package.json 安全配置
{
  "scripts": {
    "audit": "npm audit",
    "audit:fix": "npm audit fix",
    "check:deps": "npm run audit && npx snyk test"
  }
}
```

---

*文档结束*