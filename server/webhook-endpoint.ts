/**
 * Endpoint webhook pour Stripe
 * 
 * À ajouter dans server/_core/index.ts :
 * 
 * import { handleStripeWebhook } from '../webhook-endpoint';
 * app.post('/api/webhooks/stripe', handleStripeWebhook);
 */

import { Request, Response } from 'express';
import { getStripeWebhooksManager } from './stripe-webhooks';
import { getLogger } from './logging';

const logger = getLogger();

/**
 * Endpoint webhook Stripe
 */
export async function handleStripeWebhook(req: Request, res: Response): Promise<void> {
  try {
    const signature = req.headers['stripe-signature'] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

    if (!signature) {
      logger.warn('Webhook request missing signature');
      res.status(400).json({ error: 'Missing signature' });
      return;
    }

    if (!webhookSecret) {
      logger.error('Webhook secret not configured');
      res.status(500).json({ error: 'Webhook secret not configured' });
      return;
    }

    // Vérifier la signature du webhook
    const manager = getStripeWebhooksManager();
    const event = manager.verifyWebhookSignature(
      req.body as string,
      signature,
      webhookSecret
    );

    if (!event) {
      logger.warn('Webhook signature verification failed');
      res.status(400).json({ error: 'Invalid signature' });
      return;
    }

    // Traiter l'événement
    await manager.handleWebhookEvent(event);

    // Répondre avec succès
    res.status(200).json({ received: true });
  } catch (error) {
    logger.error('Webhook error', { error });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

/**
 * Endpoint pour tester les webhooks (développement uniquement)
 */
export async function testStripeWebhook(req: Request, res: Response): Promise<void> {
  try {
    const manager = getStripeWebhooksManager();

    // Créer un événement de test
    const testEvent = {
      id: 'evt_test_' + Date.now(),
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_test_' + Date.now(),
          amount: 10000,
          currency: 'usd',
          status: 'succeeded',
        },
      },
      created: Math.floor(Date.now() / 1000),
    };

    await manager.handleWebhookEvent(testEvent as any);

    res.status(200).json({
      success: true,
      message: 'Test webhook processed',
      event: testEvent,
    });
  } catch (error) {
    logger.error('Test webhook error', { error });
    res.status(500).json({ error: 'Test webhook processing failed' });
  }
}
