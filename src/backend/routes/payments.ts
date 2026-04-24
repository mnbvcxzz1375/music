import { Router, Request, Response } from 'express';
import { PaymentService } from '../services/PaymentService';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();
const paymentService = new PaymentService();

router.post('/create', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { amount, currency, paymentMethod, planId } = req.body;
    
    if (!amount || !currency || !paymentMethod) {
      return res.status(400).json({
        success: false,
        error: { code: 5001, message: 'Amount, currency, and payment method are required' },
      });
    }

    const result = await paymentService.createPayment({
      userId,
      amount,
      currency,
      paymentMethod,
      planId,
    });
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: { code: 6004, message: error instanceof Error ? error.message : 'Payment creation failed' },
    });
  }
});

router.post('/confirm', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { paymentId, paymentIntentId } = req.body;
    
    if (!paymentId) {
      return res.status(400).json({
        success: false,
        error: { code: 5001, message: 'Payment ID is required' },
      });
    }

    const result = await paymentService.confirmPayment(userId, paymentId, paymentIntentId);
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: { code: 6004, message: error instanceof Error ? error.message : 'Payment confirmation failed' },
    });
  }
});

router.post('/webhook/stripe', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['stripe-signature'] as string;
    const payload = req.body;
    
    await paymentService.handleStripeWebhook(signature, payload);
    
    res.json({ received: true });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: { code: 6004, message: error instanceof Error ? error.message : 'Webhook processing failed' },
    });
  }
});

router.post('/refund', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { paymentId, reason } = req.body;
    
    if (!paymentId) {
      return res.status(400).json({
        success: false,
        error: { code: 5001, message: 'Payment ID is required' },
      });
    }

    const result = await paymentService.processRefund(userId, paymentId, reason);
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: { code: 6004, message: error instanceof Error ? error.message : 'Refund failed' },
    });
  }
});

router.get('/history', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const history = await paymentService.getPaymentHistory(userId);
    
    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 6001, message: 'Failed to get payment history' },
    });
  }
});

export default router;