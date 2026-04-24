# 支付集成设计文档

## 文档信息

| 项目 | 内容 |
|------|------|
| 文档版本 | v1.0 |
| 创建日期 | 2026-04-14 |
| 关联Spec | music-practice-app-refactor/spec.md |
| 责任人 | 后端工程师B |

---

## 1. 支付渠道选型

### 1.1 渠道策略

| 地区 | 主渠道 | 备选渠道 | 说明 |
|------|--------|----------|------|
| 全球 | Stripe | PayPal | 信用卡、Apple Pay、Google Pay |
| 中国 | 支付宝 | 微信支付 | 本地化支付 |
| 日本 | LINE Pay | PayPay | 本地化支付 |

### 1.2 Stripe配置

```typescript
interface StripeConfig {
  publishableKey: string;
  secretKey: string;
  webhookSecret: string;
  apiVersion: '2023-10-16';
  
  // 产品配置
  products: {
    monthly: {
      priceId: string;
      amount: 9.99;
      currency: 'usd';
      interval: 'month';
    };
    yearly: {
      priceId: string;
      amount: 79.99;
      currency: 'usd';
      interval: 'year';
    };
  };
}
```

### 1.3 支付宝配置

```typescript
interface AlipayConfig {
  appId: string;
  privateKey: string;
  alipayPublicKey: string;
  gatewayUrl: 'https://openapi.alipay.com/gateway.do';
  
  // 产品配置
  products: {
    monthly: {
      amount: '9.99';
      subject: '音乐练习应用月度订阅';
    };
    yearly: {
      amount: '79.99';
      subject: '音乐练习应用年度订阅';
    };
  };
}
```

---

## 2. Stripe集成

### 2.1 Webhook签名验证（必须）

```typescript
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const handleStripeWebhook = async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'];
  
  if (!signature) {
    return res.status(400).json({
      success: false,
      error: { code: ErrorCode.TOKEN_INVALID, message: 'Missing stripe signature' }
    });
  }
  
  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
    
    await handleStripeEvent(event);
    
    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({
      success: false,
      error: { code: ErrorCode.TOKEN_INVALID, message: `Webhook Error: ${err.message}` }
    });
  }
};
```

### 2.2 Webhook事件处理

```typescript
interface StripeWebhookEvents {
  'checkout.session.completed': {
    action: '创建订阅记录';
    update: 'subscription_status = active';
  };
  'customer.subscription.created': {
    action: '记录订阅详情';
    update: '存储stripe_subscription_id';
  };
  'customer.subscription.updated': {
    action: '更新订阅状态';
    update: '同步status, current_period_end';
  };
  'customer.subscription.deleted': {
    action: '订阅结束';
    update: 'subscription_status = expired';
  };
  'invoice.payment_succeeded': {
    action: '续费成功';
    update: '延长end_date';
  };
  'invoice.payment_failed': {
    action: '续费失败';
    update: '标记payment_failed, 发送提醒';
  };
}

const handleStripeEvent = async (event: Stripe.Event) => {
  const handlers: Record<string, (data: any) => Promise<void>> = {
    'checkout.session.completed': handleCheckoutCompleted,
    'customer.subscription.created': handleSubscriptionCreated,
    'customer.subscription.updated': handleSubscriptionUpdated,
    'customer.subscription.deleted': handleSubscriptionDeleted,
    'invoice.payment_succeeded': handlePaymentSucceeded,
    'invoice.payment_failed': handlePaymentFailed,
  };
  
  const handler = handlers[event.type];
  if (handler) {
    await handler(event.data.object);
  } else {
    console.log(`Unhandled event type: ${event.type}`);
  }
};
```

### 2.3 事件处理器实现

