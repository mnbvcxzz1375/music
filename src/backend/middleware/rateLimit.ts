import { Request, Response, NextFunction } from 'express';
import { incr, get, expire, del } from '../db/redis';

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: Request) => string;
  skipCondition?: (req: Request) => boolean;
  message?: string;
}

const defaultConfig: RateLimitConfig = {
  windowMs: 60000,
  maxRequests: 100,
  message: 'Too many requests, please try again later.',
};

export function rateLimit(config: Partial<RateLimitConfig> = {}) {
  const finalConfig = { ...defaultConfig, ...config };
  
  return async (req: Request, res: Response, next: NextFunction) => {
    if (finalConfig.skipCondition?.(req)) {
      return next();
    }
    
    const key = finalConfig.keyGenerator?.(req) || 
      `rate_limit:${req.ip}:${req.path}`;
    
    try {
      const current = await incr(key);
      
      if (current === 1) {
        await expire(key, Math.floor(finalConfig.windowMs / 1000));
      }
      
      if (current > finalConfig.maxRequests) {
        const ttl = await getTtl(key);
        
        res.setHeader('X-RateLimit-Limit', finalConfig.maxRequests.toString());
        res.setHeader('X-RateLimit-Remaining', '0');
        res.setHeader('X-RateLimit-Reset', ttl.toString());
        
        return res.status(429).json({
          error: finalConfig.message,
          retryAfter: ttl,
        });
      }
      
      res.setHeader('X-RateLimit-Limit', finalConfig.maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', (finalConfig.maxRequests - current).toString());
      
      next();
    } catch (error) {
      console.error('Rate limit error:', error);
      next();
    }
  };
}

async function getTtl(key: string): Promise<number> {
  const client = await import('../db/redis').then(m => m.getRedis());
  return client.ttl(key);
}

export function authRateLimit() {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    maxRequests: 5,
    keyGenerator: (req) => `auth_limit:${req.ip}`,
    message: 'Too many authentication attempts, please try again later.',
    skipCondition: (req) => req.method !== 'POST',
  });
}

export function apiRateLimit() {
  return rateLimit({
    windowMs: 60000,
    maxRequests: 60,
    keyGenerator: (req) => `api_limit:${req.user?.id || req.ip}`,
  });
}

export function uploadRateLimit() {
  return rateLimit({
    windowMs: 60 * 60 * 1000,
    maxRequests: 10,
    keyGenerator: (req) => `upload_limit:${req.user?.id || req.ip}`,
    message: 'Too many uploads, please try again later.',
  });
}

export function strictRateLimit() {
  return rateLimit({
    windowMs: 60000,
    maxRequests: 10,
    keyGenerator: (req) => `strict_limit:${req.user?.id || req.ip}`,
  });
}

export function clearRateLimit(req: Request) {
  const key = `rate_limit:${req.ip}:${req.path}`;
  return del(key);
}