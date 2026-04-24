import cors from 'cors';
import helmet from 'helmet';
import { Request, Response, NextFunction } from 'express';

export const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const allowedOrigins = [
      'http://localhost:5174',
      'http://localhost:3000',
      'https://musicpractice.app',
      'https://www.musicpractice.app',
    ];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  maxAge: 86400,
};

export const corsMiddleware = cors(corsOptions);

export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://api.musicpractice.app'],
      fontSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  noSniff: true,
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin',
  },
  xssFilter: true,
});

export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  
  const csrfToken = req.headers['x-csrf-token'] || req.body._csrf;
  const sessionToken = req.headers['x-session-token'];
  
  if (!csrfToken || !sessionToken) {
    return res.status(403).json({ error: 'CSRF token missing' });
  }
  
  next();
}

export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  next();
}

export function ipWhitelist(allowedIps: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIp = req.ip || req.headers['x-forwarded-for']?.toString().split(',')[0].trim();
    
    if (!allowedIps.includes(clientIp || '')) {
      return res.status(403).json({ error: 'IP not allowed' });
    }
    
    next();
  };
}

export function adminOnly(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  next();
}

export function premiumOnly(req: Request, res: Response, next: NextFunction) {
  if (!req.user?.isPremium) {
    return res.status(403).json({ error: 'Premium subscription required' });
  }
  
  next();
}