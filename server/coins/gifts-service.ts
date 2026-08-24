import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "../db";

import {
  gifts,
  giftTransactions,
  userCoins,
  coinTransactions,
} from "../../drizzle/schema-coins";

import {
  creatorWallets,
  creatorTransactions,
} from "../../drizzle/schema-creator-finance";

import { users } from "../../drizzle/schema";

import {
  platformWallet,
  platformTransactions,
} from "../../drizzle/schema-platform-finance";

/**
 * =========================================================
 * 🎁 AFRITOK — GIFT SERVICE
 * =========================================================
 *
 * Flux :
 *
 * Coins
 *   ↓
 * Cadeau
 *   ↓
 * 70% créateur
 * 30% AfriTok
 *
 * IMPORTANT :
 * Tout est effectué dans UNE transaction SQL.
 */

/**
 * Part du créateur.
 *
 * 70% = créateur
 * 30% = AfriTok
 */
const CREATOR_SHARE = 0.70;

/**
 * =========================================================
 * 🎁 CADEAUX DISPONIBLES
 * =========================================================
 */

export async function getAvailableGifts() {
  return await db
    .select()
    .from(gifts)
    .where(eq(gifts.isActive, true))
    .orderBy(gifts.price);
}

/**
 * =========================================================
 * 🎁 RÉCUPÉRER UN CADEAU
 * =========================================================
 */

export async function getGiftById(giftId: number) {
  const result = await db
    .select()
    .from(gifts)
    .where(eq(gifts.id, giftId))
    .limit(1);

  return result[0] ?? null;
}

/**
 * =========================================================
 * 📋 HISTORIQUE
 * =========================================================
 */

export async function getGiftTransactions(userId: number) {
  return await db
    .select()
    .from(giftTransactions)
    .where(eq(giftTransactions.senderId, userId))
    .orderBy(desc(giftTransactions.createdAt));
}

/**
 * =========================================================
 * 🎁 ENVOYER RÉELLEMENT UN CADEAU
 * =========================================================
 */

