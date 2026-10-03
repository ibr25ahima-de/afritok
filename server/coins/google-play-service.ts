import { createHash } from "node:crypto";
import { SignJWT, importPKCS8 } from "jose";
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { payments } from "../../drizzle/schema-payments";
import { userCoins, coinTransactions } from "../../drizzle/schema-coins";
import { COIN_PACKAGES } from "./purchase-service";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_SCOPE = "https://www.googleapis.com/auth/androidpublisher";
const GOOGLE_API_BASE = "https://androidpublisher.googleapis.com/androidpublisher/v3";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Configuration Google Play manquante: ${name}`);
  return value;
}

function obfuscatedAccountId(userId: number): string {
  const secret = requiredEnv("GOOGLE_PLAY_ACCOUNT_HASH_SECRET");
  return createHash("sha256").update(`${secret}:${userId}`).digest("hex").slice(0, 64);
}

async function getGoogleAccessToken(): Promise<string> {
  const email = requiredEnv("GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL");
  const privateKey = requiredEnv("GOOGLE_PLAY_SERVICE_ACCOUNT_PRIVATE_KEY").replace(/\\n/g, "\n");
  const key = await importPKCS8(privateKey, "RS256");
  const now = Math.floor(Date.now() / 1000);

  const assertion = await new SignJWT({ scope: GOOGLE_SCOPE })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(email)
    .setAudience(GOOGLE_TOKEN_URL)
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(key);

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!response.ok) throw new Error(`Authentification Google Play impossible (${response.status}).`);
  const data = (await response.json()) as { access_token?: string };
  if (!data.access_token) throw new Error("Jeton d'accès Google Play absent.");
  return data.access_token;
}

async function googleApi<T>(path: string, init?: RequestInit): Promise<T> {
  const accessToken = await getGoogleAccessToken();
  const response = await fetch(`${GOOGLE_API_BASE}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${accessToken}`,
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Google Play API ${response.status}: ${body.slice(0, 500)}`);
  }
  return (await response.json()) as T;
}

type ProductPurchaseV2 = {
  productLineItem?: Array<{
    productId?: string;
    productOfferDetails?: { quantity?: number; consumptionState?: string };
  }>;
  purchaseStateContext?: { purchaseState?: string };
  orderId?: string;
  obfuscatedExternalAccountId?: string;
  purchaseCompletionTime?: string;
  acknowledgementState?: string;
};

type Order = {
  orderId?: string;
  state?: string;
  total?: { units?: string; nanos?: number; currencyCode?: string };
  developerRevenueInBuyerCurrency?: { units?: string; nanos?: number; currencyCode?: string };
};

function moneyToNumber(money?: { units?: string; nanos?: number }): number {
  if (!money) return 0;
  const units = Number(money.units ?? 0);
  const nanos = Number(money.nanos ?? 0) / 1_000_000_000;
  const value = units + nanos;
  if (!Number.isFinite(value) || value < 0) throw new Error("Montant Google Play invalide.");
  return value;
}

