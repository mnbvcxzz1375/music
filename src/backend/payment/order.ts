import { query, queryOne, queryMany } from '../db/connection';
import type { Payment } from '../db/models';

export interface OrderInfo {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentMethod: 'stripe' | 'alipay' | 'wechat' | 'apple' | 'google';
  transactionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function createOrder(
  userId: string,
  amount: number,
  currency: string,
  paymentMethod: string
): Promise<OrderInfo> {
  const result = await queryOne<OrderInfo>(
    `INSERT INTO payments (user_id, amount, currency, status, payment_method)
     VALUES ($1, $2, $3, 'pending', $4)
     RETURNING id, user_id as "userId", amount, currency, status,
               payment_method as "paymentMethod", transaction_id as "transactionId",
               created_at as "createdAt", updated_at as "updatedAt"`,
    [userId, amount, currency, paymentMethod]
  );
  
  if (!result) {
    throw new Error('Failed to create order');
  }
  
  return result;
}

export async function getOrderById(id: string): Promise<OrderInfo | null> {
  return queryOne<OrderInfo>(
    `SELECT id, user_id as "userId", amount, currency, status,
            payment_method as "paymentMethod", transaction_id as "transactionId",
            created_at as "createdAt", updated_at as "updatedAt"
     FROM payments WHERE id = $1`,
    [id]
  );
}

export async function getOrdersByUserId(
  userId: string,
  limit: number = 20,
  offset: number = 0
): Promise<OrderInfo[]> {
  return queryMany<OrderInfo>(
    `SELECT id, user_id as "userId", amount, currency, status,
            payment_method as "paymentMethod", transaction_id as "transactionId",
            created_at as "createdAt", updated_at as "updatedAt"
     FROM payments WHERE user_id = $1
     ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );
}

export async function updateOrderStatus(
  id: string,
  status: 'pending' | 'completed' | 'failed' | 'refunded',
  transactionId?: string
): Promise<OrderInfo | null> {
  const result = await queryOne<OrderInfo>(
    `UPDATE payments SET status = $1, transaction_id = COALESCE($2, transaction_id), updated_at = NOW()
     WHERE id = $3
     RETURNING id, user_id as "userId", amount, currency, status,
               payment_method as "paymentMethod", transaction_id as "transactionId",
               created_at as "createdAt", updated_at as "updatedAt"`,
    [status, transactionId, id]
  );
  
  return result;
}

export async function cancelOrder(id: string): Promise<boolean> {
  const order = await getOrderById(id);
  
  if (!order || order.status !== 'pending') {
    return false;
  }
  
  await updateOrderStatus(id, 'failed');
  return true;
}

export async function refundOrder(
  id: string,
  reason?: string
): Promise<OrderInfo | null> {
  const order = await getOrderById(id);
  
  if (!order || order.status !== 'completed') {
    return null;
  }
  
  const result = await updateOrderStatus(id, 'refunded');
  
  if (result) {
    await query(
      `UPDATE subscriptions SET status = 'canceled', updated_at = NOW()
       WHERE user_id = $1 AND status = 'active'`,
      [order.userId]
    );
    
    await query(
      `UPDATE users SET is_premium = false, updated_at = NOW() WHERE id = $1`,
      [order.userId]
    );
  }
  
  return result;
}

export async function getPendingOrders(): Promise<OrderInfo[]> {
  return queryMany<OrderInfo>(
    `SELECT id, user_id as "userId", amount, currency, status,
            payment_method as "paymentMethod", transaction_id as "transactionId",
            created_at as "createdAt", updated_at as "updatedAt"
     FROM payments WHERE status = 'pending'
     ORDER BY created_at ASC`,
    []
  );
}

export async function getCompletedOrders(
  startDate?: Date,
  endDate?: Date
): Promise<OrderInfo[]> {
  let sql = `SELECT id, user_id as "userId", amount, currency, status,
             payment_method as "paymentMethod", transaction_id as "transactionId",
             created_at as "createdAt", updated_at as "updatedAt"
             FROM payments WHERE status = 'completed'`;
  
  const values: unknown[] = [];
  
  if (startDate) {
    sql += ` AND created_at >= $${values.length + 1}`;
    values.push(startDate);
  }
  
  if (endDate) {
    sql += ` AND created_at <= $${values.length + 1}`;
    values.push(endDate);
  }
  
  sql += ' ORDER BY created_at DESC';
  
  return queryMany<OrderInfo>(sql, values);
}

export async function getOrderStats(): Promise<{
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  failedOrders: number;
  refundedOrders: number;
  totalRevenue: number;
}> {
  const result = await queryOne<{
    total_orders: string;
    pending_orders: string;
    completed_orders: string;
    failed_orders: string;
    refunded_orders: string;
    total_revenue: string;
  }>(
    `SELECT 
      COUNT(*) as total_orders,
      COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders,
      COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_orders,
      COUNT(CASE WHEN status = 'refunded' THEN 1 END) as refunded_orders,
      SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_revenue
     FROM payments`
  );
  
  return {
    totalOrders: parseInt(result?.total_orders || '0'),
    pendingOrders: parseInt(result?.pending_orders || '0'),
    completedOrders: parseInt(result?.completed_orders || '0'),
    failedOrders: parseInt(result?.failed_orders || '0'),
    refundedOrders: parseInt(result?.refunded_orders || '0'),
    totalRevenue: parseFloat(result?.total_revenue || '0'),
  };
}

export async function getRevenueByPeriod(
  period: 'daily' | 'weekly' | 'monthly'
): Promise<{ date: string; revenue: number }[]> {
  let dateFormat: string;
  
  switch (period) {
    case 'daily':
      dateFormat = 'YYYY-MM-DD';
      break;
    case 'weekly':
      dateFormat = 'IYYY-IW';
      break;
    case 'monthly':
      dateFormat = 'YYYY-MM';
      break;
  }
  
  return queryMany<{ date: string; revenue: string }>(
    `SELECT 
      TO_CHAR(created_at, '${dateFormat}') as date,
      SUM(amount) as revenue
     FROM payments 
     WHERE status = 'completed'
     GROUP BY TO_CHAR(created_at, '${dateFormat}')
     ORDER BY date DESC`,
    []
  ).then(results => results.map(r => ({
    date: r.date,
    revenue: parseFloat(r.revenue),
  })));
}