export async function sendGift(
  senderId: number,
  receiverId: number,
  giftId: number,
  quantity: number,
  videoId?: number | null,
  liveId?: number | null,
  idempotencyKey?: string
) {
  if (!senderId) {
    throw new Error("Expéditeur invalide.");
  }

  if (!receiverId) {
    throw new Error("Destinataire invalide.");
  }

  if (senderId === receiverId) {
    throw new Error(
      "Tu ne peux pas envoyer un cadeau à toi-même."
    );
  }

  if (
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    quantity > 100
  ) {
    throw new Error(
      "Quantité de cadeau invalide."
    );
  }

  if (!idempotencyKey) {
    throw new Error(
      "Clé d'idempotence obligatoire."
    );
  }

  if (videoId && liveId) {
    throw new Error(
      "Un cadeau ne peut pas être associé à une vidéo et à un Live en même temps."
    );
  }

  if (!videoId && !liveId) {
    throw new Error(
      "Le cadeau doit être associé à une vidéo ou à un Live."
    );
  }

  return await db.transaction(async (tx) => {
    /**
     * =====================================================
     * 1. PROTECTION DOUBLE ENVOI
     * =====================================================
     */

    const existingGift = await tx
      .select()
      .from(giftTransactions)
      .where(
        eq(
          giftTransactions.idempotencyKey,
          idempotencyKey
        )
      )
      .limit(1);

    if (existingGift.length > 0) {
      return {
        success: true,
        duplicate: true,
        transaction: existingGift[0],
      };
    }

    /**
     * =====================================================
     * 2. VÉRIFIER LE DESTINATAIRE
     * =====================================================
     */

    const receiver = await tx
      .select({
        id: users.id,
      })
      .from(users)
      .where(eq(users.id, receiverId))
      .limit(1);

    if (receiver.length === 0) {
      throw new Error(
        "Destinataire introuvable."
      );
    }

    /**
     * =====================================================
     * 3. RÉCUPÉRER LE CADEAU
     * =====================================================
     */

    const giftResult = await tx
      .select()
      .from(gifts)
      .where(
        and(
          eq(gifts.id, giftId),
          eq(gifts.isActive, true)
        )
      )
      .limit(1);

    if (giftResult.length === 0) {
      throw new Error(
        "Cadeau introuvable ou désactivé."
      );
    }

    const gift = giftResult[0];

    const unitPrice = Number(gift.price);

    if (
      !Number.isFinite(unitPrice) ||
      unitPrice <= 0
    ) {
      throw new Error(
        "Prix du cadeau invalide."
      );
    }

    const totalCoins =
      unitPrice * quantity;

    /**
     * =====================================================
     * 4. RÉCUPÉRER LE PORTEFEUILLE COINS
     * =====================================================
     */

    const walletResult = await tx
      .select()
      .from(userCoins)
      .where(eq(userCoins.userId, senderId))
      .for("update")
      .limit(1);

    if (walletResult.length === 0) {
      throw new Error(
        "Portefeuille Coins introuvable."
      );
    }

    const wallet = walletResult[0];

    const balanceBefore =
      Number(wallet.balance);

    /**
     * =====================================================
     * 5. VÉRIFIER LE SOLDE
     * =====================================================
     */

    if (
      balanceBefore < totalCoins
    ) {
      throw new Error(
        `Solde Coins insuffisant. ` +
        `Requis : ${totalCoins}. ` +
        `Disponible : ${balanceBefore}.`
      );
    }

    const balanceAfter =
      balanceBefore - totalCoins;

    /**
     * =====================================================
     * 6. DÉBITER LES COINS
     * =====================================================
     */

    await tx
      .update(userCoins)
      .set({
        balance:
          balanceAfter.toFixed(2),

        totalSpent:
          (
            Number(wallet.totalSpent) +
            totalCoins
          ).toFixed(2),

        updatedAt:
          new Date().toISOString(),
      })
      .where(
        eq(
          userCoins.userId,
          senderId
        )
      );

    /**
     * =====================================================
     * 7. ENREGISTRER LE MOUVEMENT DE COINS
     * =====================================================
     */

    await tx
      .insert(coinTransactions)
      .values({
        userId: senderId,

        type: "gift_sent",

        amount:
          (-totalCoins).toFixed(2),

        balanceBefore:
          balanceBefore.toFixed(2),

        balanceAfter:
          balanceAfter.toFixed(2),

        referenceId:
          idempotencyKey,

        description:
          `Cadeau envoyé : ${gift.name} x${quantity}`,
      });

    /**
     * =====================================================
     * 8. CALCULER LA RÉPARTITION RÉELLE
     * =====================================================
     */

    const creatorAmount =
      Math.round(
        totalCoins *
        CREATOR_SHARE *
        100
      ) / 100;

    const platformAmount =
      Math.round(
        (totalCoins -
          creatorAmount) *
          100
      ) / 100;

    /**
     * =====================================================
     * 9. RÉCUPÉRER / CRÉER LE PORTEFEUILLE CRÉATEUR
     * =====================================================
     */

    await tx
      .insert(creatorWallets)
      .values({
        userId: receiverId,

        availableBalance: "0",

        totalEarned: "0",

        totalWithdrawn: "0",

        currency: "XOF",
      })
      .onConflictDoNothing({
        target:
          creatorWallets.userId,
      });

    const creatorWalletResult =
      await tx
        .select()
        .from(creatorWallets)
        .where(
          eq(
            creatorWallets.userId,
            receiverId
          )
        )
        .for("update")
        .limit(1);

    if (
      creatorWalletResult.length === 0
    ) {
      throw new Error(
        "Portefeuille créateur introuvable."
      );
    }

    const creatorWallet =
      creatorWalletResult[0];

    const creatorBalanceBefore =
      Number(
        creatorWallet.availableBalance
      );

    const creatorBalanceAfter =
      creatorBalanceBefore +
      creatorAmount;

    /**
     * =====================================================
     * 10. CRÉDITER LE CRÉATEUR
     * =====================================================
     */

    await tx
      .update(creatorWallets)
      .set({
        availableBalance:
          creatorBalanceAfter.toFixed(2),

        totalEarned:
          (
            Number(
              creatorWallet.totalEarned
            ) +
            creatorAmount
          ).toFixed(2),

        updatedAt:
          new Date().toISOString(),
      })
      .where(
        eq(
          creatorWallets.userId,
          receiverId
        )
      );

    /**
     * =====================================================
     * 11. HISTORIQUE CRÉATEUR
     * =====================================================
     */

    await tx
      .insert(creatorTransactions)
      .values({
        userId: receiverId,

        type: "gift_received",

        amount:
          creatorAmount.toFixed(2),

        balanceBefore:
          creatorBalanceBefore.toFixed(2),

        balanceAfter:
          creatorBalanceAfter.toFixed(2),

        referenceId:
          idempotencyKey,

        description:
          `Cadeau reçu : ${gift.name} x${quantity}`,
      });

    /**
     * =====================================================
     * 12. ENREGISTRER LA COMMISSION PLATEFORME
     * =====================================================
     *
     * Le paiement initial des Coins a déjà été enregistré
     * comme entrée d'argent réelle. Ici, on enregistre
     * uniquement la commission économique du cadeau : 30 %.
     *
     * La référence du cadeau sert d'identifiant externe unique
     * afin d'empêcher une double comptabilisation.
     */

    /**
     * Verrou applicatif transactionnel pour empêcher deux
     * créations concurrentes du portefeuille singleton.
     */
    await tx.execute(
      sql`select pg_advisory_xact_lock(872341)`
    );

    let platformResult = await tx
      .select()
      .from(platformWallet)
      .for("update");

    if (platformResult.length > 1) {
      throw new Error(
        "Plusieurs portefeuilles plateforme existent. Correction de la base requise."
      );
    }

    if (platformResult.length === 0) {
      await tx
        .insert(platformWallet)
        .values({
          name: "AfriTok",
          balance: "0",
          totalRevenue: "0",
          totalExpenses: "0",
          currency: "XOF",
        });

      platformResult = await tx
        .select()
        .from(platformWallet)
        .for("update");
    }

    const platform = platformResult[0];

    if (!platform) {
      throw new Error(
        "Portefeuille plateforme introuvable."
      );
    }

    const existingPlatformTransaction =
      await tx
        .select()
        .from(platformTransactions)
        .where(
          eq(
            platformTransactions.externalId,
            idempotencyKey
          )
        )
        .limit(1);

    if (existingPlatformTransaction.length === 0) {
      const platformBalanceBefore =
        Number(platform.balance);

      const platformBalanceAfter =
        platformBalanceBefore + platformAmount;

      const platformRevenueAfter =
        Number(platform.totalRevenue) + platformAmount;

      await tx
        .update(platformWallet)
        .set({
          balance:
            platformBalanceAfter.toFixed(4),

          totalRevenue:
            platformRevenueAfter.toFixed(4),

          updatedAt:
            new Date().toISOString(),
        })
        .where(
          eq(
            platformWallet.id,
            platform.id
          )
        );

      await tx
        .insert(platformTransactions)
        .values({
          userId: senderId,

          amount:
            platformAmount.toFixed(4),

          currency: "XOF",

          direction: "in",

          source: "gift_commission",

          status: "completed",

          paymentProvider: null,

          paymentReference: idempotencyKey,

          externalId: idempotencyKey,

          description:
            `Commission AfriTok de 30% — ${gift.name} x${quantity}`,
        });
    }

    /**
     * =====================================================
     * 13. ENREGISTRER LE CADEAU
     * =====================================================
     */

    const context =
      videoId
        ? "video"
        : "live";

    const contextId =
      videoId
        ? String(videoId)
        : String(liveId);

    const giftTransaction =
      await tx
        .insert(giftTransactions)
        .values({
          senderId,

          recipientId: receiverId,

          giftId: String(gift.id),

          quantity,

          unitPrice:
            unitPrice.toFixed(2),

          totalAmount:
            totalCoins.toFixed(2),

          context,

          contextId,

          idempotencyKey,
        })
        .returning();

    return {
      success: true,

      duplicate: false,

      transaction:
        giftTransaction[0],

      senderCoinsBefore:
        balanceBefore,

      senderCoinsAfter:
        balanceAfter,

      totalCoins,

      creatorAmount,

      platformAmount,

      creatorBalance:
        creatorBalanceAfter,

      currency: "XOF",

      message:
        "Cadeau envoyé. Les Coins ont été débités et le revenu du créateur a été crédité.",
    };
  });
}
