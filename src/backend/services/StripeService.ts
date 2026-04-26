import Stripe from 'stripe';
import { createSubscription, updateSubscription, getSubscriptionByUserId } from '../db/subscriptions';
import { Subscription } from '../models/Subscription';

// Initialize Stripe SDK
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-04-30.basil',
});

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

export class StripeService {
  /**
   * Creates a Stripe Checkout Session.
   */
  async createCheckoutSession(userId: string, priceId: string, successUrl: string, cancelUrl: string) {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId,
      },
    });

    return { url: session.url, sessionId: session.id };
  }

  /**
   * Handles Stripe Webhook Events.
   */
  async handleWebhook(payload: Buffer, signature: string) {
    const event = stripe.webhooks.constructEvent(payload, signature, WEBHOOK_SECRET);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;

        if (!userId) {
          console.error('Missing userId in Stripe session metadata');
          return;
        }

        // Calculate dates
        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 1); // Default 1 month, or check priceId

        // Check if subscription exists
        const existingSub = await getSubscriptionByUserId(userId);

        if (existingSub) {
          await updateSubscription(existingSub.id, { status: 'active', endDate });
        } else {
          // Note: createSubscription expects (userId, plan, startDate, endDate, autoRenew)
          // Map priceId to internal plan ID logic here if necessary, defaulting to 'premium'
          const planId = 'premium'; 
          await createSubscription(userId, 'premium', startDate, endDate, true);
        }
        console.log(`Subscription activated for user ${userId}`);
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        // Handle cancellations/updates if we have Stripe Customer ID mapping
        break;
      }
    }
  }
}

export const stripeService = new StripeService();