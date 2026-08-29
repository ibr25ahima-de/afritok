import { db } from "../db";
import { payments } from "../../drizzle/schema-payments";
import { eq, and } from "drizzle-orm";
import { getPremiumPlan } from "./subscription-plans";

export async function ensurePremiumSubscriptionTable() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS afritok_premium_subscriptions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      plan_id VARCHAR(32) NOT NULL,
      payment_reference VARCHAR(255) NOT NULL UNIQUE,
      status VARCHAR(32) NOT NULL DEFAULT 'pending',
      starts_at TIMESTAMP NULL,
      expires_at TIMESTAMP NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
}

export async function createPremiumSubscriptionPayment({
  userId,
  planId,
  operator,
  phone,
}: {
  userId: number;
  planId: string;
  operator: string;
  phone: string;
}) {
  const plan = getPremiumPlan(planId);
  if (!plan) throw new Error("Formule Premium invalide.");
  if (!phone.trim()) throw new Error("Le numéro Mobile Money est obligatoire.");

  await ensurePremiumSubscriptionTable();

  const referenceId = `afritok_premium_${userId}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

  const payment = await db.insert(payments).values({
    userId,
    amount: plan.price.toFixed(2),
    confirmedAmount: "0",
    currency: "XOF",
    operator,
    phone: phone.trim(),
    purpose: "subscription",
    referenceId,
    providerReference: null,
    status: "pending",
    confirmedAt: null,
  }).returning();

  await db.execute(`
    INSERT INTO afritok_premium_subscriptions (user_id, plan_id, payment_reference, status)
    VALUES (${userId}, '${plan.id}', '${referenceId}', 'pending')
  `);

  return {
    paymentId: payment[0].id,
    referenceId,
    amount: plan.price,
    currency: "XOF",
    status: "pending" as const,
    message: "Demande de paiement créée. L'abonnement sera activé uniquement après confirmation réelle du paiement.",
  };
}

export async function getPremiumPaymentStatus(userId: number, referenceId: string) {
  await ensurePremiumSubscriptionTable();
  const result = await db.select().from(payments).where(
    and(eq(payments.userId, userId), eq(payments.referenceId, referenceId))
  ).limit(1);
  if (!result[0]) throw new Error("Paiement Premium introuvable.");
  return result[0];
}

export async function syncPremiumSubscriptionAfterConfirmedPayment(referenceId: string) {
  await ensurePremiumSubscriptionTable();
  const payment = await db.select().from(payments).where(eq(payments.referenceId, referenceId)).limit(1);
  if (!payment[0] || payment[0].status !== "confirmed") return null;

  const rows = await db.execute(`SELECT * FROM afritok_premium_subscriptions WHERE payment_reference = '${referenceId}' LIMIT 1`);
  const subscription = (rows as any)?.rows?.[0];
  if (!subscription) return null;
  if (subscription.status === "active") return subscription;

  const plan = getPremiumPlan(subscription.plan_id);
  if (!plan) throw new Error("Formule Premium introuvable.");

  const now = new Date();
  const expires = new Date(now.getTime() + plan.durationDays * 86400000);
  await db.execute(`
    UPDATE afritok_premium_subscriptions
    SET status = 'active', starts_at = '${now.toISOString()}', expires_at = '${expires.toISOString()}', updated_at = NOW()
    WHERE payment_reference = '${referenceId}'
  `);

  return { ...subscription, status: "active", starts_at: now.toISOString(), expires_at: expires.toISOString() };
}
