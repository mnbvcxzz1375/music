import { Request, Response, NextFunction } from 'express';

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  
  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  
  res.status(statusCode).json({
    success: false,
    error: {
      code: statusCode >= 500 ? 6001 : 5001,
      message: err.message || 'Internal server error',
      timestamp: Date.now(),
      requestId: req.headers['x-request-id'] || 'unknown',
    },
  });
};

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const requestId = Math.random().toString(36).substring(7);
  req.headers['x-request-id'] = requestId;
  
  console.log(`[${new Date().toISOString()}] ${requestId} ${req.method} ${req.path}`);
  
  next();
};