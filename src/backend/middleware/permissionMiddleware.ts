import { Request, Response, NextFunction } from 'express';

export const permissionMiddleware = (requiredPermission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: 4001, message: 'Unauthorized' },
      });
    }
    
    const { subscriptionStatus, permissions } = req.user;
    
    if (subscriptionStatus === 'premium') {
      return next();
    }
    
    if (permissions && permissions.includes(requiredPermission)) {
      return next();
    }
    
    return res.status(403).json({
      success: false,
      error: { code: 5102, message: 'Premium subscription required for this feature' },
    });
  };
};

export const premiumOnlyMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: { code: 4001, message: 'Unauthorized' },
    });
  }
  
  if (req.user.subscriptionStatus !== 'premium') {
    return res.status(403).json({
      success: false,
      error: { code: 5102, message: 'Premium subscription required' },
    });
  }
  
  next();
};

export const checkFeatureAccess = (feature: string) => {
  const freeFeatures = ['basic_practice', 'basic_statistics', 'upload_piece', 'ocr_limited'];
  const premiumFeatures = ['advanced_analysis', 'unlimited_ocr', 'premium_pieces', 'advanced_reports', 'ai_analysis'];
  
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      if (freeFeatures.includes(feature)) {
        return next();
      }
      return res.status(401).json({
        success: false,
        error: { code: 4001, message: 'Unauthorized' },
      });
    }
    
    const { subscriptionStatus } = req.user;
    
    if (subscriptionStatus === 'premium') {
      return next();
    }
    
    if (freeFeatures.includes(feature)) {
      return next();
    }
    
    if (premiumFeatures.includes(feature)) {
      return res.status(403).json({
        success: false,
        error: { code: 5101, message: `Feature '${feature}' requires premium subscription` },
      });
    }
    
    next();
  };
};