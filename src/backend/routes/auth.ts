import { Router, Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService';
import { verifyAccessToken } from '../auth/jwt';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();
const authService = new AuthService();

// Helper for async route handling
const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Register
router.post('/register', asyncHandler(async (req: Request, res: Response) => {
  const { email, password, username, avatarUrl } = req.body;
  
  if (!email || !password || !username) {
    return res.status(400).json({
      success: false,
      message: 'Email, password, and username are required',
    });
  }

  const result = await authService.register({ email, password, username, avatarUrl });
  
  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: result,
  });
}));

// Login
router.post('/login', asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email and password are required',
    });
  }

  const result = await authService.login(email, password);
  
  res.json({
    success: true,
    message: 'Logged in successfully',
    data: result,
  });
}));

// Refresh Token
router.post('/refresh', asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    return res.status(400).json({
      success: false,
      message: 'Refresh token is required',
    });
  }

  const result = await authService.refreshToken(refreshToken);
  
  res.json({
    success: true,
    data: result,
  });
}));

// Get Current User Profile
router.get('/me', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ success: false, message: 'Not authenticated' });

  const user = await authService.getUserById(userId);
  
  res.json({
    success: true,
    data: user,
  });
}));

// Logout
router.post('/logout', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const { refreshToken } = req.body;
  
  if (!userId) return res.status(401).json({ success: false, message: 'Not authenticated' });
  if (!refreshToken) return res.status(400).json({ success: false, message: 'Refresh token is required' });
  
  await authService.logout(userId, refreshToken);
  
  res.json({
    success: true,
    message: 'Logged out successfully',
  });
}));

export default router;