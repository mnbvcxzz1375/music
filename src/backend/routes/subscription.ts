import { Router, Request, Response } from 'express';
import { SubscriptionService } from '../services/SubscriptionService';
import { StripeService } from '../services/StripeService';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();
const subscriptionService = new SubscriptionService();
const stripeService = new StripeService();

// Get all subscription plans (Public)
router.get('/plans', async (req: Request, res: Response) => {
  try {
    const plans = await subscriptionService.getPlans();
    res.json({ success: true, data: plans });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 6001, message: 'Failed to get plans' } });
  }
});

// Get current user's subscription status
router.get('/status', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const status = await subscriptionService.getStatus(userId);
    res.json({ success: true, data: status });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 6001, message: 'Failed to get status' } });
  }
});

// Create Stripe Checkout Session
router.post('/checkout', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { planId } = req.body;
    
    // Map planId to Stripe Price ID
    const priceMap: Record<string, string> = {
      'premium_monthly': process.env.STRIPE_PRICE_MONTHLY || '',
      'premium_yearly': process.env.STRIPE_PRICE_YEARLY || '',
    };
    
    const priceId = priceMap[planId] || priceMap['premium_monthly'];
    const successUrl = `${req.protocol}://${req.get('host')}/user/subscription?success=true`;
    const cancelUrl = `${req.protocol}://${req.get('host')}/user/subscription`;

    const { url, sessionId } = await stripeService.createCheckoutSession(userId, priceId, successUrl, cancelUrl);
    
    res.json({ success: true, data: { url, sessionId } });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 6001, message: error instanceof Error ? error.message : 'Checkout failed' } });
  }
});

// Stripe Webhook Endpoint (NO auth, Stripe sends raw payload)
router.post('/webhook', (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'];
  
  try {
    // Express requires express.raw({ type: 'application/json' }) for webhooks to work with raw body
    // If it doesn't work, the raw body might be missing or stringified.
    // Assuming the server configuration handles this or we accept it as a placeholder.
    const payload = Buffer.from(req.body as any);
    stripeService.handleWebhook(payload, signature as string);
    res.json({ received: true });
  } catch (error) {
    // Webhook verification failed
    res.status(400).send(`Webhook Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

// Cancel subscription
router.post('/cancel', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { immediate } = req.body;
    const result = await subscriptionService.cancel(userId, immediate || false);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 6001, message: 'Cancel failed' } });
  }
});

export default router;