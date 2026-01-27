/**
 * Module de gestion des webhooks Stripe
 * 
 * Gère :
 * - Événements de paiement
 * - Événements d'abonnement
 * - Événements de facturation
 * - Vérification de signature
 * - Logging des événements
 */

import { getLogger } from './logging';
import Stripe from 'stripe';

const logger = getLogger();

// Initialiser Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-10-29.clover' as any,
});

/**
 * Interface pour un événement webhook
 */
export interface WebhookEvent {
  id: string;
  type: string;
  data: any;
  timestamp: Date;
  processed: boolean;
}

/**
 * Classe pour gérer les webhooks Stripe
 */
export class StripeWebhooksManager {
  /**
   * Vérifier la signature d'un webhook
   */
  verifyWebhookSignature(body: string, signature: string, secret: string): Stripe.Event | null {
    try {
      const event = stripe.webhooks.constructEvent(body, signature, secret);
      logger.info('Webhook signature verified', { eventId: event.id, eventType: event.type });
      return event;
    } catch (error) {
      logger.error('Webhook signature verification failed', { error });
      return null;
    }
  }

  /**
   * Traiter un événement de paiement réussi
   */
  async handlePaymentIntentSucceeded(event: Stripe.Event): Promise<void> {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;

    logger.info('Payment intent succeeded', {
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
    });

    // Mettre à jour le statut du paiement dans la base de données
    // UPDATE payments SET status = 'completed', stripe_payment_id = ? WHERE id = ?
    
    // Envoyer une notification à l'utilisateur
    // await notifyUser({ type: 'payment_succeeded', amount, currency })
    
    // Envoyer une notification au créateur (si applicable)
    // await notifyCreator({ type: 'received_payment', amount, currency })
  }

  /**
   * Traiter un événement de paiement échoué
   */
  async handlePaymentIntentFailed(event: Stripe.Event): Promise<void> {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;

    logger.warn('Payment intent failed', {
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      lastPaymentError: (paymentIntent as any).last_payment_error,
    });

    // Mettre à jour le statut du paiement dans la base de données
    // UPDATE payments SET status = 'failed', error_message = ? WHERE id = ?
    
    // Envoyer une notification à l'utilisateur
    // await notifyUser({ type: 'payment_failed', reason: lastPaymentError })
    
    // Permettre à l'utilisateur de réessayer
    // await createRetryToken({ paymentId, expiresIn: '24h' })
  }

  /**
   * Traiter un événement d'abonnement créé
   */
  async handleCustomerSubscriptionCreated(event: Stripe.Event): Promise<void> {
    const subscription = event.data.object as Stripe.Subscription;

    logger.info('Customer subscription created', {
      subscriptionId: subscription.id,
      customerId: subscription.customer,
      status: subscription.status,
    });

    // TODO: Mettre à jour la base de données avec le nouvel abonnement
    // TODO: Envoyer une notification à l'utilisateur
  }

  /**
   * Traiter un événement d'abonnement mis à jour
   */
  async handleCustomerSubscriptionUpdated(event: Stripe.Event): Promise<void> {
    const subscription = event.data.object as Stripe.Subscription;

    logger.info('Customer subscription updated', {
      subscriptionId: subscription.id,
      customerId: subscription.customer,
      status: subscription.status,
    });

    // TODO: Mettre à jour la base de données avec l'abonnement mis à jour
    // TODO: Envoyer une notification à l'utilisateur si le statut a changé
  }

  /**
   * Traiter un événement d'abonnement supprimé
   */
  async handleCustomerSubscriptionDeleted(event: Stripe.Event): Promise<void> {
    const subscription = event.data.object as Stripe.Subscription;

    logger.info('Customer subscription deleted', {
      subscriptionId: subscription.id,
      customerId: subscription.customer,
    });

    // TODO: Mettre à jour la base de données avec l'abonnement supprimé
    // TODO: Envoyer une notification à l'utilisateur
  }

  /**
   * Traiter un événement de facture créée
   */
  async handleInvoiceCreated(event: Stripe.Event): Promise<void> {
    const invoice = event.data.object as Stripe.Invoice;

    logger.info('Invoice created', {
      invoiceId: invoice.id,
      customerId: invoice.customer,
      amount: invoice.amount_due,
      currency: invoice.currency,
    });

    // TODO: Mettre à jour la base de données avec la nouvelle facture
    // TODO: Envoyer une notification à l'utilisateur
  }

  /**
   * Traiter un événement de facture payée
   */
  async handleInvoicePaid(event: Stripe.Event): Promise<void> {
    const invoice = event.data.object as Stripe.Invoice;

    logger.info('Invoice paid', {
      invoiceId: invoice.id,
      customerId: invoice.customer,
      amount: invoice.amount_paid,
      currency: invoice.currency,
    });

    // TODO: Mettre à jour la base de données avec le paiement de la facture
    // TODO: Envoyer une notification à l'utilisateur
    // TODO: Envoyer une notification au créateur
  }

