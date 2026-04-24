import { Router, Request, Response } from 'express';
import { AuthService } from '../services/AuthService';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();
const authService = new AuthService();

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, nickname } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: { code: 4001, message: 'Email and password are required' },
      });
    }

    const result = await authService.register({ email, password, nickname });
    
    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: { code: 5001, message: error instanceof Error ? error.message : 'Registration failed' },
    });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: { code: 4001, message: 'Email and password are required' },
      });
    }

    const result = await authService.login({ email, password });
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: { code: 4001, message: error instanceof Error ? error.message : 'Login failed' },
    });
  }
});

router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: { code: 4003, message: 'Refresh token is required' },
      });
    }

    const result = await authService.refreshToken(refreshToken);
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: { code: 4004, message: 'Invalid or expired refresh token' },
    });
  }
});

router.post('/logout', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { refreshToken } = req.body;
    
    await authService.logout(userId, refreshToken);
    
    res.json({
      success: true,
      data: { message: 'Logged out successfully' },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 6001, message: 'Logout failed' },
    });
  }
});

router.post('/oauth/google', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        error: { code: 4005, message: 'Google token is required' },
      });
    }

    const result = await authService.oauthGoogle(token);
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: { code: 4005, message: 'Google authentication failed' },
    });
  }
});

router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const user = await authService.getUserById(userId);
    
    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      error: { code: 5001, message: 'User not found' },
    });
  }
});

export default router;