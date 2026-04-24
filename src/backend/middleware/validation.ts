import { Request, Response, NextFunction } from 'express';
import { body, validationResult, ValidationChain } from 'express-validator';

export function validate(validations: ValidationChain[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    for (const validation of validations) {
      const result = await validation.run(req);
      if (!result.isEmpty()) break;
    }
    
    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }
    
    res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
      })),
    });
  };
}

export const validateRegister = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Invalid email address'),
  body('username')
    .isLength({ min: 3, max: 50 })
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username must be 3-50 characters and contain only letters, numbers, and underscores'),
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must be at least 8 characters with uppercase, lowercase, and number'),
];

export const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Invalid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

export const validatePiece = [
  body('title')
    .isLength({ min: 1, max: 255 })
    .trim()
    .withMessage('Title must be 1-255 characters'),
  body('composer')
    .optional()
    .isLength({ max: 255 })
    .trim(),
  body('difficulty')
    .isIn(['beginner', 'intermediate', 'advanced', 'professional'])
    .withMessage('Invalid difficulty level'),
  body('genre')
    .optional()
    .isLength({ max: 50 }),
  body('instrument')
    .optional()
    .isLength({ max: 50 }),
];

export const validateSubscription = [
  body('plan')
    .isIn(['premium', 'premium_plus'])
    .withMessage('Invalid subscription plan'),
  body('period')
    .isIn(['monthly', 'yearly'])
    .withMessage('Invalid subscription period'),
];

export const validatePayment = [
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number'),
  body('currency')
    .isLength({ min: 3, max: 3 })
    .isIn(['USD', 'CNY', 'EUR', 'GBP', 'JPY'])
    .withMessage('Invalid currency'),
  body('paymentMethod')
    .isIn(['stripe', 'alipay', 'wechat', 'apple', 'google'])
    .withMessage('Invalid payment method'),
];

export const validateSession = [
  body('pieceId')
    .isUUID()
    .withMessage('Invalid piece ID'),
  body('startTime')
    .isISO8601()
    .toDate()
    .withMessage('Invalid start time'),
  body('endTime')
    .isISO8601()
    .toDate()
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.startTime)) {
        throw new Error('End time must be after start time');
      }
      return true;
    }),
  body('durationSeconds')
    .isInt({ min: 1 })
    .withMessage('Duration must be a positive integer'),
];

export const validateIdParam = [
  body('id')
    .isUUID()
    .withMessage('Invalid ID format'),
];

export function sanitizeInput(req: Request, res: Response, next: NextFunction) {
  const sanitize = (obj: unknown): unknown => {
    if (typeof obj === 'string') {
      return obj.trim();
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }
    if (obj && typeof obj === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = sanitize(value);
      }
      return result;
    }
    return obj;
  };
  
  req.body = sanitize(req.body);
  req.query = sanitize(req.query) as Record<string, string>;
  req.params = sanitize(req.params) as Record<string, string>;
  
  next();
}