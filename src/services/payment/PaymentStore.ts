import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  PlanType,
  Subscription,
  Plan,
  Permission,
  UserPermissions,
  CheckoutSession,
} from './types';

interface PaymentState {
  subscription: Subscription | null;
  permissions: UserPermissions;
  plans: Plan[];
  
  getSubscription: () => Subscription | null;
  setSubscription: (subscription: Subscription) => void;
  cancelSubscription: () => void;
  
  getPermissions: () => Permission[];
  checkPermission: (permission: Permission) => boolean;
  setPermissions: (planType: PlanType) => void;
  
  getPlans: () => Plan[];
  
  createCheckoutSession: (planType: PlanType) => Promise<CheckoutSession>;
  handlePaymentSuccess: (sessionId: string) => void;
  handlePaymentFailure: () => void;
  
  requestRefund: (reason: string) => Promise<boolean>;
}

const generateId = () => `id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const defaultPlans: Plan[] = [
  {
    id: 'free',
    name: '免费版',
    price: 0,
    currency: 'USD',
    period: 'forever',
    features: [
      '基础练习功能',
      '5首免费曲目',
      '基础统计',
    ],
  },
  {
    id: 'premium_monthly',
    name: 'Premium 月付',
    price: 9.99,
    currency: 'USD',
    period: 'month',
    features: [
      '无限曲目',
      '高级统计',
      'OCR导入',
      '成就系统',
      '官方曲库',
    ],
    recommended: true,
  },
  {
    id: 'premium_yearly',
    name: 'Premium 年付',
    price: 79.99,
    currency: 'USD',
    period: 'year',
    features: [
      'Premium权益',
      '优先支持',
      '年付优惠',
    ],
  },
  {
    id: 'pro_monthly',
    name: 'Pro 月付',
    price: 19.99,
    currency: 'USD',
    period: 'month',
    features: [
      'Premium权益',
      '复音检测',
      'AI分析',
      '详细统计导出',
    ],
  },
  {
    id: 'teacher_monthly',
    name: '教师版',
    price: 49.99,
    currency: 'USD',
    period: 'month',
    features: [
      'Pro权益',
      '学生管理',
      '班级功能',
      '优先支持',
    ],
  },
];

const planPermissions: Record<PlanType, Permission[]> = {
  free: ['basic_practice', 'limited_pieces'],
  premium_monthly: ['basic_practice', 'full_pieces', 'ocr_import', 'stats_export', 'achievements'],
  premium_yearly: ['basic_practice', 'full_pieces', 'ocr_import', 'stats_export', 'achievements'],
  pro_monthly: ['basic_practice', 'full_pieces', 'ocr_import', 'stats_export', 'achievements', 'polyphonic', 'ai_analysis'],
  teacher_monthly: ['basic_practice', 'full_pieces', 'ocr_import', 'stats_export', 'achievements', 'polyphonic', 'ai_analysis', 'student_management'],
};

const defaultUserId = 'user-default';

export const usePaymentStore = create<PaymentState>()(
  persist(
    (set, get) => ({
      subscription: null,
      permissions: {
        userId: defaultUserId,
        subscription: 'free',
        permissions: planPermissions['free'],
      },
      plans: defaultPlans,

      getSubscription: () => get().subscription,

      setSubscription: (subscription) => {
        set({ subscription });
        get().setPermissions(subscription.planType);
      },

      cancelSubscription: () => {
        const current = get().subscription;
        if (current) {
          set({
            subscription: {
              ...current,
              status: 'cancelled',
              autoRenew: false,
              updatedAt: new Date(),
            },
          });
        }
      },

      getPermissions: () => get().permissions.permissions,

      checkPermission: (permission) => {
        return get().permissions.permissions.includes(permission);
      },

      setPermissions: (planType) => {
        set({
          permissions: {
            userId: defaultUserId,
            subscription: planType,
            permissions: planPermissions[planType],
          },
        });
      },

      getPlans: () => get().plans,

      createCheckoutSession: async (planType) => {
        const plan = get().plans.find((p) => p.id === planType);
        if (!plan) {
          throw new Error('Plan not found');
        }

        const sessionId = generateId();
        const mockUrl = `https://checkout.stripe.com/mock/${sessionId}`;

        return {
          id: sessionId,
          url: mockUrl,
          planType,
          successUrl: window.location.origin + '/payment/success',
          cancelUrl: window.location.origin + '/payment/cancel',
        };
      },

      handlePaymentSuccess: (sessionId) => {
        const session = JSON.parse(localStorage.getItem('pending-checkout') || '{}');
        const planType = session.planType || 'premium_monthly';
        
        const now = new Date();
        const endDate = new Date(now);
        if (planType.includes('yearly')) {
          endDate.setFullYear(endDate.getFullYear() + 1);
        } else if (planType.includes('monthly')) {
          endDate.setMonth(endDate.getMonth() + 1);
        }

        const subscription: Subscription = {
          id: generateId(),
          userId: defaultUserId,
          planType,
          status: 'active',
          startDate: now,
          endDate: endDate,
          autoRenew: true,
          paymentProvider: 'stripe',
          stripeSubscriptionId: `stripe-${sessionId}`,
          stripeCustomerId: `customer-${defaultUserId}`,
          createdAt: now,
          updatedAt: now,
        };

        get().setSubscription(subscription);
        localStorage.removeItem('pending-checkout');
      },

      handlePaymentFailure: () => {
        localStorage.removeItem('pending-checkout');
      },

      requestRefund: async (_reason) => {
        const subscription = get().subscription;
        if (!subscription) {
          return false;
        }

        const startDate = new Date(subscription.startDate);
        const now = new Date();
        const daysSincePurchase = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysSincePurchase > 7) {
          return false;
        }

        set({
          subscription: {
            ...subscription,
            status: 'cancelled',
            updatedAt: now,
          },
          permissions: {
            userId: defaultUserId,
            subscription: 'free',
            permissions: planPermissions['free'],
          },
        });

        return true;
      },
    }),
    {
      name: 'payment-storage',
    }
  )
);

export function getPaymentStore() {
  return usePaymentStore.getState();
}

export function startCheckout(planType: PlanType): void {
  const session = {
    planType,
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem('pending-checkout', JSON.stringify(session));
}