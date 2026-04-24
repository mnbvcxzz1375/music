# 用户认证方案设计文档

## 文档信息

| 项目 | 内容 |
|------|------|
| 文档版本 | v1.0 |
| 创建日期 | 2026-04-14 |
| 关联Spec | music-practice-app-refactor/spec.md |
| 关联架构 | backend-architecture.md |

---

## 1. JWT认证流程设计

### 1.1 双令牌机制概述

```
┌─────────────────────────────────────────────────────────────┐
│                    JWT双令牌机制                              │
├─────────────────────────────────────────────────────────────┤
│  Access Token:                                               │
│  - 有效期: 15分钟                                             │
│  - 签名算法: RS256                                            │
│  - 存储: 客户端内存/安全存储                                   │
│  - 用途: API请求认证                                          │
│                                                              │
│  Refresh Token:                                              │
│  - 有效期: 7天                                                │
│  - 签名算法: RS256                                            │
│  - 存储: Redis + 客户端安全存储                                │
│  - 用途: 刷新Access Token                                     │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 TokenPayload定义

```typescript
interface TokenPayload {
  userId: string;
  email: string;
  subscriptionStatus: string;
  permissions: string[];
  iat: number;  // 签发时间
  exp: number;  // 过期时间
}

interface RefreshTokenPayload {
  userId: string;
  tokenId: string;
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
```

### 1.3 Token生成流程

```typescript
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const generateTokens = async (user: User): Promise<TokenPair> => {
  const permissions = await getPermissions(user);
  
  const accessToken = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      subscriptionStatus: user.subscriptionStatus,
      permissions,
    },
    privateKey,
    { algorithm: 'RS256', expiresIn: '15m', issuer: 'music-practice-app' }
  );
  
  const tokenId = uuidv4();
  const refreshToken = jwt.sign(
    { userId: user.id, tokenId },
    privateKey,
    { algorithm: 'RS256', expiresIn: '7d', issuer: 'music-practice-app' }
  );
  
  await redis.set(
    `rt:${tokenId}`,
    JSON.stringify({
      userId: user.id,
      createdAt: Date.now(),
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      isRevoked: false,
    }),
    'EX',
    7 * 24 * 60 * 60
  );
  
  return { accessToken, refreshToken };
};
```

### 1.4 Token验证流程

```typescript
const verifyAccessToken = (token: string): TokenPayload => {
  try {
    return jwt.verify(token, publicKey, {
      algorithms: ['RS256'],
      issuer: 'music-practice-app',
    }) as TokenPayload;
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new AuthError(ErrorCode.TOKEN_EXPIRED);
    }
    throw new AuthError(ErrorCode.TOKEN_INVALID);
  }
};

const verifyRefreshToken = async (token: string): RefreshTokenPayload => {
  const decoded = jwt.verify(token, publicKey, {
    algorithms: ['RS256'],
    issuer: 'music-practice-app',
  }) as RefreshTokenPayload;
  
  const tokenData = await redis.get(`rt:${decoded.tokenId}`);
  
  if (!tokenData) {
    throw new AuthError(ErrorCode.REFRESH_TOKEN_REVOKED);
  }
  
  const parsed = JSON.parse(tokenData);
  if (parsed.isRevoked) {
    throw new AuthError(ErrorCode.REFRESH_TOKEN_REVOKED);
  }
  
  return decoded;
};
```

---

## 2. Refresh Token刷新机制

### 2.1 刷新流程图

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │────>│   API    │────>│  Redis   │
└──────────┘     └──────────┘     └──────────┘
     │               │                 │
     │ POST /auth/refresh              │
     │ { refreshToken }                │
     │               │                 │
     │               │ 验证Token       │
     │               │────────────────>│
     │               │                 │
     │               │ 返回Token数据   │
     │               │<────────────────│
     │               │                 │
     │               │ 生成新Token     │
     │               │                 │
     │ { accessToken, refreshToken }   │
     │<──────────────│                 │
     │               │                 │
     │               │ 撤销旧Token     │
     │               │────────────────>│
```

### 2.2 刷新实现代码

