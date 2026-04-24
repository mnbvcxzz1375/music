export type PlanType = 'free' | 'premium_monthly' | 'premium_yearly' | 'pro_monthly' | 'teacher_monthly';

export type SubscriptionStatus = 'active' | 'expired' | 'cancelled' | 'pending';

export type PaymentProvider = 'stripe' | 'alipay' | 'wechat';

export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export interface Subscription {
  id: string;
  userId: string;
  planType: PlanType;
  status: SubscriptionStatus;
  startDate: Date;
  endDate: Date;
  autoRenew: boolean;
  paymentProvider: PaymentProvider;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Payment {
  id: string;
  userId: string;
  subscriptionId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  provider: PaymentProvider;
  providerPaymentId: string;
  createdAt: Date;
}

export interface Plan {
  id: PlanType;
  name: string;
  price: number;
  currency: string;
  period: 'month' | 'year' | 'forever';
  features: string[];
  recommended?: boolean;
}

export interface CheckoutSession {
  id: string;
  url: string;
  planType: PlanType;
  successUrl: string;
  cancelUrl: string;
}

export type Permission = 
  | 'basic_practice'
  | 'limited_pieces'
  | 'full_pieces'
  | 'ocr_import'
  | 'stats_export'
  | 'achievements'
  | 'polyphonic'
  | 'ai_analysis'
  | 'student_management';

export interface UserPermissions {
  userId: string;
  subscription: PlanType;
  permissions: Permission[];
  expiresAt?: Date;
}