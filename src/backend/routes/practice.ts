import { Router, Request, Response } from 'express';
import { practiceService } from '../services/PracticeService';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

/**
 * POST /api/v1/practice/sessions
 * Record a new practice session.
 */
router.post('/sessions', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const payload = req.body;

    if (!userId) return res.status(401).json({ success: false, error: { code: 4001, message: 'Unauthorized' } });

    const session = await practiceService.recordSession({
      ...payload,
      userId,
      errors: payload.errors || [],
    });

    res.status(201).json({ success: true, data: session });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 6001, message: error instanceof Error ? error.message : 'Failed to record session' },
    });
  }
});

/**
 * GET /api/v1/practice/sessions
 * Get practice history.
 */
router.get('/sessions', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ success: false, error: { code: 4001, message: 'Unauthorized' } });

    const { pieceId, limit, page } = req.query;
    const filter = {
      userId,
      pieceId: (pieceId as string) || undefined,
      limit: parseInt(limit as string) || 20,
      page: parseInt(page as string) || 1,
    };

    const sessions = await practiceService.getSessions(filter);
    res.json({ success: true, data: sessions });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 6001, message: error instanceof Error ? error.message : 'Failed to fetch sessions' },
    });
  }
});

/**
 * GET /api/v1/practice/stats
 * Get user statistics summary.
 */
router.get('/stats', authMiddleware, async (req: Request, res: Response) => {
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

export default router;