```typescript
const handleCheckoutCompleted = async (session: Stripe.Checkout.Session) => {
  const userId = session.client_reference_id;
  const subscriptionId = session.subscription as string;
  const customerId = session.customer as string;
  
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  
  await db.subscriptions.create({
    user_id: userId,
    plan_type: getPlanType(subscription),
    status: 'active',
    start_date: new Date(subscription.current_period_start * 1000),
    end_date: new Date(subscription.current_period_end * 1000),
    auto_renew: true,
    payment_provider: 'stripe',
    stripe_subscription_id: subscriptionId,
    stripe_customer_id: customerId,
  });
  
  await db.users.update({
    where: { id: userId },
    data: { subscription_status: 'active' },
  });
  
  await cache.del(`subscription:${userId}`);
  await cache.del(`user:perms:${userId}`);
};

const handleSubscriptionUpdated = async (subscription: Stripe.Subscription) => {
  const existing = await db.subscriptions.findFirst({
    where: { stripe_subscription_id: subscription.id },
  });
  
  if (!existing) return;
  
  await db.subscriptions.update({
    where: { id: existing.id },
    data: {
      status: mapStripeStatus(subscription.status),
      end_date: new Date(subscription.current_period_end * 1000),
      auto_renew: !subscription.cancel_at_period_end,
    },
  });
  
  await cache.del(`subscription:${existing.user_id}`);
};

const handleSubscriptionDeleted = async (subscription: Stripe.Subscription) => {
  const existing = await db.subscriptions.findFirst({
    where: { stripe_subscription_id: subscription.id },
  });
  
  if (!existing) return;
  
  await db.subscriptions.update({
    where: { id: existing.id },
    data: { status: 'expired' },
  });
  
  await db.users.update({
    where: { id: existing.user_id },
    data: { subscription_status: 'expired' },
  });
  
  await cache.del(`subscription:${existing.user_id}`);
  await cache.del(`user:perms:${existing.user_id}`);
};

const handlePaymentSucceeded = async (invoice: Stripe.Invoice) => {
  const subscriptionId = invoice.subscription as string;
  
  const existing = await db.subscriptions.findFirst({
    where: { stripe_subscription_id: subscriptionId },
  });
  
  if (!existing) return;
  
  await db.subscriptions.update({
    where: { id: existing.id },
    data: {
      status: 'active',
      end_date: new Date(invoice.lines.data[0].period.end * 1000),
    },
  });
  
  await notificationService.send(existing.user_id, {
    type: 'subscription_renewed',
    message: '您的订阅已成功续费',
  });
};

const handlePaymentFailed = async (invoice: Stripe.Invoice) => {
  const subscriptionId = invoice.subscription as string;
  
  const existing = await db.subscriptions.findFirst({
    where: { stripe_subscription_id: subscriptionId },
  });
  
  if (!existing) return;
  
  await db.subscriptions.update({
    where: { id: existing.id },
    data: { status: 'payment_failed' },
  });
  
  await notificationService.send(existing.user_id, {
    type: 'payment_failed',
    message: '您的订阅续费失败，请更新支付方式',
  });
};
```

### 2.4 订阅状态同步机制

```typescript
const syncSubscriptionStatus = async (stripeSubscriptionId: string) => {
  const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
  
  const existing = await db.subscriptions.findFirst({
    where: { stripe_subscription_id: stripeSubscriptionId },
  });
  
  if (!existing) return;
  
  const updateData = {
    stripe_status: stripeSubscription.status,
    current_period_start: new Date(stripeSubscription.current_period_start * 1000),
    current_period_end: new Date(stripeSubscription.current_period_end * 1000),
    cancel_at_period_end: stripeSubscription.cancel_at_period_end,
    status: mapStripeStatus(stripeSubscription.status),
  };
  
  await db.subscriptions.update({
    where: { id: existing.id },
    data: updateData,
  });
  
  await cache.del(`subscription:${existing.user_id}`);
};

const mapStripeStatus = (stripeStatus: string): string => {
  const statusMap: Record<string, string> = {
    'active': 'active',
    'past_due': 'payment_failed',
    'canceled': 'expired',
    'unpaid': 'payment_failed',
    'trialing': 'trialing',
  };
  return statusMap[stripeStatus] || 'unknown';
};
```

---

## 3. 订阅周期管理

### 3.1 创建订阅流程

