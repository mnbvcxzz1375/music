import { Subscription, SubscriptionPlan, SubscriptionStatus } from '../models/Subscription';

const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    currency: 'USD',
    interval: 'month',
    features: ['basic_practice', 'basic_statistics', 'upload_piece', 'ocr_limited'],
    limits: { ocrPerMonth: 5, piecesPerMonth: 10 },
  },
  {
    id: 'premium_monthly',
    name: 'Premium Monthly',
    price: 9.99,
    currency: 'USD',
    interval: 'month',
    features: ['premium', 'advanced_analysis', 'unlimited_ocr', 'premium_pieces', 'advanced_reports', 'ai_analysis'],
    limits: {},
    isPremium: true,
  },
  {
    id: 'premium_yearly',
    name: 'Premium Yearly',
    price: 79.99,
    currency: 'USD',
    interval: 'year',
    features: ['premium', 'advanced_analysis', 'unlimited_ocr', 'premium_pieces', 'advanced_reports', 'ai_analysis'],
    limits: {},
    isPremium: true,
    discount: 17,
  },
];

export class SubscriptionService {
  async getPlans(): Promise<SubscriptionPlan[]> {
    return SUBSCRIPTION_PLANS;
  }

  async getStatus(userId: string): Promise<SubscriptionStatus> {
    const subscription = await this.findActiveSubscription(userId);
    
    if (!subscription) {
      return {
        status: 'free',
        plan: SUBSCRIPTION_PLANS[0],
        isActive: false,
        expiresAt: null,
        autoRenew: false,
      };
    }
    
    const plan = SUBSCRIPTION_PLANS.find(p => p.id === subscription.planId) || SUBSCRIPTION_PLANS[0];
    
    return {
      status: subscription.status,
      plan,
      isActive: subscription.status === 'active',
      expiresAt: subscription.endDate,
      autoRenew: subscription.autoRenew,
      daysRemaining: this.calculateDaysRemaining(subscription.endDate),
    };
  }

  async create(userId: string, planId: string, paymentMethodId: string): Promise<Subscription> {
    const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId);
    
    if (!plan) {
      throw new Error('Invalid plan');
    }
    
    const startDate = new Date();
    const endDate = this.calculateEndDate(startDate, plan.interval);
    
    const subscription: Subscription = {
      id: this.generateId(),
      userId,
      planId,
      status: 'active',
      startDate,
      endDate,
      autoRenew: true,
      paymentMethodId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    await this.saveSubscription(subscription);
    
    return subscription;
  }

  async cancel(userId: string, immediate: boolean): Promise<Subscription> {
    const subscription = await this.findActiveSubscription(userId);
    
    if (!subscription) {
      throw new Error('No active subscription found');
    }
    
    if (immediate) {
      subscription.status = 'cancelled';
      subscription.endDate = new Date();
    } else {
      subscription.autoRenew = false;
    }
    
    subscription.updatedAt = new Date();
    await this.saveSubscription(subscription);
    
    return subscription;
  }

  async renew(userId: string): Promise<Subscription> {
    const subscription = await this.findActiveSubscription(userId);
    
    if (!subscription) {
      throw new Error('No active subscription found');
    }
    
    const plan = SUBSCRIPTION_PLANS.find(p => p.id === subscription.planId);
    
    if (!plan) {
      throw new Error('Invalid plan');
    }
    
    subscription.startDate = subscription.endDate;
    subscription.endDate = this.calculateEndDate(subscription.startDate, plan.interval);
    subscription.autoRenew = true;
    subscription.updatedAt = new Date();
    
    await this.saveSubscription(subscription);
    
    return subscription;
  }

  async getHistory(userId: string): Promise<Subscription[]> {
    return [];
  }

  private calculateEndDate(startDate: Date, interval: string): Date {
    const endDate = new Date(startDate);
    
    if (interval === 'month') {
      endDate.setMonth(endDate.getMonth() + 1);
    } else if (interval === 'year') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }
    
    return endDate;
  }

  private calculateDaysRemaining(endDate: Date): number {
    if (!endDate) return 0;
    const now = new Date();
    const diff = endDate.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  private async findActiveSubscription(userId: string): Promise<Subscription | null> {
    return null;
  }

  private async saveSubscription(subscription: Subscription): Promise<void> {
  }
}