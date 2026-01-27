import Stripe from "stripe";

/**
 * Initialiser le client Stripe
 * Note: La clé API Stripe doit être définie dans les variables d'environnement
 */
const stripeKey = process.env.STRIPE_SECRET_KEY;

if (!stripeKey) {
  console.warn(
    "STRIPE_SECRET_KEY not found. Stripe features will be disabled. Set STRIPE_SECRET_KEY in environment variables."
  );
}

export const stripe = stripeKey ? new Stripe(stripeKey) : null;

/**
 * Interface pour les données de paiement
 */
export interface PaymentData {
  amount: number;
  currency: string;
  description: string;
  metadata?: Record<string, string>;
}

/**
 * Crée une session de paiement Stripe
 */
export async function createPaymentSession(
  data: PaymentData,
  successUrl: string,
  cancelUrl: string
) {
  if (!stripe) {
    throw new Error("Stripe is not configured");
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: data.currency.toLowerCase(),
          product_data: {
            name: data.description,
          },
          unit_amount: Math.round(data.amount * 100), // Convertir en centimes
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: data.metadata,
  });

  return session;
}

/**
 * Crée une intention de paiement pour les dons
 */
export async function createDonationIntent(
  amount: number,
  currency: string,
  creatorId: number,
  donorEmail: string
) {
  if (!stripe) {
    throw new Error("Stripe is not configured");
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // Convertir en centimes
    currency: currency.toLowerCase(),
    description: `Donation to creator ${creatorId}`,
    receipt_email: donorEmail,
    metadata: {
      creatorId: creatorId.toString(),
      type: "donation",
    },
  });

  return paymentIntent;
}

/**
 * Récupère les détails d'une session de paiement
 */
export async function getPaymentSession(sessionId: string) {
  if (!stripe) {
    throw new Error("Stripe is not configured");
  }

  return await stripe.checkout.sessions.retrieve(sessionId);
}

/**
 * Crée un compte Connect pour un créateur
 */
export async function createCreatorAccount(
  creatorId: number,
  email: string,
  name: string,
  country: string
) {
  if (!stripe) {
    throw new Error("Stripe is not configured");
  }

  const account = await stripe.accounts.create({
    type: "express",
    country: country.toUpperCase(),
    email: email,
    business_profile: {
      name: name,
      support_email: email,
    },
    metadata: {
      creatorId: creatorId.toString(),
    },
  });

  return account;
}

/**
 * Récupère les revenus d'un créateur
 */
export async function getCreatorBalance(stripeAccountId: string) {
  if (!stripe) {
    throw new Error("Stripe is not configured");
  }

  const balance = await stripe.balance.retrieve({
    stripeAccount: stripeAccountId,
  });

  return balance;
}

/**
 * Crée un transfert vers le compte bancaire d'un créateur
 */
export async function createPayout(
  stripeAccountId: string,
  amount: number,
  currency: string
) {
  if (!stripe) {
    throw new Error("Stripe is not configured");
  }

  const payout = await stripe.payouts.create(
    {
      amount: Math.round(amount * 100), // Convertir en centimes
      currency: currency.toLowerCase(),
      method: "instant",
    },
    {
      stripeAccount: stripeAccountId,
    }
  );

  return payout;
}

/**
 * Récupère les transactions d'un créateur
 */
export async function getCreatorTransactions(
  stripeAccountId: string,
  limit: number = 10
) {
  if (!stripe) {
    throw new Error("Stripe is not configured");
  }

  const charges = await stripe.charges.list(
    {
      limit,
    },
    {
      stripeAccount: stripeAccountId,
    }
  );

  return charges;
}

/**
 * Valide une signature Webhook Stripe
 */
export function verifyWebhookSignature(
  body: string,
  signature: string,
  secret: string
): Record<string, any> | null {
  if (!stripe) {
    return null;
  }

  try {
    return stripe.webhooks.constructEvent(body, signature, secret) as Record<
      string,
      any
    >;
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    return null;
  }
}
