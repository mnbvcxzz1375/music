# 支付订阅模块需求规格

## 文档信息

| 项目 | 内容 |
|------|------|
| 文档版本 | v1.0 |
| 创建日期 | 2026-04-14 |
| 关联PRD | PRD-music-practice-app-v2.md |
| 关联架构 | backend-architecture.md, payment-integration.md |

---

## 1. 订阅方案功能

### 1.1 订阅层级

| 层级 | 价格 | 周期 | 功能权益 |
|------|------|------|----------|
| **Free** | $0 | 永久 | 基础练习功能、5首免费曲目、基础统计 |
| **Premium Monthly** | $9.99 | 月 | 无限曲目、高级统计、OCR导入、成就系统 |
| **Premium Yearly** | $79.99 | 年 | Premium权益 + 优先支持 |
| **Pro Monthly** | $19.99 | 月 | Premium + 复音检测、AI分析 |
| **Teacher Monthly** | $49.99 | 月 | Pro + 学生管理、班级功能 |

### 1.2 权益对比

| 功能 | Free | Premium | Pro | Teacher |
|------|------|---------|-----|---------|
| 基础练习 | ✓ | ✓ | ✓ | ✓ |
| 曲目上传 | 3首 | 无限 | 无限 | 无限 |
| OCR导入 | - | ✓ | ✓ | ✓ |
| 统计分析 | 基础 | 详细 | 详细+导出 | 详细+导出 |
| 成就系统 | - | ✓ | ✓ | ✓ |
| 官方曲库 | - | ✓ | ✓ | ✓ |
| 复音检测 | - | - | ✓ | ✓ |
| AI分析 | - | - | ✓ | ✓ |
| 学生管理 | - | - | - | ✓ |
| 优先支持 | - | - | - | ✓ |

### 1.3 验收标准

| 验收项 | 标准 | 测试方法 |
|--------|------|----------|
| 方案显示 | 方案列表正确显示 | E2E测试 |
| 权益对比 | 权益对比正确显示 | E2E测试 |
| 价格显示 | 价格正确显示 | E2E测试 |

---

## 2. 支付集成功能

### 2.1 支付渠道

| 渠道 | 适用地区 | 说明 |
|------|----------|------|
| Stripe | 全球 | 信用卡、Apple Pay、Google Pay |
| 支付宝 | 中国 | 本地化支付 |
| 微信支付 | 中国 | 本地化支付 |

### 2.2 Stripe集成流程

```
Stripe支付流程:
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│ 选择方案 │ -> │ 创建Session │ -> │ 跳转支付 │ -> │ 回调处理 │
└─────────┘    └─────────┘    └─────────┘    └─────────┘
     │              │              │              │
     v              v              v              v
  查看权益      获取priceId    Stripe Checkout  Webhook验证
  对比价格      创建Session    用户支付        更新订阅状态
```

### 2.3 Webhook事件处理

| 事件 | 处理动作 |
|------|----------|
| checkout.session.completed | 创建订阅记录，更新状态为active |
| customer.subscription.updated | 同步订阅状态和周期 |
| customer.subscription.deleted | 更新状态为expired |
| invoice.payment_succeeded | 续费成功，延长周期 |
| invoice.payment_failed | 续费失败，发送提醒 |

### 2.4 验收标准

| 验收项 | 标准 | 测试方法 |
|--------|------|----------|
| 支付创建 | Stripe Session创建成功 | 单元测试 |
| Webhook验证 | 签名验证通过 | 单元测试 |
| 状态更新 | 订阅状态正确更新 | 单元测试 |
| 续费处理 | 续费流程正确 | 单元测试 |

---

## 3. 权益管理功能

### 3.1 权限检查

```typescript
function checkPermission(user: User, permission: Permission): boolean {
  const rolePermissions: Record<SubscriptionStatus, Permission[]> = {
    free: ['basic_practice', 'limited_pieces'],
    premium: ['basic_practice', 'full_pieces', 'ocr_import', 'stats_export', 'achievements'],
    pro: ['basic_practice', 'full_pieces', 'ocr_import', 'stats_export', 'achievements', 'polyphonic', 'ai_analysis'],
    teacher: ['basic_practice', 'full_pieces', 'ocr_import', 'stats_export', 'achievements', 'polyphonic', 'ai_analysis', 'student_management'],
  };
  
  return rolePermissions[user.subscription].includes(permission);
}
```

