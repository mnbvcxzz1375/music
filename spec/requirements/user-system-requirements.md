# 用户体系模块需求规格

## 文档信息

| 项目 | 内容 |
|------|------|
| 文档版本 | v1.0 |
| 创建日期 | 2026-04-14 |
| 关联PRD | PRD-music-practice-app-v2.md |
| 关联架构 | backend-architecture.md, auth-spec.md |

---

## 1. 用户注册功能

### 1.1 功能描述

支持多种方式注册：邮箱注册、手机号注册、第三方OAuth登录（Google、Apple、微信）。

### 1.2 用户流程

```
注册流程:
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│ 选择注册 │ -> │ 输入信息 │ -> │ 验证确认 │ -> │ 完成注册 │
│ 方式    │    │         │    │         │    │         │
└─────────┘    └─────────┘    └─────────┘    └─────────┘
     │              │              │              │
     v              v              v              v
  邮箱注册      邮箱+密码      验证码验证      设置偏好
  手机注册      手机+验证码    短信验证码      开始校准
  第三方登录    OAuth授权     第三方验证      进入首页
```

### 1.3 验收标准

| 验收项 | 标准 | 测试方法 |
|--------|------|----------|
| 邮箱注册成功 | 正确输入邮箱密码后注册成功 | E2E测试 |
| 手机注册成功 | 正确输入手机号验证码后注册成功 | E2E测试 |
| 第三方登录成功 | OAuth授权后自动创建账户 | E2E测试 |
| 重复注册拦截 | 已注册邮箱/手机显示错误提示 | E2E测试 |
| 验证码发送 | 验证码60秒内发送成功 | 单元测试 |
| 验证码验证 | 验证码正确验证 | 单元测试 |

### 1.4 API端点

| 端点 | 方法 | 说明 |
|------|------|------|
| /auth/register | POST | 邮箱注册 |
| /auth/register/phone | POST | 手机号注册 |
| /auth/register/send-code | POST | 发送验证码 |
| /auth/oauth/:provider | POST | OAuth登录 |

---

## 2. 用户登录功能

### 2.1 功能描述

支持多种方式登录：邮箱密码登录、手机号验证码登录、第三方OAuth登录。

### 2.2 JWT双令牌机制

- **Access Token**: 15分钟有效期，RS256签名
- **Refresh Token**: 7天有效期，存储于Redis

### 2.3 Token刷新流程

1. 验证Refresh Token有效性
2. 检查Redis中是否存在且未撤销
3. 获取用户信息
4. 生成新的Access Token
5. 滚动刷新（生成新的Refresh Token）
6. 撤销旧的Refresh Token

### 2.4 验收标准

| 验收项 | 标准 | 测试方法 |
|--------|------|----------|
| 邮箱登录成功 | 正确邮箱密码登录成功 | E2E测试 |
| 手机登录成功 | 正确手机验证码登录成功 | E2E测试 |
| 第三方登录成功 | OAuth授权登录成功 | E2E测试 |
| Token刷新成功 | 有效Refresh Token刷新成功 | 单元测试 |
| Token过期处理 | 过期Token返回401 | 单元测试 |
| 登出成功 | 登出后Token撤销 | E2E测试 |

### 2.5 API端点

| 端点 | 方法 | 说明 |
|------|------|------|
| /auth/login | POST | 邮箱密码登录 |
| /auth/login/phone | POST | 手机验证码登录 |
| /auth/refresh | POST | 刷新Token |
| /auth/logout | POST | 登出 |

---

## 3. 个人中心功能

### 3.1 功能描述

用户个人信息管理，包括头像、昵称、乐器设置、等级显示。

### 3.2 页面结构

```
个人中心页面:
┌────────────────────────────────────┐
│  ┌──────┐                          │
│  │ 头像 │  昵称: [可编辑]          │
│  │      │  等级: 进阶学习者        │
│  └──────┘  乐器: 钢琴              │
│                                    │
│  ┌──────────────────────────────┐  │
│  │ 练习统计                      │  │
│  │ 总时长: 120小时  曲目: 15首   │  │
│  │ 准确率: 85%    连续打卡: 7天  │  │
│  └──────────────────────────────┘  │
│                                    │
│  功能入口:                         │
│  - 我的曲目                        │
│  - 练习记录                        │
│  - 成就徽章                        │
│  - 设置                            │
│  - 会员订阅                        │
│  - 帮助与反馈                      │
└────────────────────────────────────┘
```

### 3.3 验收标准

| 验收项 | 标准 | 测试方法 |
|--------|------|----------|
| 用户信息显示 | 正确显示头像、昵称、等级 | E2E测试 |
| 用户信息修改 | 修改后正确保存 | E2E测试 |
| 练习统计显示 | 正确显示练习数据 | E2E测试 |
| 功能入口可用 | 所有入口可点击进入 | E2E测试 |

### 3.4 API端点

| 端点 | 方法 | 说明 |
|------|------|------|
| /users/me | GET | 获取当前用户信息 |
| /users/me | PUT | 更新用户信息 |
| /users/me/avatar | PUT | 更新头像 |

---

## 4. 会员订阅功能

