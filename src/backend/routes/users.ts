import { Router, Request, Response } from 'express';
import { UserService } from '../services/UserService';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();
const userService = new UserService();

router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const user = await userService.getUser(userId);
    
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

router.put('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const updates = req.body;
    
    const user = await userService.updateUser(userId, updates);
    
    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: { code: 5001, message: error instanceof Error ? error.message : 'Update failed' },
    });
  }
});

router.get('/me/stats', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const stats = await userService.getUserStats(userId);
    
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 6001, message: 'Failed to get user stats' },
    });
  }
});

router.get('/me/settings', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const settings = await userService.getUserSettings(userId);
    
    res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 6001, message: 'Failed to get user settings' },
    });
  }
});

router.put('/me/settings', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const settings = req.body;
    
    const result = await userService.updateUserSettings(userId, settings);
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: { code: 5001, message: error instanceof Error ? error.message : 'Settings update failed' },
    });
  }
});

router.get('/me/achievements', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const achievements = await userService.getUserAchievements(userId);
    
    res.json({
      success: true,
      data: achievements,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 6001, message: 'Failed to get user achievements' },
    });
  }
});

router.get('/me/practice-history', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { page, limit } = req.query;
    
    const history = await userService.getPracticeHistory(userId, {
      page: parseInt(page as string) || 1,
      limit: parseInt(limit as string) || 20,
    });
    
    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 6001, message: 'Failed to get practice history' },
    });
  }
});

export default router;