```typescript
const refreshTokens = async (refreshToken: string): Promise<TokenPair> => {
  const decoded = await verifyRefreshToken(refreshToken);
  
  const user = await userService.getById(decoded.userId);
  if (!user) {
    throw new AuthError(ErrorCode.UNAUTHORIZED);
  }
  
  const newAccessToken = generateAccessToken(user);
  const newRefreshToken = await generateRefreshToken(user);
  
  await redis.del(`rt:${decoded.tokenId}`);
  
  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
};

const generateAccessToken = (user: User): string => {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      subscriptionStatus: user.subscriptionStatus,
      permissions: getPermissions(user),
    },
    privateKey,
    { algorithm: 'RS256', expiresIn: '15m' }
  );
};

const generateRefreshToken = async (user: User): string => {
  const tokenId = uuidv4();
  
  const token = jwt.sign(
    { userId: user.id, tokenId },
    privateKey,
    { algorithm: 'RS256', expiresIn: '7d' }
  );
  
  await redis.set(
    `rt:${tokenId}`,
    JSON.stringify({
      userId: user.id,
      createdAt: Date.now(),
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    }),
    'EX',
    7 * 24 * 60 * 60
  );
  
  return token;
};
```

### 2.3 滚动刷新策略

```typescript
interface RefreshStrategy {
  sliding: boolean;  // 滚动刷新
  maxLifetime: number; // 最大生命周期（30天）
  reuseDetection: boolean; // 重用检测
}

const slidingRefresh = async (
  refreshToken: string,
  strategy: RefreshStrategy
): Promise<TokenPair> => {
  const decoded = await verifyRefreshToken(refreshToken);
  
  const tokenData = JSON.parse(await redis.get(`rt:${decoded.tokenId}`));
  
  if (strategy.reuseDetection) {
    const lastUsed = tokenData.lastUsedAt;
    if (lastUsed && Date.now() - lastUsed > 5 * 60 * 1000) {
      await revokeAllTokens(decoded.userId);
      throw new AuthError(ErrorCode.REFRESH_TOKEN_REVOKED);
    }
  }
  
  await redis.set(
    `rt:${decoded.tokenId}`,
    JSON.stringify({ ...tokenData, lastUsedAt: Date.now() }),
    'EX',
    7 * 24 * 60 * 60
  );
  
  return refreshTokens(refreshToken);
};
```

---

## 3. Token撤销方案

### 3.1 撤销场景

| 场景 | 撤销范围 | 说明 |
|------|----------|------|
| 用户登出 | 当前Refresh Token | 仅撤销当前会话 |
| 异常检测 | 所有Refresh Token | 撤销用户所有会话 |
| 密码修改 | 所有Refresh Token | 强制重新登录 |
| 账户冻结 | 所有Refresh Token | 禁止所有访问 |

### 3.2 登出撤销实现

```typescript
const logout = async (userId: string, refreshToken: string): void => {
  const decoded = jwt.verify(refreshToken, publicKey, {
    algorithms: ['RS256'],
  });
  
  await redis.del(`rt:${decoded.tokenId}`);
  
  await auditLog.create({
    userId,
    action: 'logout',
    timestamp: new Date(),
    metadata: { tokenId: decoded.tokenId },
  });
};
```

### 3.3 批量撤销实现

```typescript
const revokeAllTokens = async (userId: string): void => {
  const pattern = `rt:*`;
  const keys = await redis.keys(pattern);
  
  for (const key of keys) {
    const data = JSON.parse(await redis.get(key));
    if (data.userId === userId) {
      await redis.del(key);
    }
  }
  
  await auditLog.create({
    userId,
    action: 'revoke_all_tokens',
    timestamp: new Date(),
    reason: 'security_event',
  });
};
```

### 3.4 密码修改撤销

```typescript
const onPasswordChange = async (userId: string): void => {
  await revokeAllTokens(userId);
  
  await notificationService.send(userId, {
    type: 'password_changed',
    message: '密码已修改，请重新登录',
  });
};
```

### 3.5 Access Token黑名单