### 4.1 订阅层级

| 层级 | 价格 | 功能权益 |
|------|------|----------|
| **Free** | $0 | 基础练习功能、5首免费曲目、基础统计 |
| **Premium** | $9.99/月 | 无限曲目、高级统计、OCR导入、成就系统 |
| **Pro** | $19.99/月 | Premium + 复音检测、AI分析、优先客服 |
| **Teacher** | $49.99/月 | Pro + 学生管理、班级功能、批量报告 |

### 4.2 权益管理

| 权限 | Free | Premium | Pro | Teacher |
|------|------|---------|-----|---------|
| basic_practice | ✓ | ✓ | ✓ | ✓ |
| limited_pieces | ✓ | - | - | - |
| full_pieces | - | ✓ | ✓ | ✓ |
| ocr_import | - | ✓ | ✓ | ✓ |
| stats_export | - | ✓ | ✓ | ✓ |
| polyphonic_detection | - | - | ✓ | ✓ |
| ai_analysis | - | - | ✓ | ✓ |
| student_management | - | - | - | ✓ |

### 4.3 验收标准

| 验收项 | 标准 | 测试方法 |
|--------|------|----------|
| 订阅状态显示 | 正确显示当前订阅状态 | E2E测试 |
| 权益检查 | 正确检查用户权限 | 单元测试 |
| 订阅创建 | Stripe订阅创建成功 | E2E测试 |
| 订阅取消 | 取消后状态正确更新 | E2E测试 |

### 4.4 API端点

| 端点 | 方法 | 说明 |
|------|------|------|
| /subscriptions | GET | 获取订阅状态 |
| /subscriptions/plans | GET | 获取订阅方案 |
| /subscriptions/checkout | POST | 创建订阅 |
| /subscriptions/cancel | POST | 取消订阅 |

---

## 5. 设置偏好功能

### 5.1 设置项

| 设置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| language | enum | 'zh-CN' | 语言设置 |
| theme | enum | 'dark' | 主题设置 |
| defaultTempo | number | 120 | 默认速度 |
| pitchTolerance | number | 20 | 音准容忍度（音分） |
| timingTolerance | number | 25 | 节拍容忍度（毫秒） |
| showHints | boolean | true | 显示提示 |
| autoAdvance | boolean | false | 自动推进 |
| retryLimit | number | 3 | 重试次数限制 |

### 5.2 验收标准

| 验收项 | 标准 | 测试方法 |
|--------|------|----------|
| 设置保存 | 设置正确保存到localStorage | 单元测试 |
| 设置加载 | 设置正确加载 | 单元测试 |
| 默认值 | 新用户使用默认值 | 单元测试 |

### 5.3 API端点

| 端点 | 方法 | 说明 |
|------|------|------|
| /users/me/settings | GET | 获取用户设置 |
| /users/me/settings | PUT | 更新用户设置 |

---

## 6. 数据结构

### 6.1 User类型

```typescript
interface User {
  id: string;
  email?: string;
  phone?: string;
  nickname: string;
  avatar?: string;
  instrument: InstrumentType;
  level: UserLevel;
  createdAt: Date;
  lastLoginAt: Date;
  subscription: SubscriptionStatus;
  settings: UserSettings;
}

type InstrumentType = 'piano' | 'guitar' | 'violin' | 'cello' | 'flute' | 'other';
type UserLevel = 'beginner' | 'intermediate' | 'advanced' | 'professional';
type SubscriptionStatus = 'free' | 'premium' | 'pro' | 'teacher';
```

### 6.2 UserSettings类型

```typescript
interface UserSettings {
  language: 'en' | 'zh-CN' | 'ja' | 'ko';
  theme: 'light' | 'dark' | 'auto';
  defaultTempo: number;
  pitchTolerance: number;
  timingTolerance: number;
  showHints: boolean;
  autoAdvance: boolean;
  retryLimit: number;
}
```

---

## 7. 测试用例清单

| 用例ID | 用例名称 | 测试类型 | 状态 |
|--------|----------|----------|------|
| TC-UR01 | 邮箱注册测试 | E2E测试 | ⏳待开发 |
| TC-UR02 | 手机注册测试 | E2E测试 | ⏳待开发 |
| TC-UR03 | 重复注册拦截 | E2E测试 | ⏳待开发 |
| TC-UL01 | 邮箱登录测试 | E2E测试 | ⏳待开发 |
| TC-UL02 | 第三方登录测试 | E2E测试 | ⏳待开发 |
| TC-UL03 | 登出测试 | E2E测试 | ⏳待开发 |
| TC-UP01 | 用户信息显示测试 | E2E测试 | ⏳待开发 |
| TC-UP02 | 用户信息修改测试 | E2E测试 | ⏳待开发 |
| TC-MS01 | 订阅状态显示测试 | E2E测试 | ⏳待开发 |
| TC-MS02 | 权益检查测试 | 单元测试 | ⏳待开发 |
| TC-SS01 | 设置保存测试 | 单元测试 | ⏳待开发 |
| TC-SS02 | 设置加载测试 | 单元测试 | ⏳待开发 |

---

*文档结束*