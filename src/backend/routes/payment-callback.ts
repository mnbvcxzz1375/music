import { Router } from 'express';
import { 
  createCheckoutSession, 
  handleWebhookEvent, 
  getStripePaymentStatus 
} from '../payment/stripe';
import { 
  createAlipayOrder, 
  handleAlipayNotify, 
  getAlipayPaymentStatus 
} from '../payment/alipay';
import { 
  createWechatOrder, 
  handleWechatNotify, 
  getWechatPaymentStatus 
} from '../payment/wechat';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.post('/stripe/create', authMiddleware, async (req, res) => {
  try {
    const { plan, period } = req.body;
    const userId = req.user?.id;
    const email = req.user?.email;
    
    if (!userId || !email) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const result = await createCheckoutSession({
      userId,
      plan,
      period,
      email,
    });
    
    res.json({
      sessionId: result.sessionId,
      paymentId: result.paymentId,
    });
  } catch (error) {
    console.error('Stripe create error:', error);
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

router.post('/stripe/webhook', async (req, res) => {
  try {
    const signature = req.headers['stripe-signature'] as string;
    const payload = JSON.stringify(req.body);
    
    await handleWebhookEvent(payload, signature);
    res.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook error:', error);
    res.status(400).json({ error: 'Webhook error' });
  }
});

router.get('/stripe/status/:paymentId', async (req, res) => {
  try {
    const payment = await getStripePaymentStatus(req.params.paymentId);
    res.json(payment);
  } catch (error) {
    console.error('Stripe status error:', error);
    res.status(500).json({ error: 'Failed to get payment status' });
  }
});

router.post('/alipay/create', authMiddleware, async (req, res) => {
  try {
    const { plan, period } = req.body;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const result = await createAlipayOrder({
      userId,
      plan,
      period,
    });
    
    res.json({
      paymentUrl: result.paymentUrl,
      paymentId: result.paymentId,
    });
  } catch (error) {
    console.error('Alipay create error:', error);
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

router.post('/alipay/notify', async (req, res) => {
  try {
    const params = req.body;
    const success = await handleAlipayNotify(params);
    
    if (success) {
      res.send('success');
    } else {
      res.send('fail');
    }
  } catch (error) {
    console.error('Alipay notify error:', error);
    res.send('fail');
  }
});

router.get('/alipay/status/:paymentId', async (req, res) => {
  try {
    const payment = await getAlipayPaymentStatus(req.params.paymentId);
    res.json(payment);
  } catch (error) {
    console.error('Alipay status error:', error);
    res.status(500).json({ error: 'Failed to get payment status' });
  }
});

router.post('/wechat/create', authMiddleware, async (req, res) => {
  try {
    const { plan, period, openid } = req.body;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const result = await createWechatOrder({
      userId,
      plan,
      period,
      openid,
    });
    
    res.json({
      codeUrl: result.codeUrl,
      paymentId: result.paymentId,
    });
  } catch (error) {
    console.error('Wechat create error:', error);
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

router.post('/wechat/notify', async (req, res) => {
  try {
    const headers = {
      'wechatpay-timestamp': req.headers['wechatpay-timestamp'] as string,
      'wechatpay-nonce': req.headers['wechatpay-nonce'] as string,
      'wechatpay-signature': req.headers['wechatpay-signature'] as string,
      'wechatpay-serial': req.headers['wechatpay-serial'] as string,
    };
    
    const body = JSON.stringify(req.body);
    const result = await handleWechatNotify(headers, body);
    
    if (result.success) {
      res.json({ code: 'SUCCESS', message: '成功' });
    } else {
      res.json({ code: 'FAIL', message: result.message });
    }
  } catch (error) {
    console.error('Wechat notify error:', error);
    res.json({ code: 'FAIL', message: '处理失败' });
  }
});

router.get('/wechat/status/:paymentId', async (req, res) => {
  try {
    const payment = await getWechatPaymentStatus(req.params.paymentId);
    res.json(payment);
  } catch (error) {
    console.error('Wechat status error:', error);
    res.status(500).json({ error: 'Failed to get payment status' });
  }
});

export default router;