```typescript
const createSubscription = async (userId: string, planType: 'monthly' | 'yearly') => {
  const user = await db.users.findUnique({ where: { id: userId } });
  
  if (!user) {
    throw new Error(ErrorCode.PIECE_NOT_FOUND);
  }
  
  const priceId = config.stripe.products[planType].priceId;
  
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card', 'apple_pay', 'google_pay'],
    line_items: [{
      price: priceId,
      quantity: 1,
    }],
    client_reference_id: userId,
    customer_email: user.email,
    success_url: `${config.app.baseUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${config.app.baseUrl}/subscription/cancel`,
    metadata: {
      userId,
      planType,
    },
  });
  
  return { checkoutUrl: session.url };
};
```

### 3.2 续费提醒机制

```typescript
const sendRenewalReminders = async () => {
  const expiringSoon = await db.subscriptions.findMany({
    where: {
      status: 'active',
      auto_renew: true,
      end_date: {
        gte: new Date(),
        lte: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      },
    },
    include: { user: true },
  });
  
  for (const subscription of expiringSoon) {
    await notificationService.send(subscription.user_id, {
      type: 'subscription_expiring',
      message: `您的订阅将于${formatDate(subscription.end_date)}到期，请确认支付方式`,
    });
  }
};
```

### 3.3 取消订阅流程

```typescript
const cancelSubscription = async (userId: string) => {
  const subscription = await db.subscriptions.findFirst({
    where: { user_id: userId, status: 'active' },
  });
  
  if (!subscription || !subscription.stripe_subscription_id) {
    throw new Error(ErrorCode.SUBSCRIPTION_NOT_ACTIVE);
  }
  
  await stripe.subscriptions.update(subscription.stripe_subscription_id, {
    cancel_at_period_end: true,
  });
  
  await db.subscriptions.update({
    where: { id: subscription.id },
    data: { auto_renew: false },
  });
  
  return { message: '订阅将在当前周期结束后取消' };
};
```

---

## 4. 退款流程

### 4.1 退款条件验证

```typescript
interface RefundPolicy {
  maxDays: 7;
  conditions: [
    '订阅7天内可申请退款',
    '未使用付费功能超过50%',
    '首次订阅用户',
  ];
}

const validateRefundEligibility = async (userId: string): Promise<boolean> => {
  const subscription = await db.subscriptions.findFirst({
    where: { user_id: userId, status: 'active' },
  });
  
  if (!subscription) return false;
  
  const daysSinceStart = Math.floor(
    (Date.now() - subscription.start_date.getTime()) / (24 * 60 * 60 * 1000)
  );
  
  if (daysSinceStart > RefundPolicy.maxDays) return false;
  
  const premiumUsage = await getPremiumFeatureUsage(userId);
  if (premiumUsage > 50) return false;
  
  return true;
};
```

### 4.2 退款处理流程

```typescript
const processRefund = async (userId: string, reason: string) => {
  const eligible = await validateRefundEligibility(userId);
  
  if (!eligible) {
    throw new Error('不符合退款条件');
  }
  
  const subscription = await db.subscriptions.findFirst({
    where: { user_id: userId, status: 'active' },
  });
  
  if (!subscription || !subscription.stripe_subscription_id) {
    throw new Error(ErrorCode.SUBSCRIPTION_NOT_ACTIVE);
  }
  
  const stripeSubscription = await stripe.subscriptions.retrieve(
    subscription.stripe_subscription_id
  );
  
  const latestInvoice = stripeSubscription.latest_invoice as string;
  
  const refund = await stripe.refunds.create({
    payment_intent: latestInvoice,
    reason: 'requested_by_customer',
    metadata: {
      userId,
      subscriptionId: subscription.id,
      reason,
    },
  });
  
  await stripe.subscriptions.cancel(subscription.stripe_subscription_id);
  
  await db.subscriptions.update({
    where: { id: subscription.id },
    data: {
      status: 'refunded',
      payment_id: refund.id,
    },
  });
  
  await db.users.update({
    where: { id: userId },
    data: { subscription_status: 'free' },
  });
  
  await cache.del(`subscription:${userId}`);
  await cache.del(`user:perms:${userId}`);
  
  await auditLog.create({
    userId,
    action: 'refund_processed',
    metadata: {
      subscriptionId: subscription.id,
      refundId: refund.id,
      amount: refund.amount,
      reason,
    },
  });
  
  return { refundId: refund.id, amount: refund.amount };
};
```

---

## 5. PCI-DSS合规

### 5.1 合规要求

| 要求 | 实现方式 | 说明 |
|------|----------|------|
| 不存储完整卡号 | Stripe Token | 使用stripe_token替代 |
| 不存储CVV | 不收集 | 前端直接发送给Stripe |
| 传输加密 | TLS 1.3 | 强制HTTPS |
| 访问控制 | RBAC | 仅财务人员可查看支付记录 |
| 日志审计 | 完整日志 | 记录所有支付操作 |

### 5.2 安全实现

```typescript
const securePaymentFlow = {
  frontend: {
    collectCard: '使用Stripe Elements',
    submit: '直接发送给Stripe',
    receive: '获取payment_method_id',
  },
  backend: {
    process: '使用payment_method_id创建订阅',
    store: '仅存储stripe_customer_id和stripe_subscription_id',
    audit: '记录操作日志，不记录卡号',
  },
};

const auditPaymentAccess = async (userId: string, action: string) => {
  await auditLog.create({
    userId,
    action,
    timestamp: new Date(),
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });
};
```

---

## 6. 支付宝集成

### 6.1 支付流程

```typescript
const createAlipayPayment = async (userId: string, planType: 'monthly' | 'yearly') => {
  const orderNo = generateOrderNo();
  const amount = config.alipay.products[planType].amount;
  
  const params = {
    app_id: config.alipay.appId,
    method: 'alipay.trade.page.pay',
    charset: 'utf-8',
    sign_type: 'RSA2',
    timestamp: formatDate(new Date()),
    version: '1.0',
    notify_url: `${config.app.baseUrl}/api/v1/webhooks/alipay`,
    return_url: `${config.app.baseUrl}/subscription/success`,
    biz_content: JSON.stringify({
      out_trade_no: orderNo,
      total_amount: amount,
      subject: config.alipay.products[planType].subject,
      product_code: 'FAST_INSTANT_TRADE_PAY',
    }),
  };
  
  const sign = signWithRSA(params, config.alipay.privateKey);
  const paymentUrl = buildAlipayUrl(params, sign);
  
  await db.payment_orders.create({
    user_id: userId,
    order_no: orderNo,
    amount: parseFloat(amount),
    plan_type: planType,
    provider: 'alipay',
    status: 'pending',
  });
  
  return { paymentUrl, orderNo };
};
```

### 6.2 异步通知处理

```typescript
const handleAlipayNotify = async (params: AlipayNotifyParams) => {
  const signValid = verifyAlipaySign(params, config.alipay.alipayPublicKey);
  
  if (!signValid) {
    throw new Error('签名验证失败');
  }
  
  const orderNo = params.out_trade_no;
  const tradeStatus = params.trade_status;
  
  const order = await db.payment_orders.findUnique({
    where: { order_no: orderNo },
  });
  
  if (!order) return 'fail';
  
  if (tradeStatus === 'TRADE_SUCCESS' || tradeStatus === 'TRADE_FINISHED') {
    await db.payment_orders.update({
      where: { order_no: orderNo },
      data: { status: 'paid', trade_no: params.trade_no },
    });
    
    await createSubscriptionFromOrder(order);
    
    return 'success';
  }
  
  return 'fail';
};
```

---

## 7. 微信支付集成

### 7.1 支付流程

```typescript
const createWechatPayment = async (userId: string, planType: 'monthly' | 'yearly') => {
  const orderNo = generateOrderNo();
  const amount = Math.floor(config.wechat.products[planType].amount * 100);
  
  const params = {
    appid: config.wechat.appId,
    mch_id: config.wechat.mchId,
    nonce_str: generateNonceStr(),
    body: config.wechat.products[planType].subject,
    out_trade_no: orderNo,
    total_fee: amount,
    spbill_create_ip: req.ip,
    notify_url: `${config.app.baseUrl}/api/v1/webhooks/wechat`,
    trade_type: 'NATIVE',
  };
  
  const sign = generateWechatSign(params, config.wechat.apiKey);
  const xmlParams = buildWechatXml({ ...params, sign });
  
  const result = await postWechatApi('https://api.mch.weixin.qq.com/pay/unifiedorder', xmlParams);
  const codeUrl = parseWechatXml(result).code_url;
  
  await db.payment_orders.create({
    user_id: userId,
    order_no: orderNo,
    amount: amount / 100,
    plan_type: planType,
    provider: 'wechat',
    status: 'pending',
  });
  
  return { codeUrl, orderNo };
};
```

---

## 8. 订阅方案定价

### 8.1 定价策略

| 方案 | 价格 | 周期 | 功能权益 | 目标用户 |
|------|------|------|----------|----------|
| Free | $0 | 永久 | 基础练习功能 | 新用户体验 |
| Monthly | $9.99 | 月 | 全部功能 | 短期用户 |
| Yearly | $79.99 | 年 | 全部功能 + 优先支持 | 长期用户 |

### 8.2 功能权益对比

| 功能 | Free | Monthly | Yearly |
|------|------|---------|--------|
| 基础练习 | ✓ | ✓ | ✓ |
| 曲目上传 | 3首 | 无限 | 无限 |
| OCR导入 | - | ✓ | ✓ |
| 统计分析 | 基础 | 详细 | 详细+导出 |
| 成就系统 | - | ✓ | ✓ |
| 官方曲库 | - | ✓ | ✓ |
| 优先支持 | - | - | ✓ |

---

## 9. 监控与告警

### 9.1 监控指标

| 指标 | 阈值 | 告警级别 |
|------|------|----------|
| 支付成功率 | <95% | Warning |
| 支付成功率 | <90% | Critical |
| Webhook延迟 | >30s | Warning |
| 退款率 | >5% | Warning |
| 订阅取消率 | >10% | Warning |

### 9.2 告警通知

```typescript
const paymentAlerts = {
  paymentFailed: {
    threshold: 5,
    window: '1 hour',
    action: '发送邮件给财务团队',
  },
  webhookFailed: {
    threshold: 3,
    window: '10 minutes',
    action: '发送短信给技术团队',
  },
  highRefundRate: {
    threshold: 10,
    window: '1 day',
    action: '发送报告给管理层',
  },
};
```

---

## 10. 测试用例

### 10.1 Stripe测试

| 用例ID | 测试内容 | 测试方法 | 预期结果 |
|--------|----------|----------|----------|
| ST-01 | 创建订阅 | 使用测试卡4242 | 订阅创建成功 |
| ST-02 | Webhook验证 | 发送测试事件 | 签名验证通过 |
| ST-03 | 续费成功 | 模拟invoice.payment_succeeded | 状态更新正确 |
| ST-04 | 续费失败 | 模拟invoice.payment_failed | 发送提醒通知 |
| ST-05 | 取消订阅 | 调用取消API | 订阅标记取消 |
| ST-06 | 退款处理 | 模拟退款请求 | 退款成功，状态更新 |

### 10.2 支付宝测试

| 用例ID | 测试内容 | 测试方法 | 预期结果 |
|--------|----------|----------|----------|
| AL-01 | 创建支付 | 沙箱环境测试 | 支付链接生成 |
| AL-02 | 异步通知 | 模拟通知回调 | 签名验证通过 |
| AL-03 | 支付成功 | 完成沙箱支付 | 订阅创建成功 |

---

## 11. 版本规划

| 版本 | 功能范围 | 预计完成 |
|------|----------|----------|
| v1.0 | Stripe集成 | 2026-Q2 W2 |
| v1.5 | 支付宝/微信支付 | 2026-Q3 |
| v2.0 | 多币种支持 | 2026-Q4 |

---

*文档结束*