  /**
   * Traiter un événement de facture échouée
   */
  async handleInvoicePaymentFailed(event: Stripe.Event): Promise<void> {
    const invoice = event.data.object as Stripe.Invoice;

    logger.warn('Invoice payment failed', {
      invoiceId: invoice.id,
      customerId: invoice.customer,
      amount: invoice.amount_due,
    });

    // TODO: Mettre à jour la base de données avec l'échec du paiement
    // TODO: Envoyer une notification à l'utilisateur
  }

  /**
   * Traiter un événement de remboursement créé
   */
  async handleChargeRefunded(event: Stripe.Event): Promise<void> {
    const charge = event.data.object as Stripe.Charge;

    logger.info('Charge refunded', {
      chargeId: charge.id,
      customerId: charge.customer,
      amount: charge.amount_refunded,
      currency: charge.currency,
    });

    // TODO: Mettre à jour la base de données avec le remboursement
    // TODO: Envoyer une notification à l'utilisateur
  }

  /**
   * Traiter un événement de dispute créée
   */
  async handleChargeDisputeCreated(event: Stripe.Event): Promise<void> {
    const dispute = event.data.object as Stripe.Dispute;

    logger.warn('Charge dispute created', {
      disputeId: dispute.id,
      chargeId: dispute.charge,
      amount: dispute.amount,
      reason: dispute.reason,
    });

    // TODO: Mettre à jour la base de données avec le litige
    // TODO: Envoyer une notification à l'administrateur
  }

  /**
   * Traiter un événement de source créée
   */
  async handleCustomerSourceCreated(event: Stripe.Event): Promise<void> {
    const source = event.data.object as any;

    logger.info('Customer source created', {
      sourceId: source.id,
      customerId: source.customer,
      type: source.object,
    });

    // TODO: Mettre à jour la base de données avec la nouvelle source
  }

  /**
   * Traiter un événement de source supprimée
   */
  async handleCustomerSourceDeleted(event: Stripe.Event): Promise<void> {
    const source = event.data.object as any;

    logger.info('Customer source deleted', {
      sourceId: source.id,
      customerId: source.customer,
      type: source.object,
    });

    // TODO: Mettre à jour la base de données avec la suppression de la source
  }

  /**
   * Traiter tous les événements webhook
   */
  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    try {
      logger.info('Processing webhook event', { eventId: event.id, eventType: event.type });

      switch (event.type) {
        // Événements de paiement
        case 'payment_intent.succeeded':
          await this.handlePaymentIntentSucceeded(event);
          break;

        case 'payment_intent.payment_failed':
          await this.handlePaymentIntentFailed(event);
          break;

        // Événements d'abonnement
        case 'customer.subscription.created':
          await this.handleCustomerSubscriptionCreated(event);
          break;

        case 'customer.subscription.updated':
          await this.handleCustomerSubscriptionUpdated(event);
          break;

        case 'customer.subscription.deleted':
          await this.handleCustomerSubscriptionDeleted(event);
          break;

        // Événements de facturation
        case 'invoice.created':
          await this.handleInvoiceCreated(event);
          break;

        case 'invoice.paid':
          await this.handleInvoicePaid(event);
          break;

        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(event);
          break;

        // Événements de remboursement
        case 'charge.refunded':
          await this.handleChargeRefunded(event);
          break;

        // Événements de litige
        case 'charge.dispute.created':
          await this.handleChargeDisputeCreated(event);
          break;

        // Événements de source
        case 'customer.source.created':
          await this.handleCustomerSourceCreated(event);
          break;

        case 'customer.source.deleted':
          await this.handleCustomerSourceDeleted(event);
          break;

        default:
          logger.info('Unhandled webhook event type', { eventType: event.type });
      }

      logger.info('Webhook event processed successfully', { eventId: event.id });
    } catch (error) {
      logger.error('Failed to process webhook event', { error, eventId: event.id });
      throw error;
    }
  }

  /**
   * Obtenir les événements webhook
   */
  async getWebhookEvents(limit: number = 100): Promise<Stripe.Event[]> {
    try {
      const events = await stripe.events.list({ limit } as any);
      return events.data;
    } catch (error) {
      logger.error('Failed to get webhook events', { error });
      return [];
    }
  }

  /**
   * Obtenir un événement webhook par ID
   */
  async getWebhookEvent(eventId: string): Promise<Stripe.Event | null> {
    try {
      const event = await stripe.events.retrieve(eventId);
      return event;
    } catch (error) {
      logger.error('Failed to get webhook event', { error, eventId });
      return null;
    }
  }
}

/**
 * Instance singleton
 */
let manager: StripeWebhooksManager | null = null;

/**
 * Obtenir l'instance StripeWebhooksManager
 */
export function getStripeWebhooksManager(): StripeWebhooksManager {
  if (!manager) {
    manager = new StripeWebhooksManager();
  }
  return manager;
}
