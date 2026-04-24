import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

export interface SubscriptionState {
  plans: SubscriptionPlan[];
  currentStatus: SubscriptionStatus | null;
  loading: boolean;
  error: string | null;
  
  fetchPlans: () => Promise<void>;
  fetchStatus: () => Promise<void>;
  subscribe: (planId: string, paymentMethodId: string) => Promise<void>;
  cancel: (immediate: boolean) => Promise<void>;
  renew: () => Promise<void>;
  
  isPremium: () => boolean;
  hasFeature: (feature: string) => boolean;
  checkLimit: (limitType: 'ocr' | 'pieces', currentUsage: number) => boolean;
}

const DEFAULT_PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    name: '免费版',
    price: 0,
    currency: 'USD',
    interval: 'month',
    features: ['basic_practice', 'basic_statistics', 'upload_piece', 'ocr_limited'],
    limits: { ocrPerMonth: 5, piecesPerMonth: 10 },
  },
  {
    id: 'premium_monthly',
    name: 'Premium 月度',
    price: 9.99,
    currency: 'USD',
    interval: 'month',
    features: ['premium', 'advanced_analysis', 'unlimited_ocr', 'premium_pieces', 'advanced_reports', 'ai_analysis'],
    limits: {},
    isPremium: true,
  },
  {
    id: 'premium_yearly',
    name: 'Premium 年度',
    price: 79.99,
    currency: 'USD',
    interval: 'year',
    features: ['premium', 'advanced_analysis', 'unlimited_ocr', 'premium_pieces', 'advanced_reports', 'ai_analysis'],
    limits: {},
    isPremium: true,
    discount: 17,
  },
];

const FREE_STATUS: SubscriptionStatus = {
  status: 'free',
  plan: DEFAULT_PLANS[0],
  isActive: false,
  expiresAt: null,
  autoRenew: false,
};

const FEATURE_LABELS: Record<string, string> = {
  basic_practice: '基础练习',
  basic_statistics: '基础统计',
  upload_piece: '曲目上传',
  ocr_limited: 'OCR导入(每月5次)',
  premium: 'Premium会员',
  advanced_analysis: '高级分析',
  unlimited_ocr: '无限OCR导入',
  premium_pieces: 'Premium曲目',
  advanced_reports: '高级报告导出',
  ai_analysis: 'AI练习建议',
};

export const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set, get) => ({
      plans: DEFAULT_PLANS,
      currentStatus: FREE_STATUS,
      loading: false,
      error: null,

      fetchPlans: async () => {
        set({ loading: true, error: null });
        
        try {
          set({ plans: DEFAULT_PLANS, loading: false });
        } catch (err) {
          set({ error: err instanceof Error ? err.message : 'Failed to fetch plans', loading: false });
        }
      },

      fetchStatus: async () => {
        set({ loading: true, error: null });
        
        try {
          set({ currentStatus: FREE_STATUS, loading: false });
        } catch (err) {
          set({ error: err instanceof Error ? err.message : 'Failed to fetch status', loading: false });
        }
      },

      subscribe: async (planId, paymentMethodId) => {
        set({ loading: true, error: null });
        
        try {
          const plan = get().plans.find(p => p.id === planId);
          if (!plan) throw new Error('Invalid plan');
          
          const newStatus: SubscriptionStatus = {
            status: 'premium',
            plan,
            isActive: true,
            expiresAt: new Date(Date.now() + (plan.interval === 'month' ? 30 : 365) * 24 * 60 * 60 * 1000),
            autoRenew: true,
            daysRemaining: plan.interval === 'month' ? 30 : 365,
          };
          
          set({ currentStatus: newStatus, loading: false });
        } catch (err) {
          set({ error: err instanceof Error ? err.message : 'Subscription failed', loading: false });
        }
      },

      cancel: async (immediate) => {
        set({ loading: true, error: null });
        
        try {
          const currentStatus = get().currentStatus;
          if (!currentStatus || currentStatus.status === 'free') {
            throw new Error('No active subscription');
          }
          
          const newStatus: SubscriptionStatus = immediate
            ? { ...FREE_STATUS }
            : { ...currentStatus, autoRenew: false };
          
          set({ currentStatus: newStatus, loading: false });
        } catch (err) {
          set({ error: err instanceof Error ? err.message : 'Cancellation failed', loading: false });
        }
      },

      renew: async () => {
        set({ loading: true, error: null });
        
        try {
          const currentStatus = get().currentStatus;
          if (!currentStatus || currentStatus.status === 'free') {
            throw new Error('No active subscription');
          }
          
          const plan = currentStatus.plan;
          const newEndDate = new Date(Date.now() + (plan.interval === 'month' ? 30 : 365) * 24 * 60 * 60 * 1000);
          
          set({
            currentStatus: {
              ...currentStatus,
              expiresAt: newEndDate,
              autoRenew: true,
              daysRemaining: plan.interval === 'month' ? 30 : 365,
            },
            loading: false,
          });
        } catch (err) {
          set({ error: err instanceof Error ? err.message : 'Renewal failed', loading: false });
        }
      },

      isPremium: () => {
        const status = get().currentStatus;
        return status?.status === 'premium' && status.isActive;
      },

      hasFeature: (feature) => {
        const status = get().currentStatus;
        if (!status) return false;
        return status.plan.features.includes(feature);
      },

      checkLimit: (limitType, currentUsage) => {
        const status = get().currentStatus;
        if (!status) return false;
        
        if (status.status === 'premium') return true;
        
        const limits = status.plan.limits;
        if (limitType === 'ocr') {
          return currentUsage < (limits.ocrPerMonth || 5);
        }
        if (limitType === 'pieces') {
          return currentUsage < (limits.piecesPerMonth || 10);
        }
        
        return true;
      },
    }),
    {
      name: 'subscription-storage',
    }
  )
);

export function getSubscriptionStore() {
  return useSubscriptionStore.getState();
}

export { FEATURE_LABELS };