export interface Payment {
  id: string;
  userId: string;
  stripePaymentIntentId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentMethod: string;
  refundId?: string;
  refundReason?: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface PaymentHistory {
  id: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: Date;
  description: string;
}