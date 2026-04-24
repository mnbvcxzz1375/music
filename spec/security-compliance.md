# 安全评估与合规文档

## 文档信息

| 项目 | 内容 |
|------|------|
| 文档版本 | v1.0 |
| 创建日期 | 2026-04-14 |
| 关联Spec | music-practice-app-refactor/spec.md |
| 责任人 | 安全工程师 |

---

## 1. 用户数据安全方案

### 1.1 数据分类

| 数据类型 | 安全等级 | 存储方式 | 加密方式 |
|----------|----------|----------|----------|
| 密码 | 高 | 哈希存储 | bcrypt (cost=12) |
| 个人信息 | 高 | 加密存储 | AES-256-GCM |
| 练习记录 | 中 | 明文存储 | TLS传输加密 |
| 支付信息 | 高 | 不存储 | Stripe Token |
| 音频数据 | 低 | 本地处理 | 不上传服务器 |

### 1.2 密码安全实现

```typescript
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

const hashPassword = async (password: string): string => {
  if (password.length < 8) {
    throw new Error('密码长度至少8位');
  }
  
  if (!/[A-Z]/.test(password)) {
    throw new Error('密码需包含大写字母');
  }
  
  if (!/[a-z]/.test(password)) {
    throw new Error('密码需包含小写字母');
  }
  
  if (!/[0-9]/.test(password)) {
    throw new Error('密码需包含数字');
  }
  
  if (!/[!@#$%^&*]/.test(password)) {
    throw new Error('密码需包含特殊字符');
  }
  
  return bcrypt.hash(password, SALT_ROUNDS);
};

const verifyPassword = async (
  password: string,
  hashedPassword: string
): boolean => {
  return bcrypt.compare(password, hashedPassword);
};
```

### 1.3 个人信息加密实现

```typescript
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');

interface EncryptedData {
  encrypted: string;
  iv: string;
  authTag: string;
}

const encryptPersonalData = (data: string): EncryptedData => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
  };
};

const decryptPersonalData = (encryptedData: EncryptedData): string => {
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    KEY,
    Buffer.from(encryptedData.iv, 'hex')
  );
  
  decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
  
  
  let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
};
```

### 1.4 TLS 1.3传输加密

```typescript
const tlsConfig = {
  minVersion: 'TLSv1.3',
  ciphers: [
    'TLS_AES_256_GCM_SHA384',
    'TLS_CHACHA20_POLY1305_SHA256',
    'TLS_AES_128_GCM_SHA256',
  ],
  honorCipherOrder: true,
  secureOptions: crypto.constants.SSL_OP_NO_SSLv2 |
                 crypto.constants.SSL_OP_NO_SSLv3 |
                 crypto.constants.SSL_OP_NO_TLSv1 |
                 crypto.constants.SSL_OP_NO_TLSv1_1 |
                 crypto.constants.SSL_OP_NO_TLSv1_2,
};

const enforceHTTPS = (req: Request, res: Response, next: NextFunction) => {
  if (!req.secure && req.get('x-forwarded-proto') !== 'https') {
    return res.redirect(301, `https://${req.get('host')}${req.url}`);
  }
  next();
};

const securityHeaders = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'",
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};
```

---

## 2. 麦克风权限隐私政策

### 2.1 权限用途说明

```
麦克风权限使用声明

我们请求麦克风权限仅用于以下目的：
1. 实时检测您演奏的音准
2. 提供练习反馈和纠错建议

我们承诺：
- 音频数据仅在您的设备本地处理
- 音频数据不会上传到服务器
- 音频数据不会被存储或分享
- 您可以随时关闭麦克风权限

技术说明：
- 使用Web Audio API进行本地音频分析
- 仅提取音高频率信息，不录制完整音频
- 分析结果（音准偏差）可选择保存到您的练习记录
```

### 2.2 权限请求实现

```typescript
const requestMicrophonePermission = async (): PermissionResult => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });
    
    return {
      granted: true,
      message: '麦克风权限已授权',
    };
  } catch (error) {
    if (error.name === 'NotAllowedError') {
      return {
        granted: false,
        message: '麦克风权限被拒绝，无法进行音准检测',
      };
    }
    
    if (error.name === 'NotFoundError') {
      return {
        granted: false,
        message: '未检测到麦克风设备',
      };
    }
    
    return {
      granted: false,
      message: '麦克风权限请求失败',
    };
  }
};

const showPermissionExplanation = (): void => {
  const modal = {
    title: '麦克风权限说明',
    content: `
      我们需要麦克风权限来检测您的演奏音准。
      
      • 音频仅在本地处理，不上传服务器
      • 不录制完整音频，仅提取音高信息
      • 您可随时关闭权限
      
      是否授权麦克风权限？
    `,
    buttons: [
      { text: '了解更多', action: 'showPrivacyPolicy' },
      { text: '授权', action: 'requestPermission' },
      { text: '拒绝', action: 'denyPermission' },
    ],
  };
};
```

### 2.3 隐私政策文档

```markdown
# 麦克风权限隐私政策

