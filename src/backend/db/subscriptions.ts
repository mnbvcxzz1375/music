import { query, queryOne, queryMany, transaction } from './connection';
import type { Subscription } from './models';

export async function createSubscription(
  userId: string,
  plan: 'free' | 'premium' | 'premium_plus',
  startDate: Date,
  endDate?: Date,
  autoRenew: boolean = true
): Promise<Subscription> {
  const result = await queryOne<Subscription>(
    `INSERT INTO subscriptions (user_id, plan, status, start_date, end_date, auto_renew)
     VALUES ($1, $2, 'active', $3, $4, $5)
     RETURNING id, user_id as "userId", plan, status,
               start_date as "startDate", end_date as "endDate",
               auto_renew as "autoRenew",
               created_at as "createdAt", updated_at as "updatedAt"`,
    [userId, plan, startDate, endDate, autoRenew]
  );
  
  if (!result) {
    throw new Error('Failed to create subscription');
  }
  
  return result;
}

export async function getSubscriptionById(id: string): Promise<Subscription | null> {
  return queryOne<Subscription>(
    `SELECT id, user_id as "userId", plan, status,
            start_date as "startDate", end_date as "endDate",
            auto_renew as "autoRenew",
            created_at as "createdAt", updated_at as "updatedAt"
     FROM subscriptions WHERE id = $1`,
    [id]
  );
}

export async function getSubscriptionByUserId(userId: string): Promise<Subscription | null> {
  return queryOne<Subscription>(
    `SELECT id, user_id as "userId", plan, status,
            start_date as "startDate", end_date as "endDate",
            auto_renew as "autoRenew",
            created_at as "createdAt", updated_at as "updatedAt"
     FROM subscriptions 
     WHERE user_id = $1 AND status = 'active'
     ORDER BY created_at DESC LIMIT 1`,
    [userId]
  );
}

export async function getActiveSubscriptions(): Promise<Subscription[]> {
  return queryMany<Subscription>(
    `SELECT id, user_id as "userId", plan, status,
            start_date as "startDate", end_date as "endDate",
            auto_renew as "autoRenew",
            created_at as "createdAt", updated_at as "updatedAt"
     FROM subscriptions 
     WHERE status = 'active' AND end_date > NOW()
     ORDER BY end_date ASC`
  );
}

export async function getExpiredSubscriptions(): Promise<Subscription[]> {
  return queryMany<Subscription>(
    `SELECT id, user_id as "userId", plan, status,
            start_date as "startDate", end_date as "endDate",
            auto_renew as "autoRenew",
            created_at as "createdAt", updated_at as "updatedAt"
     FROM subscriptions 
     WHERE status = 'active' AND end_date <= NOW()
     ORDER BY end_date ASC`
  );
}

export async function updateSubscription(
  id: string,
  updates: Partial<{
    plan: 'free' | 'premium' | 'premium_plus';
    status: 'active' | 'canceled' | 'expired' | 'pending';
    endDate: Date;
    autoRenew: boolean;
  }>
): Promise<Subscription | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;
  
  if (updates.plan !== undefined) {
    fields.push(`plan = $${paramIndex}`);
    values.push(updates.plan);
    paramIndex++;
  }
  if (updates.status !== undefined) {
    fields.push(`status = $${paramIndex}`);
    values.push(updates.status);
    paramIndex++;
  }
  if (updates.endDate !== undefined) {
    fields.push(`end_date = $${paramIndex}`);
    values.push(updates.endDate);
    paramIndex++;
  }
  if (updates.autoRenew !== undefined) {
    fields.push(`auto_renew = $${paramIndex}`);
    values.push(updates.autoRenew);
    paramIndex++;
  }
  
  fields.push(`updated_at = NOW()`);
  values.push(id);
  
  const result = await queryOne<Subscription>(
    `UPDATE subscriptions SET ${fields.join(', ')}
     WHERE id = $${paramIndex}
     RETURNING id, user_id as "userId", plan, status,
               start_date as "startDate", end_date as "endDate",
               auto_renew as "autoRenew",
               created_at as "createdAt", updated_at as "updatedAt"`,
    values
  );
  
  return result;
}

export async function cancelSubscription(id: string): Promise<Subscription | null> {
  return updateSubscription(id, { status: 'canceled', autoRenew: false });
}

export async function renewSubscription(
  id: string,
  newEndDate: Date
): Promise<Subscription | null> {
  return updateSubscription(id, { 
    status: 'active', 
    endDate: newEndDate, 
    autoRenew: true 
  });
}

export async function expireSubscription(id: string): Promise<Subscription | null> {
  return updateSubscription(id, { status: 'expired' });
}

export async function getSubscriptionHistory(
  userId: string,
  limit: number = 10
): Promise<Subscription[]> {
  return queryMany<Subscription>(
    `SELECT id, user_id as "userId", plan, status,
            start_date as "startDate", end_date as "endDate",
            auto_renew as "autoRenew",
            created_at as "createdAt", updated_at as "updatedAt"
     FROM subscriptions 
     WHERE user_id = $1
     ORDER BY created_at DESC LIMIT $2`,
    [userId, limit]
  );
}

export async function countActiveSubscriptions(): Promise<number> {
  const result = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM subscriptions 
     WHERE status = 'active' AND end_date > NOW()`
  );
  
  return parseInt(result?.count || '0');
}

export async function countPremiumUsers(): Promise<{ premium: number; premiumPlus: number }> {
  const result = await queryOne<{ premium: string; premium_plus: string }>(
    `SELECT 
      COUNT(CASE WHEN plan = 'premium' THEN 1 END) as premium,
      COUNT(CASE WHEN plan = 'premium_plus' THEN 1 END) as premium_plus
     FROM subscriptions 
     WHERE status = 'active' AND end_date > NOW()`
  );
  
  return {
    premium: parseInt(result?.premium || '0'),
    premiumPlus: parseInt(result?.premium_plus || '0'),
  };
}