```typescript
const addToBlacklist = async (accessToken: string): void => {
  const decoded = jwt.decode(accessToken) as TokenPayload;
  const ttl = decoded.exp - Math.floor(Date.now() / 1000);
  
  if (ttl > 0) {
    await redis.set(
      `blacklist:${decoded.jti || accessToken}`,
      '1',
      'EX',
      ttl
    );
  }
};

const isBlacklisted = async (accessToken: string): boolean => {
  const decoded = jwt.decode(accessToken) as TokenPayload;
  return await redis.exists(`blacklist:${decoded.jti || accessToken}`);
};
```

---

## 4. OAuth 2.0第三方登录设计

### 4.1 支持的OAuth提供商

| 提供商 | 授权类型 | Scope | 说明 |
|--------|----------|-------|------|
| Google | OAuth 2.0 | email, profile | 全球用户 |
| Apple | OAuth 2.0 | email, name | iOS用户 |
| 微信 | OAuth 2.0 | snsapi_userinfo | 中国用户 |

### 4.2 OAuth流程图

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │────>│   API    │────>│  OAuth   │────>│  User    │
└──────────┘     └──────────┘     │ Provider │     └──────────┘
     │               │             └──────────┘          │
     │               │                    │              │
     │ 1. 请求OAuth URL                   │              │
     │<──────────────│                    │              │
     │               │                    │              │
     │ 2. 重定向到OAuth                   │              │
     │──────────────────────────────────>│              │
     │               │                    │              │
     │               │                    │ 3. 用户授权  │
     │               │                    │<─────────────│
     │               │                    │              │
     │ 4. 返回code   │                    │              │
     │<──────────────────────────────────>│              │
     │               │                    │              │
     │ 5. POST /auth/oauth/:provider      │              │
     │ { code }      │                    │              │
     │──────────────>│                    │              │
     │               │                    │              │
     │               │ 6. 用code换token   │              │
     │               │───────────────────>│              │
     │               │                    │              │
     │               │ 7. 获取用户信息    │              │
     │               │───────────────────>│              │
     │               │                    │              │
     │               │ 8. 创建/关联账户   │              │
     │               │                    │              │
     │ 9. 返回JWT    │                    │              │
     │<──────────────│                    │              │
```

### 4.3 Google OAuth实现

```typescript
interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope: 'email profile';
}