## 数据收集
我们仅在您授权后使用麦克风进行音准检测。

## 数据处理
- 所有音频分析在您的设备本地完成
- 使用Web Audio API进行实时频率分析
- 不录制、存储或传输完整音频数据

## 数据存储
- 音准偏差结果可选择保存到练习记录
- 练习记录存储在您的账户中，受加密保护

## 数据分享
- 我们不会与第三方分享您的音频数据
- 练习记录仅用于提供统计和反馈

## 用户权利
- 您可以随时撤销麦克风权限
- 您可以删除练习记录
- 您可以导出或删除所有个人数据

## 联系我们
如有隐私问题，请联系：privacy@music-practice.app
```

---

## 3. 安全审计流程

### 3.1 OWASP ZAP扫描

```bash
# OWASP ZAP自动化扫描配置
zap-cli:
  baseline_scan:
    target: https://api.music-practice.app
    rules:
      - all
    exclude:
      - /docs
      - /health
    
  full_scan:
    target: https://api.music-practice.app
    authentication:
      type: bearer
      token: ${TEST_TOKEN}
    
  schedule:
    frequency: weekly
    notify: security-team@music-practice.app
```

```typescript
const zapScanConfig = {
  targetUrl: 'https://api.music-practice.app',
  scanType: 'full',
  authentication: {
    type: 'bearer',
    token: process.env.ZAP_TEST_TOKEN,
  },
  rules: {
    include: ['all'],
    exclude: ['/docs', '/health'],
  },
  alerts: {
    high: { action: 'block_deployment', notify: 'security-team' },
    medium: { action: 'notify', notify: 'security-team' },
    low: { action: 'log', notify: 'dev-team' },
  },
};
```

### 3.2 Snyk依赖扫描

```yaml
# Snyk配置
snyk:
  monitor:
    org: music-practice-app
    project: backend-api
    
  test:
    severity-threshold: high
    fail-on: upgradable
    
  ignore:
    - issue: SNYK-JS-LODASH-*
      reason: 已评估风险，暂不升级
      
  schedule:
    frequency: daily
    notify: security-team@music-practice.app
```

```typescript
const snykConfig = {
  org: 'music-practice-app',
  project: 'backend-api',
  severityThreshold: 'high',
  failOn: 'upgradable',
  monitor: true,
  schedule: {
    frequency: 'daily',
    notify: 'security-team@music-practice.app',
  },
};
```

### 3.3 SonarQube代码分析

```yaml
# SonarQube配置
sonarqube:
  projectKey: music-practice-app-backend
  sources: src
  exclusions:
    - "**/*.test.ts"
    - "**/__tests__/**"
    
  qualityGate:
    conditions:
      - type: COVERAGE
        threshold: 80
      - type: NEW_COVERAGE
        threshold: 80
      - type: NEW_SECURITY
        threshold: 0
      - type: NEW_VULNERABILITIES
        threshold: 0
        
  rules:
    security:
      - typescript:S2068 # 硬编码密码
      - typescript:S5145 # 日志注入
      - typescript:S5131 # XSS
```

### 3.4 安全审计流程

```
┌─────────────────────────────────────────────────────────────┐
│                    安全审计流程                               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐                                            │
│  │ 代码提交    │                                            │
│  └─────────────┘                                            │
│        │                                                     │
│        ▼                                                     │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐   │
│  │ SonarQube   │────>│ Snyk        │────>│ OWASP ZAP   │   │
│  │ 代码分析    │     │ 依赖扫描    │     │ 漏洞扫描    │   │
│  └─────────────┘     └─────────────┘     └─────────────┘   │
│        │                   │                   │            │
│        ▼                   ▼                   ▼            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              安全报告汇总                            │   │
│  └─────────────────────────────────────────────────────┘   │
│        │                                                     │
│        ▼                                                     │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐   │
│  │ 高风险      │────>│ 中风险      │────>│ 低风险      │   │
│  │ 阻止部署    │     │ 通知修复    │     │ 记录跟踪    │   │
│  └─────────────┘     └─────────────┘     └─────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. GDPR/CCPA合规

### 4.1 GDPR合规要求

| 要求 | 实现方式 | 说明 |
|------|----------|------|
| 数据最小化 | 仅收集必要数据 | 仅收集练习所需数据 |
| 用户同意 | 明确同意机制 | 麦克风权限、数据收集同意 |
| 数据访问权 | 导出功能 | 用户可导出所有个人数据 |
| 数据删除权 | 删除功能 | 用户可删除账户和数据 |
| 数据可携带权 | 标准格式导出 | JSON/PDF格式导出 |
| 隐私政策 | 明确告知 | 隐私政策页面 |
| DPO | 指定数据保护官 | dpo@music-practice.app |

### 4.2 CCPA合规要求

| 要求 | 实现方式 | 说明 |
|------|----------|------|
| 知情权 | 隐私政策 | 明确数据收集类别 |
| 删除权 | 删除功能 | 用户可请求删除 |
| 选择退出权 | 停止数据销售 | 不出售用户数据 |
| 平等服务 | 不歧视 | 不因隐私选择歧视用户 |

