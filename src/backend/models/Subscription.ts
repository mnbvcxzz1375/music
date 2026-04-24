export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  status: 'active' | 'cancelled' | 'expired' | 'pending';
  startDate: Date;
  endDate: Date;
  autoRenew: boolean;
  paymentProvider?: string;
  paymentId?: string;
  stripeSubscriptionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  limits: {
    ocrPerMonth?: number;
    piecesPerMonth?: number;
  };
  isPremium?: boolean;
  discount?: number;
}

export interface SubscriptionStatus {
  status: 'free' | 'premium' | 'expired';
  plan: SubscriptionPlan;
  isActive: boolean;
  expiresAt: Date | null;
  autoRenew: boolean;
  daysRemaining?: number;
}