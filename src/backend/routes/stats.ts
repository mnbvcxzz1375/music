import { Router, Request, Response } from 'express';
import { practiceService } from '../services/PracticeService';
import { achievementService } from '../services/AchievementService';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

/**
 * GET /api/v1/stats/summary
 * Get comprehensive summary of user stats and activity.
 */
router.get('/summary', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ success: false, error: { code: 4001, message: 'Unauthorized' } });

    const stats = await practiceService.getStats(userId);
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 6001, message: error instanceof Error ? error.message : 'Failed to fetch stats' },
    });
  }
});

/**
 * GET /api/v1/stats/achievements
 * Get list of achievements and unlock status.
 */
router.get('/achievements', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ success: false, error: { code: 4001, message: 'Unauthorized' } });

    const achievements = await achievementService.getUserAchievements(userId);
    res.json({ success: true, data: achievements });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 6001, message: error instanceof Error ? error.message : 'Failed to fetch achievements' },
    });
  }
});

export default router;
