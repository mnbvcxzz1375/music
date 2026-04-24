import crypto from 'crypto';
import { query, queryOne } from '../db/connection';
import type { Payment } from '../db/models';

export interface WechatPayConfig {
  appId: string;
  mchId: string;
  apiKey: string;
  apiV3Key: string;
  serialNo: string;
  privateKey: string;
  notifyUrl: string;
}

const defaultConfig: WechatPayConfig = {
  appId: process.env.WECHAT_APP_ID || '',
  mchId: process.env.WECHAT_MCH_ID || '',
  apiKey: process.env.WECHAT_API_KEY || '',
  apiV3Key: process.env.WECHAT_API_V3_KEY || '',
  serialNo: process.env.WECHAT_SERIAL_NO || '',
  privateKey: process.env.WECHAT_PRIVATE_KEY || '',
  notifyUrl: process.env.WECHAT_NOTIFY_URL || 'https://api.musicpractice.app/api/payment/wechat/notify',
};

function generateNonceStr(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function signV3(message: string, privateKey: string): string {
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(message);
  return signer.sign(privateKey, 'base64');
}

function buildAuthorization(
  method: string,
  url: string,
  timestamp: number,
  nonceStr: string,
  body: string,
  privateKey: string,
  mchId: string,
  serialNo: string
): string {
  const message = `${method}\n${url}\n${timestamp}\n${nonceStr}\n${body}\n`;
  const signature = signV3(message, privateKey);
  return `WECHATPAY2-SHA256-RSA2048 mchid="${mchId}",nonce_str="${nonceStr}",timestamp="${timestamp}",serial_no="${serialNo}",signature="${signature}"`;
}

function decryptResource(nonce: string, associatedData: string, ciphertext: string, apiV3Key: string): string {
  const key = Buffer.from(apiV3Key, 'utf8');
  const iv = Buffer.from(nonce, 'utf8');
  const authTag = Buffer.from(ciphertext.slice(-16), 'base64');
  const data = Buffer.from(ciphertext.slice(0, -16), 'base64');
  
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  decipher.setAAD(Buffer.from(associatedData, 'utf8'));
  
  let decrypted = decipher.update(data, undefined, 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

export interface CreateWechatOrderParams {
  userId: string;
  plan: 'premium' | 'premium_plus';
  period: 'monthly' | 'yearly';
  openid?: string;
}

export async function createWechatOrder(
  params: CreateWechatOrderParams
): Promise<{ codeUrl: string; paymentId: string }> {
  const prices = {
    premium: { monthly: 29.99, yearly: 299.99 },
    premium_plus: { monthly: 49.99, yearly: 499.99 },
  };
  
  const amount = prices[params.plan][params.period];
  const amountInCents = Math.round(amount * 100);
  
  const paymentResult = await queryOne<{ id: string }>(
    `INSERT INTO payments (user_id, amount, currency, status, payment_method)
     VALUES ($1, $2, 'CNY', 'pending', 'wechat')
     RETURNING id`,
    [params.userId, amount]
  );
  
  if (!paymentResult) {
    throw new Error('Failed to create payment record');
  }
  
  const timestamp = Math.floor(Date.now() / 1000);
  const nonceStr = generateNonceStr();
  const url = '/v3/pay/transactions/native';
  
  const body = JSON.stringify({
    appid: defaultConfig.appId,
    mchid: defaultConfig.mchId,
    description: `Music Practice ${params.plan} subscription`,
    out_trade_no: paymentResult.id,
    notify_url: defaultConfig.notifyUrl,
    amount: {
      total: amountInCents,
      currency: 'CNY',
    },
  });
  
  const authorization = buildAuthorization(
    'POST',
    url,
    timestamp,
    nonceStr,
    body,
    defaultConfig.privateKey,
    defaultConfig.mchId,
    defaultConfig.serialNo
  );
  
  const response = await fetch('https://api.mch.weixin.qq.com/v3/pay/transactions/native', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authorization,
      'Accept': 'application/json',
    },
    body,
  });
  
  const data = await response.json();
  
  if (data.code_url) {
    return {
      codeUrl: data.code_url,
      paymentId: paymentResult.id,
    };
  }
  
  throw new Error(data.message || 'Failed to create Wechat order');
}

export async function handleWechatNotify(
  headers: Record<string, string>,
  body: string
): Promise<{ success: boolean; message: string }> {
  const timestamp = headers['wechatpay-timestamp'];
  const nonce = headers['wechatpay-nonce'];
  const signature = headers['wechatpay-signature'];
  const serial = headers['wechatpay-serial'];
  
  const message = `${timestamp}\n${nonce}\n${body}\n`;
  const expectedSignature = signV3(message, defaultConfig.privateKey);
  
  if (signature !== expectedSignature) {
    return { success: false, message: 'Signature verification failed' };
  }
  
  const data = JSON.parse(body);
  const resource = data.resource;
  
  const decryptedData = decryptResource(
    resource.nonce,
    resource.associated_data || '',
    resource.ciphertext,
    defaultConfig.apiV3Key
  );
  
  const paymentData = JSON.parse(decryptedData);
  
  if (paymentData.trade_state !== 'SUCCESS') {
    return { success: true, message: 'Payment not successful' };
  }
  
  const outTradeNo = paymentData.out_trade_no;
  const transactionId = paymentData.transaction_id;
  
  const payment = await queryOne<{ user_id: string; amount: number }>(
    'SELECT user_id, amount FROM payments WHERE id = $1',
    [outTradeNo]
  );
  
  if (!payment) {
    return { success: false, message: 'Payment not found' };
  }
  
  await query(
    `UPDATE payments SET status = 'completed', transaction_id = $1, updated_at = NOW() WHERE id = $2`,
    [transactionId, outTradeNo]
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
  
  return { success: true, message: 'Payment processed successfully' };
}

export async function queryWechatOrder(paymentId: string): Promise<{
  tradeState: string;
  transactionId: string;
} | null> {
  const timestamp = Math.floor(Date.now() / 1000);
  const nonceStr = generateNonceStr();
  const url = `/v3/pay/transactions/out-trade-no/${paymentId}`;
  
  const authorization = buildAuthorization(
    'GET',
    url,
    timestamp,
    nonceStr,
    '',
    defaultConfig.privateKey,
    defaultConfig.mchId,
    defaultConfig.serialNo
  );
  
  const response = await fetch(
    `https://api.mch.weixin.qq.com/v3/pay/transactions/out-trade-no/${paymentId}?mchid=${defaultConfig.mchId}`,
    {
      method: 'GET',
      headers: {
        'Authorization': authorization,
        'Accept': 'application/json',
      },
    }
  );
  
  const data = await response.json();
  
  if (data.trade_state) {
    return {
      tradeState: data.trade_state,
      transactionId: data.transaction_id,
    };
  }
  
  return null;
}

export async function getWechatPaymentStatus(paymentId: string): Promise<Payment | null> {
  return queryOne<Payment>(
    `SELECT id, user_id as "userId", subscription_id as "subscriptionId",
            amount, currency, status, payment_method as "paymentMethod",
            transaction_id as "transactionId",
            created_at as "createdAt", updated_at as "updatedAt"
     FROM payments WHERE id = $1`,
    [paymentId]
  );
}

export { defaultConfig as wechatConfig };