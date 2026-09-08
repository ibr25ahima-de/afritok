/**
 * Paystack Payment Router
 * Secure payment initialization/verification for AfriTok.
 */

import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { protectedProcedure, publicProcedure, router } from './_core/trpc';
import PaystackClient from './paystack-connector';
import { ENV } from './_core/env';
import { db } from './db';
import { payments } from '../drizzle/schema-payments';
import { COIN_PACKAGES } from './coins/purchase-service';
import crypto from 'crypto';

const paystack = new PaystackClient({
  secretKey: ENV.paystackSecretKey || '',
  publicKey: ENV.paystackPublicKey || '',
  webhookSecret: ENV.paystackWebhookSecret || '',
});

const PAYSTACK_REFERENCE_RE = /^[A-Za-z0-9._-]{5,150}$/;

function requirePaystackConfigured() {
  if (!ENV.paystackSecretKey || !ENV.paystackPublicKey) {
    throw new Error('Paiement Paystack indisponible.');
  }
}

export const paystackRouter = router({
  initializePayment: protectedProcedure
    .input(z.object({ packageId: z.string().trim().min(1).max(50) }))
    .mutation(async ({ input, ctx }) => {
      requirePaystackConfigured();
      const coinPackage = COIN_PACKAGES.find((item) => item.id === input.packageId);
      if (!coinPackage) throw new Error('Package Coins introuvable.');

      const email = String(ctx.user.email || '').trim();
      if (!email) throw new Error('Adresse e-mail du compte manquante.');
      const reference = `AFRITOK-${crypto.randomUUID()}`;

      try {
        await db.insert(payments).values({
          userId: ctx.user.id,
          amount: coinPackage.price.toFixed(2),
          confirmedAmount: '0',
          currency: coinPackage.currency,
          operator: 'PAYSTACK',
          purpose: 'coin_purchase',
          productId: coinPackage.id,
          referenceId: reference,
          status: 'pending',
        });

        const response = await paystack.initializePayment({
          email,
          amount: coinPackage.price,
          reference,
          metadata: { userId: ctx.user.id, purpose: 'coin_purchase', productId: coinPackage.id },
        });

        return {
          success: true,
          authorizationUrl: response.data.authorization_url,
          accessCode: response.data.access_code,
          reference: response.data.reference,
          package: coinPackage,
        };
      } catch (error) {
        console.error('[tRPC] Initialize payment failed:', error);
        throw new Error('Impossible d’initialiser le paiement.');
      }
    }),

  verifyPayment: protectedProcedure
    .input(z.object({ reference: z.string().trim().regex(PAYSTACK_REFERENCE_RE) }))
    .mutation(async ({ input, ctx }) => {
      requirePaystackConfigured();
      const localPayment = await db
        .select()
        .from(payments)
        .where(and(eq(payments.referenceId, input.reference), eq(payments.userId, ctx.user.id)))
        .limit(1);
      const payment = localPayment[0];
      if (!payment) throw new Error('Paiement introuvable.');
      if (payment.purpose !== 'coin_purchase' || !payment.productId) throw new Error('Paiement Coins invalide.');

      const coinPackage = COIN_PACKAGES.find((item) => item.id === payment.productId);
      if (!coinPackage) throw new Error('Package Coins introuvable.');
      if (payment.status === 'success') {
        return { success: true, status: 'success', amount: Number(payment.confirmedAmount), reference: payment.referenceId };
      }

      try {
        const response = await paystack.verifyPayment(input.reference);
        const data = response.data;
        const paidAmount = Number(data.amount);
        const expectedAmount = coinPackage.price;
        const paidReference = String(data.reference || '');
        const customerEmail = String(data.customer?.email || '').trim().toLowerCase();
        const accountEmail = String(ctx.user.email || '').trim().toLowerCase();

        if (data.status !== 'success') return { success: false, status: data.status, message: 'Paiement non confirmé.' };
        if (paidReference !== payment.referenceId) throw new Error('Référence de paiement non correspondante.');
        if (paidAmount !== expectedAmount) throw new Error('Montant du paiement incorrect.');
        if (!customerEmail || !accountEmail || customerEmail !== accountEmail) throw new Error('Le compte Paystack ne correspond pas au compte AfriTok.');

        const updated = await db
          .update(payments)
          .set({
            confirmedAmount: expectedAmount.toFixed(2),
            providerReference: paidReference,
            status: 'success',
            confirmedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
          .where(and(eq(payments.id, payment.id), eq(payments.userId, ctx.user.id), eq(payments.status, 'pending')))
          .returning({ id: payments.id });

        if (updated.length === 0) {
          const current = await db.select({ status: payments.status }).from(payments).where(eq(payments.id, payment.id)).limit(1);
          if (current[0]?.status === 'success') return { success: true, status: 'success', amount: expectedAmount, reference: payment.referenceId };
          throw new Error('État du paiement modifié.');
        }

        return { success: true, status: 'success', amount: expectedAmount, reference: payment.referenceId, message: 'Paiement confirmé. Les Coins peuvent maintenant être crédités.' };
      } catch (error) {
        console.error('[tRPC] Verify payment failed:', error);
        throw new Error('Impossible de vérifier le paiement.');
      }
    }),

  createTransferRecipient: protectedProcedure.mutation(async () => {
    throw new Error('Création de bénéficiaire désactivée pour des raisons de sécurité.');
  }),

  initiateTransfer: protectedProcedure.mutation(async () => {
    throw new Error('Les transferts Paystack directs sont désactivés.');
  }),

  getTransferStatus: protectedProcedure
    .input(z.object({ transferCode: z.string().trim().min(1).max(150) }))
    .query(async () => {
      throw new Error('Consultation des transferts directs désactivée.');
    }),

  getPaymentHistory: protectedProcedure.query(async ({ ctx }) => {
    const rows = await db
      .select({ id: payments.id, amount: payments.amount, confirmedAmount: payments.confirmedAmount, currency: payments.currency, purpose: payments.purpose, productId: payments.productId, status: payments.status, createdAt: payments.createdAt, confirmedAt: payments.confirmedAt })
      .from(payments)
      .where(eq(payments.userId, ctx.user.id));
    return { success: true, payments: rows };
  }),

  getWithdrawalHistory: protectedProcedure.query(async () => ({
    success: true,
    withdrawals: [],
    message: 'Les retraits sont gérés par le système de retraits sécurisé.',
  })),

  handleWebhook: publicProcedure.mutation(async () => {
    throw new Error('Webhook Paystack non disponible via cette route. Utiliser un endpoint raw signé.');
  }),
});