const googleOAuth = async (code: string): Promise<TokenPair> => {
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: JSON.stringify({
      code,
      client_id: config.google.clientId,
      client_secret: config.google.clientSecret,
      redirect_uri: config.google.redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  
  const { access_token } = await tokenResponse.json();
  
  const userInfo = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  
  const { id, email, name, picture } = await userInfo.json();
  
  const user = await findOrCreateUser({
    provider: 'google',
    providerId: id,
    email,
    nickname: name,
    avatarUrl: picture,
  });
  
  return generateTokens(user);
};
```

### 4.4 Apple OAuth实现

```typescript
interface AppleOAuthConfig {
  clientId: string;
  teamId: string;
  keyId: string;
  privateKey: string;
  redirectUri: string;
}

const appleOAuth = async (code: string, user?: AppleUser): Promise<TokenPair> => {
  const clientSecret = generateAppleClientSecret();
  
  const tokenResponse = await fetch('https://appleid.apple.com/auth/token', {
    method: 'POST',
    body: JSON.stringify({
      code,
      client_id: config.apple.clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      redirect_uri: config.apple.redirectUri,
    }),
  });
  
  const { id_token } = await tokenResponse.json();
  
  const decoded = jwt.decode(id_token);
  const { sub, email } = decoded;
  
  const userRecord = await findOrCreateUser({
    provider: 'apple',
    providerId: sub,
    email,
    nickname: user?.name?.firstName + ' ' + user?.name?.lastName,
  });
  
  return generateTokens(userRecord);
};
```

### 4.5 微信OAuth实现

```typescript
interface WechatOAuthConfig {
  appId: string;
  appSecret: string;
  redirectUri: string;
}

const wechatOAuth = async (code: string): Promise<TokenPair> => {
  const accessTokenUrl = `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${config.wechat.appId}&secret=${config.wechat.appSecret}&code=${code}&grant_type=authorization_code`;
  
  const tokenResponse = await fetch(accessTokenUrl);
  const { access_token, openid } = await tokenResponse.json();
  
  const userInfoUrl = `https://api.weixin.qq.com/sns/userinfo?access_token=${access_token}&openid=${openid}`;
  
  const userInfo = await fetch(userInfoUrl);
  const { openid, nickname, headimgurl } = await userInfo.json();
  
  const user = await findOrCreateUser({
    provider: 'wechat',
    providerId: openid,
    nickname,
    avatarUrl: headimgurl,
  });
  
  return generateTokens(user);
};
```

---

## 5. 权限控制设计（RBAC）

### 5.1 角色定义

| 角色 | 权限 | 说明 |
|------|------|------|
| free | basic_practice, limited_pieces | 免费用户 |
| premium | full_practice, full_pieces, ocr_import, stats_export | 付费用户 |
| admin | all | 管理员 |

### 5.2 权限定义

```typescript
enum Permission {
  BASIC_PRACTICE = 'basic_practice',
  LIMITED_PIECES = 'limited_pieces',
  FULL_PRACTICE = 'full_practice',
  FULL_PIECES = 'full_pieces',
  OCR_IMPORT = 'ocr_import',
  STATS_EXPORT = 'stats_export',
  ADMIN = 'admin',
}

interface RolePermissions {
  free: [Permission.BASIC_PRACTICE, Permission.LIMITED_PIECES];
  premium: [
    Permission.FULL_PRACTICE,
    Permission.FULL_PIECES,
    Permission.OCR_IMPORT,
    Permission.STATS_EXPORT,
  ];
  admin: [Permission.ADMIN];
}
```

### 5.3 权限检查实现

```typescript
const checkPermission = (
  user: User,
  requiredPermission: Permission
): boolean => {
  const role = user.subscriptionStatus === 'active' ? 'premium' : 'free';
  const permissions = rolePermissions[role];
  
  return permissions.includes(requiredPermission) || 
         permissions.includes(Permission.ADMIN);
};

const requirePermission = (permission: Permission) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!checkPermission(req.user, permission)) {
      return res.status(403).json({
        success: false,
        error: { code: ErrorCode.PREMIUM_REQUIRED, message: 'Premium subscription required' }
      });
    }
    next();
  };
};

// 使用示例
app.get('/pieces/ocr', 
  authMiddleware,
  requirePermission(Permission.OCR_IMPORT),
  ocrImportHandler
);
```

---

## 6. 安全措施说明

### 6.1 密码安全

```typescript
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

const hashPassword = async (password: string): string => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

const verifyPassword = async (
  password: string,
  hash: string
): boolean => {
  return bcrypt.compare(password, hash);
};
```

### 6.2 传输安全

```typescript
// 强制HTTPS
const enforceHTTPS = (req: Request, res: Response, next: NextFunction) => {
  if (!req.secure && req.protocol !== 'https') {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  next();
};

// TLS 1.3配置
const tlsOptions = {
  minVersion: 'TLSv1.3',
  ciphers: [
    'TLS_AES_256_GCM_SHA384',
    'TLS_CHACHA20_POLY1305_SHA256',
    'TLS_AES_128_GCM_SHA256',
  ],
};
```

### 6.3 个人信息加密

```typescript
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');

const encryptData = (data: string): EncryptedData => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return { encrypted, iv: iv.toString('hex'), authTag: authTag.toString('hex') };
};

