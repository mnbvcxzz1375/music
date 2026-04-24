import crypto from 'crypto';
import { query, queryOne } from '../db/connection';
import type { Payment } from '../db/models';

export interface AlipayConfig {
  appId: string;
  privateKey: string;
  alipayPublicKey: string;
  gatewayUrl: string;
  notifyUrl: string;
  returnUrl: string;
}

const defaultConfig: AlipayConfig = {
  appId: process.env.ALIPAY_APP_ID || '',
  privateKey: process.env.ALIPAY_PRIVATE_KEY || '',
  alipayPublicKey: process.env.ALIPAY_PUBLIC_KEY || '',
  gatewayUrl: 'https://openapi.alipay.com/gateway.do',
  notifyUrl: process.env.ALIPAY_NOTIFY_URL || 'https://api.musicpractice.app/api/payment/alipay/notify',
  returnUrl: process.env.ALIPAY_RETURN_URL || 'https://musicpractice.app/payment/success',
};

function sign(params: Record<string, string>, privateKey: string): string {
  const sortedParams = Object.keys(params)
    .filter(key => params[key] !== '' && params[key] !== undefined)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');
  
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(sortedParams);
  return signer.sign(privateKey, 'base64');
}

function verify(params: Record<string, string>, publicKey: string): boolean {
  const signStr = params.sign;
  const signType = params.sign_type;
  
  if (!signStr) return false;
  
  const sortedParams = Object.keys(params)
    .filter(key => key !== 'sign' && key !== 'sign_type' && params[key] !== '')
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');
  
  const verifier = crypto.createVerify(signType === 'RSA2' ? 'RSA-SHA256' : 'RSA-SHA1');
  verifier.update(sortedParams);
  
  return verifier.verify(publicKey, signStr, 'base64');
}

export interface CreateAlipayOrderParams {
  userId: string;
  plan: 'premium' | 'premium_plus';
  period: 'monthly' | 'yearly';
}

export async function createAlipayOrder(
  params: CreateAlipayOrderParams
): Promise<{ paymentUrl: string; paymentId: string }> {
  const prices = {
    premium: { monthly: 29.99, yearly: 299.99 },
    premium_plus: { monthly: 49.99, yearly: 499.99 },
  };
  
  const amount = prices[params.plan][params.period];
  
  const paymentResult = await queryOne<{ id: string }>(
    `INSERT INTO payments (user_id, amount, currency, status, payment_method)
     VALUES ($1, $2, 'CNY', 'pending', 'alipay')
     RETURNING id`,
    [params.userId, amount]
  );
  
  if (!paymentResult) {
    throw new Error('Failed to create payment record');
  }
  
  const orderParams: Record<string, string> = {
    app_id: defaultConfig.appId,
    method: 'alipay.trade.page.pay',
    format: 'JSON',
    return_url: defaultConfig.returnUrl,
    charset: 'utf-8',
    sign_type: 'RSA2',
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    version: '1.0',
    notify_url: defaultConfig.notifyUrl,
    biz_content: JSON.stringify({
      out_trade_no: paymentResult.id,
      product_code: 'FAST_INSTANT_TRADE_PAY',
      total_amount: amount.toFixed(2),
      subject: `Music Practice ${params.plan} ${params.period} subscription`,
      body: `Music Practice App ${params.plan} plan ${params.period} subscription`,
    }),
  };
  
  orderParams.sign = sign(orderParams, defaultConfig.privateKey);
  
  const queryString = Object.keys(orderParams)
    .map(key => `${key}=${encodeURIComponent(orderParams[key])}`)
    .join('&');
  
  const paymentUrl = `${defaultConfig.gatewayUrl}?${queryString}`;
  
  return {
    paymentUrl,
    paymentId: paymentResult.id,
  };
}

export async function handleAlipayNotify(
  params: Record<string, string>
): Promise<boolean> {
  if (!verify(params, defaultConfig.alipayPublicKey)) {
    console.error('Alipay signature verification failed');
    return false;
  }
  
  const tradeStatus = params.trade_status;
  const outTradeNo = params.out_trade_no;
  const tradeNo = params.trade_no;
  
  if (tradeStatus !== 'TRADE_SUCCESS' && tradeStatus !== 'TRADE_FINISHED') {
    return true;
  }
  
  const payment = await queryOne<{ user_id: string; amount: number }>(
    'SELECT user_id, amount FROM payments WHERE id = $1',
    [outTradeNo]
  );
  
  if (!payment) {
    console.error('Payment not found:', outTradeNo);
    return false;
  }
  
  await query(
    `UPDATE payments SET status = 'completed', transaction_id = $1, updated_at = NOW() WHERE id = $2`,
    [tradeNo, outTradeNo]
  );
  
  const plan = payment.amount <= 30 ? 'premium' : 'premium_plus';
  const period = payment.amount < 100 ? 'monthly' : 'yearly';
  
  const endDate = new Date();
  if (period === 'monthly') {
    endDate.setMonth(endDate.getMonth() + 1);
  } else {
    endDate.setFullYear(endDate.getFullYear() + 1);
  }
  
  await query(
    `INSERT INTO subscriptions (user_id, plan, status, start_date, end_date, auto_renew)
     VALUES ($1, $2, 'active', NOW(), $3, true)`,
    [payment.user_id, plan, endDate]
  );
  
  await query(
    `UPDATE users SET is_premium = true, updated_at = NOW() WHERE id = $1`,
    [payment.user_id]
  );
  
  return true;
}

export async function queryAlipayOrder(paymentId: string): Promise<{
  tradeStatus: string;
  tradeNo: string;
} | null> {
  const queryParams: Record<string, string> = {
    app_id: defaultConfig.appId,
    method: 'alipay.trade.query',
    format: 'JSON',
    charset: 'utf-8',
    sign_type: 'RSA2',
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    version: '1.0',
    biz_content: JSON.stringify({
      out_trade_no: paymentId,
    }),
  };
  
  queryParams.sign = sign(queryParams, defaultConfig.privateKey);
  
  const queryString = Object.keys(queryParams)
    .map(key => `${key}=${encodeURIComponent(queryParams[key])}`)
    .join('&');
  
  const response = await fetch(`${defaultConfig.gatewayUrl}?${queryString}`);
  const data = await response.json();
  
  if (data.alipay_trade_query_response?.code === '10000') {
    return {
      tradeStatus: data.alipay_trade_query_response.trade_status,
      tradeNo: data.alipay_trade_query_response.trade_no,
    };
  }
  
  return null;
}

export async function getAlipayPaymentStatus(paymentId: string): Promise<Payment | null> {
  return queryOne<Payment>(
    `SELECT id, user_id as "userId", subscription_id as "subscriptionId",
            amount, currency, status, payment_method as "paymentMethod",
            transaction_id as "transactionId",
            created_at as "createdAt", updated_at as "updatedAt"
     FROM payments WHERE id = $1`,
    [paymentId]
  );
}

export { defaultConfig as alipayConfig };