### 3.2 功能解锁

| 功能 | 解锁条件 | 检查时机 |
|------|----------|----------|
| 曲目上传 | Premium+ | 上传时检查 |
| OCR导入 | Premium+ | OCR时检查 |
| 复音检测 | Pro+ | 练习时检查 |
| 学生管理 | Teacher | 班级功能时检查 |

### 3.3 验收标准

| 验收项 | 标准 | 测试方法 |
|--------|------|----------|
| 权限检查 | 正确检查用户权限 | 单元测试 |
| 功能解锁 | 正确解锁功能 | E2E测试 |
| 提示显示 | 无权限时显示提示 | E2E测试 |

---

## 4. 退款流程功能

### 4.1 退款条件

| 条件 | 说明 |
|------|------|
| 7天内 | 首次订阅7天内可申请退款 |
| 未使用 | 未使用付费功能超过50% |
| 技术问题 | 因技术问题无法使用 |

### 4.2 退款流程

```
退款流程:
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│ 申请退款 │ -> │ 条件验证 │ -> │ 处理退款 │ -> │ 更新状态 │
└─────────┘    └─────────┘    └─────────┘    └─────────┘
     │              │              │              │
     v              v              v              v
  提交申请      检查条件      Stripe退款      取消订阅
  说明原因      计算使用量    处理退款        更新状态
```

### 4.3 验收标准

| 验收项 | 标准 | 测试方法 |
|--------|------|----------|
| 条件验证 | 正确验证退款条件 | 单元测试 |
| 退款处理 | Stripe退款成功 | 单元测试 |
| 状态更新 | 订阅状态正确更新 | 单元测试 |

---

## 5. 数据结构

### 5.1 Subscription类型

```typescript
interface Subscription {
  id: string;
  userId: string;
  planType: 'free' | 'premium_monthly' | 'premium_yearly' | 'pro_monthly' | 'teacher_monthly';
  status: 'active' | 'expired' | 'cancelled' | 'pending';
  startDate: Date;
  endDate: Date;
  autoRenew: boolean;
  paymentProvider: 'stripe' | 'alipay' | 'wechat';
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### 5.2 Payment类型

```typescript
interface Payment {
  id: string;
  userId: string;
  subscriptionId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  provider: 'stripe' | 'alipay' | 'wechat';
  providerPaymentId: string;
  createdAt: Date;
}
```

---

## 6. API端点

| 端点 | 方法 | 说明 |
|------|------|------|
| /subscriptions | GET | 获取订阅状态 |
| /subscriptions/plans | GET | 获取订阅方案 |
| /subscriptions/checkout | POST | 创建订阅 |
| /subscriptions/cancel | POST | 取消订阅 |
| /subscriptions/refund | POST | 申请退款 |
| /users/me/permissions | GET | 获取用户权限 |

---

## 7. 测试用例清单

| 用例ID | 用例名称 | 测试类型 | 状态 |
|--------|----------|----------|------|
| TC-MS01 | 订阅状态显示测试 | E2E测试 | ⏳待开发 |
| TC-MS02 | 权益检查测试 | 单元测试 | ⏳待开发 |
| TC-MS03 | 订阅创建测试 | E2E测试 | ⏳待开发 |
| TC-PF01 | 支付创建测试 | 单元测试 | ⏳待开发 |
| TC-PF02 | Webhook验证测试 | 单元测试 | ⏳待开发 |
| TC-RF01 | 退款申请测试 | E2E测试 | ⏳待开发 |

---

## 8. PCI-DSS合规

| 要求 | 实现方式 |
|------|----------|
| 不存储完整卡号 | 使用Stripe Token |
| 不存储CVV | 不收集 |
| 传输加密 | TLS 1.3 |
| 访问控制 | RBAC |
| 日志审计 | 完整日志 |

---

*文档结束*