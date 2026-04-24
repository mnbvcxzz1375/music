import { useSubscriptionStore } from '@/services/subscription';

export type Feature = 
  | 'basic_practice'
  | 'basic_statistics'
  | 'upload_piece'
  | 'ocr_limited'
  | 'premium'
  | 'advanced_analysis'
  | 'unlimited_ocr'
  | 'premium_pieces'
  | 'advanced_reports'
  | 'ai_analysis';

export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  upgradeRequired?: boolean;
  upgradeMessage?: string;
}

const FEATURE_DESCRIPTIONS: Record<Feature, string> = {
  basic_practice: '基础练习功能',
  basic_statistics: '基础统计功能',
  upload_piece: '曲目上传功能',
  ocr_limited: 'OCR导入功能（每月限制5次）',
  premium: 'Premium会员特权',
  advanced_analysis: '高级练习分析',
  unlimited_ocr: '无限OCR导入',
  premium_pieces: 'Premium专属曲目',
  advanced_reports: '高级报告导出',
  ai_analysis: 'AI练习建议',
};

const PREMIUM_FEATURES: Feature[] = [
  'premium',
  'advanced_analysis',
  'unlimited_ocr',
  'premium_pieces',
  'advanced_reports',
  'ai_analysis',
];

const FREE_FEATURES: Feature[] = [
  'basic_practice',
  'basic_statistics',
  'upload_piece',
  'ocr_limited',
];

export class PermissionService {
  checkFeature(feature: Feature): PermissionCheckResult {
    const subscriptionStore = useSubscriptionStore.getState();
    
    if (subscriptionStore.isPremium()) {
      return { allowed: true };
    }
    
    if (FREE_FEATURES.includes(feature)) {
      return { allowed: true };
    }
    
    if (PREMIUM_FEATURES.includes(feature)) {
      return {
        allowed: false,
        reason: '此功能需要Premium会员',
        upgradeRequired: true,
        upgradeMessage: `升级到Premium会员以解锁「${FEATURE_DESCRIPTIONS[feature]}」功能`,
      };
    }
    
    return { allowed: true };
  }

  checkPieceAccess(pieceId: string, isPremiumPiece: boolean): PermissionCheckResult {
    const subscriptionStore = useSubscriptionStore.getState();
    
    if (!isPremiumPiece) {
      return { allowed: true };
    }
    
    if (subscriptionStore.isPremium()) {
      return { allowed: true };
    }
    
    return {
      allowed: false,
      reason: '此曲目为Premium专属',
      upgradeRequired: true,
      upgradeMessage: '升级到Premium会员以解锁此曲目',
    };
  }

  checkOCRLimit(currentUsage: number): PermissionCheckResult {
    const subscriptionStore = useSubscriptionStore.getState();
    
    if (subscriptionStore.isPremium()) {
      return { allowed: true };
    }
    
    const allowed = subscriptionStore.checkLimit('ocr', currentUsage);
    
    if (!allowed) {
      return {
        allowed: false,
        reason: '本月OCR次数已用完',
        upgradeRequired: true,
        upgradeMessage: '升级到Premium会员以获得无限OCR导入',
      };
    }
    
    return { allowed: true };
  }

  checkPieceUploadLimit(currentUsage: number): PermissionCheckResult {
    const subscriptionStore = useSubscriptionStore.getState();
    
    if (subscriptionStore.isPremium()) {
      return { allowed: true };
    }
    
    const allowed = subscriptionStore.checkLimit('pieces', currentUsage);
    
    if (!allowed) {
      return {
        allowed: false,
        reason: '本月曲目上传数量已达上限',
        upgradeRequired: true,
        upgradeMessage: '升级到Premium会员以获得无限曲目上传',
      };
    }
    
    return { allowed: true };
  }

  getUpgradeMessage(feature: Feature): string {
    return `升级到Premium会员以解锁「${FEATURE_DESCRIPTIONS[feature]}」功能`;
  }
}

export const permissionService = new PermissionService();

export function usePermission() {
  const subscriptionStore = useSubscriptionStore();
  
  const isPremium = subscriptionStore.isPremium();
  
  const checkFeature = (feature: Feature): PermissionCheckResult => {
    return permissionService.checkFeature(feature);
  };
  
  const checkPieceAccess = (pieceId: string, isPremiumPiece: boolean): PermissionCheckResult => {
    return permissionService.checkPieceAccess(pieceId, isPremiumPiece);
  };
  
  const checkOCRLimit = (currentUsage: number): PermissionCheckResult => {
    return permissionService.checkOCRLimit(currentUsage);
  };
  
  const checkPieceUploadLimit = (currentUsage: number): PermissionCheckResult => {
    return permissionService.checkPieceUploadLimit(currentUsage);
  };
  
  return {
    isPremium,
    checkFeature,
    checkPieceAccess,
    checkOCRLimit,
    checkPieceUploadLimit,
  };
}