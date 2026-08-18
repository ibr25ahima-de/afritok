import { db } from "./db";
import {
  platformWallet,
  platformTransactions,
} from "../drizzle/schema-platform-finance";
import { eq } from "drizzle-orm";

/**
 * =========================================================
 * 💰 AFRITOK — SERVICE FINANCE PLATEFORME
 * =========================================================
 */

/**
 * Récupère le portefeuille principal AfriTok.
 *
 * S'il n'existe pas encore, il est créé automatiquement.
 */
export async function getPlatformWallet() {
  const existing = await db
    .select()
    .from(platformWallet)
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  const created = await db
    .insert(platformWallet)
    .values({
      name: "AfriTok",
      balance: "0",
      totalRevenue: "0",
      totalExpenses: "0",
      currency: "XOF",
    })
    .returning();

  return created[0];
}


/**
 * =========================================================
 * 💵 ENREGISTRER UNE ENTRÉE D'ARGENT RÉEL
 * =========================================================
 *
 * Cette fonction sera utilisée plus tard par :
 *
 * - achat de Coins
 * - abonnements
 * - Boost
 * - publicité
 * - autres services payants
 *
 * IMPORTANT :
 * Cette fonction ne doit être appelée qu'après
 * confirmation réelle du paiement par le fournisseur
 * de paiement.
 */
export async function recordPlatformRevenue({
  userId,
  amount,
  currency,
  source,
  paymentProvider,
  paymentReference,
  externalId,
  description,
}: {
  userId?: number;
  amount: number;
  currency?: string;
  source: string;
  paymentProvider?: string;
  paymentReference?: string;
  externalId?: string;
  description?: string;
}) {
  if (amount <= 0) {
    throw new Error("Le montant doit être supérieur à zéro.");
  }

  return await db.transaction(async (tx) => {
    /**
     * Créer le portefeuille s'il n'existe pas.
     */
    let wallets = await tx
      .select()
      .from(platformWallet)
      .limit(1);

    if (wallets.length === 0) {
      await tx.insert(platformWallet).values({
        name: "AfriTok",
        balance: "0",
        totalRevenue: "0",
        totalExpenses: "0",
        currency: "XOF",
      });

      wallets = await tx
        .select()
        .from(platformWallet)
        .limit(1);
    }

    const wallet = wallets[0];

    /**
     * Protection contre un doublon.
     */
    if (externalId) {
      const existing = await tx
        .select()
        .from(platformTransactions)
        .where(
          eq(
            platformTransactions.externalId,
            externalId
          )
        )
        .limit(1);

      if (existing.length > 0) {
        return {
          success: true,
          duplicate: true,
          transaction: existing[0],
          wallet,
        };
      }
    }

    const balanceBefore =
      Number(wallet.balance);

    const balanceAfter =
      balanceBefore + amount;

    const totalRevenue =
      Number(wallet.totalRevenue) + amount;

    /**
     * Mettre à jour le solde réel AfriTok.
     */
    const updatedWallet = await tx
      .update(platformWallet)
      .set({
        balance: balanceAfter.toFixed(4),
        totalRevenue: totalRevenue.toFixed(4),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(platformWallet.id, wallet.id))
      .returning();

    /**
     * Enregistrer la transaction.
     */
    const transaction = await tx
      .insert(platformTransactions)
      .values({
        userId,
        amount: amount.toFixed(4),
        currency: currency || "XOF",
        direction: "in",
        source,
        status: "completed",
        paymentProvider,
        paymentReference,
        externalId,
        description,
      })
      .returning();

    return {
      success: true,
      duplicate: false,
      transaction: transaction[0],
      wallet: updatedWallet[0],
      balanceBefore,
      balanceAfter,
      amount,
    };
  });
}
