import { Router, Request, Response } from 'express';
import { SubscriptionService } from '../services/SubscriptionService';
import { authMiddleware } from '../middleware/authMiddleware';
import { permissionMiddleware } from '../middleware/permissionMiddleware';

const router = Router();
const subscriptionService = new SubscriptionService();

router.get('/plans', async (req: Request, res: Response) => {
  try {
    const plans = await subscriptionService.getPlans();
    
    res.json({
      success: true,
      data: plans,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 6001, message: 'Failed to get subscription plans' },
    });
  }
});

router.get('/status', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const status = await subscriptionService.getStatus(userId);
    
    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 6001, message: 'Failed to get subscription status' },
    });
  }
});

router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { planId, paymentMethodId } = req.body;
    
    if (!planId || !paymentMethodId) {
      return res.status(400).json({
        success: false,
        error: { code: 5001, message: 'Plan ID and payment method are required' },
      });
    }

    const result = await subscriptionService.create(userId, planId, paymentMethodId);
    
    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: { code: 5003, message: error instanceof Error ? error.message : 'Subscription creation failed' },
    });
  }
});

router.put('/cancel', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { immediate } = req.body;
    
    const result = await subscriptionService.cancel(userId, immediate);
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: { code: 5003, message: error instanceof Error ? error.message : 'Cancellation failed' },
    });
  }
});

router.post('/renew', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    
    const result = await subscriptionService.renew(userId);
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: { code: 5003, message: error instanceof Error ? error.message : 'Renewal failed' },
    });
  }
});

router.get('/history', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const history = await subscriptionService.getHistory(userId);
    
    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 6001, message: 'Failed to get subscription history' },
    });
  }
});

export default router;