export async function purchaseGooglePlayCoins({
  userId,
  productId,
  purchaseToken,
}: {
  userId: number;
  productId: string;
  purchaseToken: string;
}) {
  if (!Number.isInteger(userId) || userId <= 0) throw new Error("Utilisateur invalide.");
  if (!purchaseToken || purchaseToken.length > 4096) throw new Error("Purchase token invalide.");

  const coinPackage = COIN_PACKAGES.find((item) => item.id === productId);
  if (!coinPackage) throw new Error("Produit Coins Google Play inconnu.");

  const packageName = process.env.GOOGLE_PLAY_PACKAGE_NAME || "com.afritok.app";
  const tokenPath = `/applications/${encodeURIComponent(packageName)}/purchases/productsv2/tokens/${encodeURIComponent(purchaseToken)}`;
  const purchase = await googleApi<ProductPurchaseV2>(tokenPath);

  const lineItem = purchase.productLineItem?.[0];
  if (!lineItem || lineItem.productId !== productId) throw new Error("Le produit Google Play ne correspond pas au package Coins.");
  if (purchase.purchaseStateContext?.purchaseState !== "PURCHASED") {
    throw new Error("L'achat Google Play n'est pas encore confirmé.");
  }
  if (purchase.obfuscatedExternalAccountId !== obfuscatedAccountId(userId)) {
    throw new Error("Cet achat Google Play n'est pas associé à ce compte Afritok.");
  }

  const orderId = purchase.orderId || `TOKEN_${createHash("sha256").update(purchaseToken).digest("hex").slice(0, 32)}`;
  const referenceId = `google_play_${orderId}`.slice(0, 150);
  const order = purchase.orderId
    ? await googleApi<Order>(`/applications/${encodeURIComponent(packageName)}/orders/${encodeURIComponent(purchase.orderId)}`)
    : undefined;
  const amount = moneyToNumber(order?.total);
  const currency = order?.total?.currencyCode || "XOF";
  const developerRevenue = moneyToNumber(order?.developerRevenueInBuyerCurrency);

  const result = await db.transaction(async (tx) => {
    const existing = await tx.select().from(payments).where(eq(payments.referenceId, referenceId)).limit(1);
    if (existing.length > 0) {
      const existingCoins = await tx.select().from(coinTransactions).where(eq(coinTransactions.referenceId, referenceId)).limit(1);
      return { success: true, duplicate: true, coins: coinPackage.coins, balance: existingCoins[0]?.balanceAfter ? Number(existingCoins[0].balanceAfter) : null, paymentId: existing[0].id };
    }

    await tx.insert(payments).values({
      userId,
      amount: amount.toFixed(2),
      confirmedAmount: amount.toFixed(2),
      currency,
      operator: "google_play",
      purpose: "coin_purchase",
      productId,
      referenceId,
      providerReference: purchase.orderId || purchaseToken,
      status: "success",
      confirmedAt: new Date().toISOString(),
    });

    await tx.insert(userCoins).values({ userId, balance: "0", totalPurchased: "0", totalSpent: "0" }).onConflictDoNothing({ target: userCoins.userId });
    const wallets = await tx.select().from(userCoins).where(eq(userCoins.userId, userId)).limit(1).for("update");
    if (!wallets[0]) throw new Error("Portefeuille Coins introuvable.");

    const balanceBefore = Number(wallets[0].balance);
    const purchasedBefore = Number(wallets[0].totalPurchased);
    const balanceAfter = balanceBefore + coinPackage.coins;
    const totalPurchased = purchasedBefore + coinPackage.coins;

    await tx.update(userCoins).set({ balance: balanceAfter.toFixed(2), totalPurchased: totalPurchased.toFixed(2), updatedAt: new Date().toISOString() }).where(eq(userCoins.userId, userId));
    const transaction = await tx.insert(coinTransactions).values({
      userId,
      type: "purchase",
      amount: coinPackage.coins.toFixed(2),
      balanceBefore: balanceBefore.toFixed(2),
      balanceAfter: balanceAfter.toFixed(2),
      referenceId,
      description: `Achat Google Play de ${coinPackage.coins} Coins`,
    }).returning();

    return { success: true, duplicate: false, coins: coinPackage.coins, balance: balanceAfter, paymentId: null, transactionId: transaction[0]?.id, orderId, amount, currency, developerRevenue };
  });

  // A consumable must be consumed after successful delivery so the same pack can be purchased again.
  const consumePath = `/applications/${encodeURIComponent(packageName)}/purchases/products/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}:consume`;
  try {
    await googleApi<Record<string, never>>(consumePath, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
  } catch (error) {
    if (!result.duplicate) throw new Error(`Coins crédités mais consommation Google Play à réessayer: ${error instanceof Error ? error.message : "erreur inconnue"}`);
  }

  return result;
}