### 4.3 用户数据管理实现

```typescript
const exportUserData = async (userId: string): UserDataExport => {
  const user = await db.users.findUnique({ where: { id: userId } });
  const pieces = await db.pieces.findMany({ where: { user_id: userId } });
  const sessions = await db.practice_sessions.findMany({ where: { user_id: userId } });
  const achievements = await db.achievements.findMany({ where: { user_id: userId } });
  
  return {
    exportDate: new Date(),
    format: 'JSON',
    data: {
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        createdAt: user.created_at,
      },
      pieces: pieces.map(p => ({
        id: p.id,
        title: p.title,
        createdAt: p.created_at,
      })),
      practiceSessions: sessions.map(s => ({
        id: s.id,
        pieceId: s.piece_id,
        startTime: s.start_time,
        accuracy: s.accuracy,
      })),
      achievements: achievements.map(a => ({
        type: a.achievement_type,
        unlockedAt: a.unlocked_at,
      })),
    },
  };
};

const deleteUserData = async (userId: string): void => {
  await db.achievements.deleteMany({ where: { user_id: userId } });
  await db.practice_sessions.deleteMany({ where: { user_id: userId } });
  await db.pieces.deleteMany({ where: { user_id: userId } });
  await db.subscriptions.deleteMany({ where: { user_id: userId } });
  await db.users.delete({ where: { id: userId } });
  
  await redis.del(`user:${userId}`);
  await redis.del(`subscription:${userId}`);
  
  await auditLog.create({
    action: 'user_data_deleted',
    userId,
    timestamp: new Date(),
  });
};
```

### 4.4 Cookie政策

```typescript
const cookiePolicy = {
  essential: {
    cookies: ['session_id', 'csrf_token'],
    purpose: '认证和安全',
    duration: 'session',
    consentRequired: false,
  },
  
  functional: {
    cookies: ['preferences', 'language'],
    purpose: '用户偏好',
    duration: '1 year',
    consentRequired: true,
  },
  
  analytics: {
    cookies: ['_ga', '_gid'],
    purpose: '使用分析',
    duration: '2 years',
    consentRequired: true,
  },
  
  marketing: {
    cookies: [],
    purpose: '无营销Cookie',
    duration: 'none',
    consentRequired: false,
  },
};

const showCookieConsent = (): void => {
  const banner = {
    message: '我们使用Cookie来改善您的体验',
    options: [
      { text: '接受所有', action: 'acceptAll' },
      { text: '仅必要', action: 'acceptEssential' },
      { text: '自定义', action: 'customize' },
    ],
  };
};
```

---

## 5. 安全检查清单

### 5.1 OWASP Top 10检查

| 漏洞类型 | 检查项 | 状态 |
|----------|--------|------|
| A01:访问控制失效 | RBAC实现 | ✓ |
| A02:加密失败 | TLS 1.3、AES-256 | ✓ |
| A03:注入 | 参数化查询、输入验证 | ✓ |
| A04:不安全设计 | 安全架构评审 | ✓ |
| A05:安全配置错误 | 安全头配置 | ✓ |
| A06:脆弱组件 | Snyk扫描 | ✓ |
| A07:身份认证失败 | JWT双令牌 | ✓ |
| A08:软件和数据完整性失败 | CI/CD验证 | ✓ |
| A09:安全日志和监控失败 | Sentry监控 | ✓ |
| A10:服务器端请求伪造 | URL验证 | ✓ |

### 5.2 安全审计报告模板

```markdown
# 安全审计报告

## 审计信息
- 审计日期: YYYY-MM-DD
- 审计范围: 全系统
- 审计人员: 安全团队

## 扫描结果

### OWASP ZAP
- 高风险: 0
- 中风险: X
- 低风险: Y

### Snyk
- 高风险: 0
- 中风险: X
- 低风险: Y

### SonarQube
- 安全漏洞: 0
- 代码覆盖率: XX%

## 发现问题
| ID | 类型 | 严重程度 | 描述 | 状态 |
|----|------|----------|------|------|
| S01 | XSS | 中 | ... | 已修复 |

## 建议
1. ...
2. ...

## 结论
系统安全状态: 合格
```

---

## 6. 测试用例

| 用例ID | 测试内容 | 测试方法 | 预期结果 |
|--------|----------|----------|----------|
| SEC-01 | 密码哈希 | bcrypt验证 | 哈希正确 |
| SEC-02 | 数据加密 | AES加密解密 | 数据一致 |
| SEC-03 | TLS配置 | SSL Labs测试 | A级评分 |
| SEC-04 | OWASP扫描 | ZAP扫描 | 无高风险 |
| SEC-05 | 依赖扫描 | Snyk扫描 | 无已知漏洞 |
| SEC-06 | 数据导出 | GDPR导出 | 格式正确 |
| SEC-07 | 数据删除 | GDPR删除 | 数据清除 |
| SEC-08 | Cookie同意 | 检查banner | 显示同意 |

---

*文档结束*