const decryptData = (encryptedData: EncryptedData): string => {
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

---

## 7. 会话管理机制

### 7.1 会话状态存储

```typescript
interface SessionState {
  userId: string;
  deviceId: string;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
  lastActivityAt: Date;
  refreshTokenId: string;
}

const storeSession = async (session: SessionState): void => {
  await redis.set(
    `session:${session.userId}:${session.deviceId}`,
    JSON.stringify(session),
    'EX',
    7 * 24 * 60 * 60
  );
};

const getActiveSessions = async (userId: string): SessionState[] => {
  const pattern = `session:${userId}:*`;
  const keys = await redis.keys(pattern);
  
  return keys.map(async key => {
    const data = await redis.get(key);
    return JSON.parse(data);
  });
};
```

### 7.2 设备管理

```typescript
const registerDevice = async (
  userId: string,
  deviceInfo: DeviceInfo
): void => {
  await db.user_devices.create({
    user_id: userId,
    device_id: deviceInfo.deviceId,
    device_name: deviceInfo.name,
    platform: deviceInfo.platform,
    last_used_at: new Date(),
  });
};

const revokeDevice = async (userId: string, deviceId: string): void => {
  await redis.del(`session:${userId}:${deviceId}`);
  await db.user_devices.update({
    where: { user_id: userId, device_id: deviceId },
    data: { revoked_at: new Date() },
  });
};
```

---

## 8. Token存储策略（Redis）

### 8.1 Redis键设计

| 键格式 | 数据类型 | TTL | 说明 |
|--------|----------|-----|------|
| `rt:{tokenId}` | JSON | 7天 | Refresh Token数据 |
| `session:{userId}:{deviceId}` | JSON | 7天 | 会话状态 |
| `blacklist:{tokenJti}` | String | Token剩余时间 | Access Token黑名单 |
| `user:{userId}` | JSON | 30分钟 | 用户信息缓存 |
| `user:perms:{userId}` | JSON | 15分钟 | 权限缓存 |

### 8.2 Redis存储实现

```typescript
const storeRefreshToken = async (
  tokenId: string,
  userId: string,
  deviceInfo: DeviceInfo
): void => {
  const data = {
    userId,
    createdAt: Date.now(),
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    isRevoked: false,
    deviceInfo,
  };
  
  await redis.set(
    `rt:${tokenId}`,
    JSON.stringify(data),
    'EX',
    7 * 24 * 60 * 60
  );
};

const getRefreshTokenData = async (tokenId: string): RefreshTokenData | null => {
  const data = await redis.get(`rt:${tokenId}`);
  return data ? JSON.parse(data) : null;
};

const revokeRefreshToken = async (tokenId: string): void => {
  await redis.del(`rt:${tokenId}`);
};
```

---

## 9. 认证流程图

### 9.1 登录流程

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │────>│   API    │────>│ Database │────>│  Redis   │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
     │               │                 │                 │
     │ POST /auth/login               │                 │
     │ { email, password }            │                 │
     │──────────────>│                 │                 │
     │               │                 │                 │
     │               │ 查询用户        │                 │
     │               │────────────────>│                 │
     │               │                 │                 │
     │               │ 返回用户数据    │                 │
     │               │<────────────────│                 │
     │               │                 │                 │
     │               │ 验证密码        │                 │
     │               │                 │                 │
     │               │ 生成Token       │                 │
     │               │──────────────────────────────────>│
     │               │                 │                 │
     │ { accessToken, refreshToken }  │                 │
     │<──────────────│                 │                 │
```

### 9.2 API请求认证流程

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │────>│   API    │────>│  Redis   │
└──────────┘     └──────────┘     └──────────┘
     │               │                 │
     │ GET /pieces   │                 │
     │ Authorization: Bearer <token>   │
     │──────────────>│                 │
     │               │                 │
     │               │ 验证Token       │
     │               │                 │
     │               │ 检查黑名单      │
     │               │────────────────>│
     │               │                 │
     │               │ 返回结果        │
     │               │<────────────────│
     │               │                 │
     │ { data }      │                 │
     │<──────────────│                 │
```

---

## 10. 测试用例

| 用例ID | 测试内容 | 测试方法 | 预期结果 |
|--------|----------|----------|----------|
| AUTH-01 | 登录成功 | 正确邮箱密码 | 返回Token |
| AUTH-02 | 登录失败 | 错误密码 | 401错误 |
| AUTH-03 | Token刷新 | 有效Refresh Token | 新Token |
| AUTH-04 | Token过期 | 过期Access Token | 401错误 |
| AUTH-05 | 登出成功 | 有效Token | Token撤销 |
| AUTH-06 | OAuth登录 | Google授权 | 返回Token |
| AUTH-07 | 权限检查 | 免费用户访问付费功能 | 403错误 |
| AUTH-08 | 密码修改 | 修改密码 | 所有Token撤销 |

---

*文档结束*