import Stripe from 'stripe';
import { query, queryOne } from '../db/connection';
import type { Payment } from '../db/models';

export interface StripeConfig {
  apiKey: string;
  webhookSecret: string;
  successUrl: string;
  cancelUrl: string;
}

const defaultConfig: StripeConfig = {
  apiKey: process.env.STRIPE_API_KEY || '',
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  successUrl: process.env.STRIPE_SUCCESS_URL || 'http://localhost:5174/payment/success',
  cancelUrl: process.env.STRIPE_CANCEL_URL || 'http://localhost:5174/payment/cancel',
};

let stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripe && defaultConfig.apiKey) {
    stripe = new Stripe(defaultConfig.apiKey, {
      apiVersion: '2024-11-20.acacia',
    });
  }
  return stripe!;
}

export interface CreateCheckoutSessionParams {
  userId: string;
  plan: 'premium' | 'premium_plus';
  period: 'monthly' | 'yearly';
  email: string;
}

export async function createCheckoutSession(
  params: CreateCheckoutSessionParams
): Promise<{ sessionId: string; paymentId: string }> {
  const client = getStripe();
  
  const prices: Record<string, Record<string, string>> = {
    premium: {
      monthly: process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID || 'price_premium_monthly',
      yearly: process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID || 'price_premium_yearly',
    },
    premium_plus: {
      monthly: process.env.STRIPE_PREMIUM_PLUS_MONTHLY_PRICE_ID || 'price_premium_plus_monthly',
      yearly: process.env.STRIPE_PREMIUM_PLUS_YEARLY_PRICE_ID || 'price_premium_plus_yearly',
    },
  };
  
  const priceId = prices[params.plan][params.period];
  
  const paymentResult = await queryOne<{ id: string }>(
    `INSERT INTO payments (user_id, amount, currency, status, payment_method)
     VALUES ($1, $2, 'USD', 'pending', 'stripe')
     RETURNING id`,
    [
      params.userId,
      params.period === 'monthly' ? 29.99 : 299.99,
    ]
  );
  
  if (!paymentResult) {
    throw new Error('Failed to create payment record');
  }
  
  const session = await client.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'subscription',
    customer_email: params.email,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: `${defaultConfig.successUrl}?payment_id=${paymentResult.id}`,
    cancel_url: `${defaultConfig.cancelUrl}?payment_id=${paymentResult.id}`,
    metadata: {
      userId: params.userId,
      paymentId: paymentResult.id,
      plan: params.plan,
      period: params.period,
    },
  });
  
  await query(
    `UPDATE payments SET transaction_id = $1 WHERE id = $2`,
    [session.id, paymentResult.id]
  );
  
  return {
    sessionId: session.id,
    paymentId: paymentResult.id,
  };
}

export async function handleWebhookEvent(
  payload: string,
  signature: string
): Promise<void> {
  const client = getStripe();
  
  const event = client.webhooks.constructEvent(
    payload,
    signature,
    defaultConfig.webhookSecret
  );
  
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      break;
    case 'invoice.payment_succeeded':
      await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
      break;
    case 'invoice.payment_failed':
      await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const userId = session.metadata?.userId;
  const paymentId = session.metadata?.paymentId;
  const plan = session.metadata?.plan as 'premium' | 'premium_plus';
  const period = session.metadata?.period as 'monthly' | 'yearly';
  
  if (!userId || !paymentId) {
    console.error('Missing metadata in checkout session');
    return;
  }
  
  await query(
    `UPDATE payments SET status = 'completed', updated_at = NOW() WHERE id = $1`,
    [paymentId]
  );
  
  const endDate = new Date();
  if (period === 'monthly') {
    endDate.setMonth(endDate.getMonth() + 1);
  } else {
    endDate.setFullYear(endDate.getFullYear() + 1);
  }
  
  await query(
    `INSERT INTO subscriptions (user_id, plan, status, start_date, end_date, auto_renew)
     VALUES ($1, $2, 'active', NOW(), $3, true)`,
    [userId, plan, endDate]
  );
  
  await query(
    `UPDATE users SET is_premium = true, updated_at = NOW() WHERE id = $1`,
    [userId]
  );
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
  const subscriptionId = invoice.subscription as string;
  
  if (!subscriptionId) return;
  
  const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
  const userId = subscription.metadata?.userId;
  
  if (!userId) return;
  
  const endDate = new Date(subscription.current_period_end * 1000);
  
  await query(
    `UPDATE subscriptions SET end_date = $1, updated_at = NOW() 
     WHERE user_id = $2 AND status = 'active'`,
    [endDate, userId]
  );
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const subscriptionId = invoice.subscription as string;
  
  if (!subscriptionId) return;
  
  const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
  const userId = subscription.metadata?.userId;
  
  if (!userId) return;
  
  await query(
    `UPDATE payments SET status = 'failed', updated_at = NOW() 
     WHERE transaction_id = $1`,
    [invoice.id]
  );
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  const userId = subscription.metadata?.userId;
  
  if (!userId) return;
  
  await query(
    `UPDATE subscriptions SET status = 'canceled', auto_renew = false, updated_at = NOW() 
     WHERE user_id = $1 AND status = 'active'`,
    [userId]
  );
  
  await query(
    `UPDATE users SET is_premium = false, updated_at = NOW() WHERE id = $1`,
    [userId]
  );
}

export async function cancelStripeSubscription(userId: string): Promise<void> {
  const subscriptionResult = await queryOne<{ transaction_id: string }>(
    `SELECT p.transaction_id 
     FROM payments p 
     JOIN subscriptions s ON p.user_id = s.user_id 
     WHERE p.user_id = $1 AND p.status = 'completed' AND p.payment_method = 'stripe'
     ORDER BY p.created_at DESC LIMIT 1`,
    [userId]
  );
  
  if (!subscriptionResult?.transaction_id) {
    throw new Error('No active Stripe subscription found');
  }
  
  const session = await getStripe().checkout.sessions.retrieve(subscriptionResult.transaction_id);
  
  if (session.subscription) {
    await getStripe().subscriptions.cancel(session.subscription as string);
  }
}

export async function getStripePaymentStatus(paymentId: string): Promise<Payment | null> {
  return queryOne<Payment>(
    `SELECT id, user_id as "userId", subscription_id as "subscriptionId",
            amount, currency, status, payment_method as "paymentMethod",
            transaction_id as "transactionId",
            created_at as "createdAt", updated_at as "updatedAt"
     FROM payments WHERE id = $1`,
    [paymentId]
  );
}

export { defaultConfig as stripeConfig };