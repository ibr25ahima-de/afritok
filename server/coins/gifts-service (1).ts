import { eq, and, desc, inArray } from "drizzle-orm";
import { db } from "../db";

import {
  gifts,
  giftTransactions,
} from "../../drizzle/schema-gifts";

import {
  userCoins,
  coinTransactions,
} from "../../drizzle/schema";

/**
 * =========================================================
 * 🎁 AFRITOK — GIFT SERVICE
 * =========================================================
 *
 * Flux :
 *
 * 🪙 Coins expéditeur
 *       ↓
 *      débit
 *       ↓
 * 🎁 gift_transaction
 *       ↓
 * 🪙 Coins créateur
 *
 * Tout est effectué dans UNE transaction PostgreSQL.
 */

/**
 * =========================================================
 * 🎁 CADEAUX DISPONIBLES
 * =========================================================
 */

export async function getActiveGifts() {
  return await db
    .select()
    .from(gifts)
    .where(eq(gifts.isActive, true))
    .orderBy(gifts.coinPrice);
}

/**
 * Alias compatible avec l'ancien système.
 */
export async function getAvailableGifts() {
  return getActiveGifts();
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
 * 🎁 ENVOYER UN CADEAU
 * =========================================================
 */

export async function sendGift({
  senderId,
  recipientId,
  giftId,
  quantity,
  context,
  contextId,
  idempotencyKey,
}: {
  senderId: number;
  recipientId: number;
  giftId: number;
  quantity: number;
  context: "video" | "live";
  contextId?: string;
  idempotencyKey: string;
}) {
  if (!senderId) {
    throw new Error("Expéditeur invalide.");
  }

  if (!recipientId) {
    throw new Error("Destinataire invalide.");
  }

  if (senderId === recipientId) {
    throw new Error(
      "Tu ne peux pas envoyer un cadeau à toi-même."
    );
  }

  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
    throw new Error(
      "La quantité doit être comprise entre 1 et 100."
    );
  }

  if (!idempotencyKey || idempotencyKey.length < 10) {
    throw new Error("Clé d'opération invalide.");
  }

  /**
   * Une vidéo ou un Live est obligatoire.
   */
  if (!contextId) {
    throw new Error(
      "Le cadeau doit être associé à une vidéo ou à un Live."
    );
  }

  const parsedContextId = Number(contextId);

  if (
    !Number.isInteger(parsedContextId) ||
    parsedContextId <= 0
  ) {
    throw new Error("Identifiant vidéo/Live invalide.");
  }

  const videoId =
    context === "video"
      ? parsedContextId
      : null;

  const liveId =
    context === "live"
      ? parsedContextId
      : null;

  return await db.transaction(async (tx) => {
    /**
     * =====================================================
     * 1️⃣ RÉCUPÉRER LE CADEAU
     * =====================================================
     *
     * Le prix vient TOUJOURS de la base.
     * Le client ne peut donc pas modifier le prix.
     */

    const giftRows = await tx
      .select()
      .from(gifts)
      .where(eq(gifts.id, giftId))
      .limit(1);

    const gift = giftRows[0];

    if (!gift) {
      throw new Error("Cadeau introuvable.");
    }

    if (!gift.isActive) {
      throw new Error(
        "Ce cadeau n'est plus disponible."
      );
    }

    /**
     * =====================================================
     * 2️⃣ CALCUL DU PRIX SERVEUR
     * =====================================================
     */

    const coinPrice = Number(gift.coinPrice);

    if (!Number.isFinite(coinPrice) || coinPrice <= 0) {
      throw new Error(
        "Prix du cadeau invalide."
      );
    }

    const totalAmount =
      coinPrice * quantity;

    /**
     * =====================================================
     * 3️⃣ CRÉER LES PORTEFEUILLES SI NÉCESSAIRE
     * =====================================================
     */

    await tx
      .insert(userCoins)
      .values({
        userId: senderId,
        balance: "0",
        totalPurchased: "0",
        totalSpent: "0",
      })
      .onConflictDoNothing({
        target: userCoins.userId,
      });

    await tx
      .insert(userCoins)
      .values({
        userId: recipientId,
        balance: "0",
        totalPurchased: "0",
        totalSpent: "0",
      })
      .onConflictDoNothing({
        target: userCoins.userId,
      });

    /**
     * =====================================================
     * 4️⃣ VERROUILLER LES DEUX PORTEFEUILLES
     * =====================================================
     */

    const wallets = await tx
      .select()
      .from(userCoins)
      .where(
        inArray(userCoins.userId, [
          senderId,
          recipientId,
        ])
      )
      .for("update");

    const senderWallet = wallets.find(
      (wallet) =>
        wallet.userId === senderId
    );

    const recipientWallet = wallets.find(
      (wallet) =>
        wallet.userId === recipientId
    );

    if (!senderWallet || !recipientWallet) {
      throw new Error(
        "Impossible de récupérer les portefeuilles Coins."
      );
    }

    /**
     * =====================================================
     * 5️⃣ IDEMPOTENCE
     * =====================================================
     *
     * Si le même bouton est envoyé deux fois avec
     * la même clé, on ne débite pas deux fois.
     */

    const existingTransactions =
      await tx
        .select()
        .from(giftTransactions)
        .where(
          and(
            eq(
              giftTransactions.senderId,
              senderId
            ),
            eq(
              giftTransactions.referenceId,
              idempotencyKey
            )
          )
        )
        .limit(1);

    if (existingTransactions.length > 0) {
      const existing =
        existingTransactions[0];

      return {
        success: true,
        duplicate: true,

        transaction: existing,

        balance:
          Number(senderWallet.balance),

        recipientBalance:
          Number(recipientWallet.balance),

        gift: {
          id: gift.id,
          name: gift.name,
          icon: gift.icon,
          price: coinPrice,
          quantity: existing.quantity,
          totalAmount:
            Number(existing.totalCoins),
        },
      };
    }

    /**
     * =====================================================
     * 6️⃣ VÉRIFIER LE SOLDE
     * =====================================================
     */

    const senderBalance =
      Number(senderWallet.balance);

    if (senderBalance < totalAmount) {
      throw new Error(
        `Solde de Coins insuffisant. Il faut ${totalAmount} Coins.`
      );
    }

    /**
     * =====================================================
     * 7️⃣ NOUVEAUX SOLDES
     * =====================================================
     */

    const senderBalanceAfter =
      senderBalance - totalAmount;

    const recipientBalanceBefore =
      Number(recipientWallet.balance);

    const recipientBalanceAfter =
      recipientBalanceBefore + totalAmount;

    const senderTotalSpent =
      Number(senderWallet.totalSpent) +
      totalAmount;

    /**
     * =====================================================
     * 8️⃣ DÉBITER L'EXPÉDITEUR
     * =====================================================
     */

    await tx
      .update(userCoins)
      .set({
        balance:
          senderBalanceAfter.toFixed(2),

        totalSpent:
          senderTotalSpent.toFixed(2),

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
     * 9️⃣ CRÉDITER LE CRÉATEUR
     * =====================================================
     */

    await tx
      .update(userCoins)
      .set({
        balance:
          recipientBalanceAfter.toFixed(2),

        updatedAt:
          new Date().toISOString(),
      })
      .where(
        eq(
          userCoins.userId,
          recipientId
        )
      );

    /**
     * =====================================================
     * 🔟 TRANSACTION COINS EXPÉDITEUR
     * =====================================================
     */

    await tx
      .insert(coinTransactions)
      .values({
        userId: senderId,

        type: "gift_sent",

        amount:
          totalAmount.toFixed(2),

        balanceBefore:
          senderBalance.toFixed(2),

        balanceAfter:
          senderBalanceAfter.toFixed(2),

        referenceId:
          idempotencyKey,

        description:
          `🎁 ${gift.name} x${quantity} envoyé`,
      });

    /**
     * =====================================================
     * 1️⃣1️⃣ TRANSACTION COINS CRÉATEUR
     * =====================================================
     */

    await tx
      .insert(coinTransactions)
      .values({
        userId: recipientId,

        type: "gift_received",

        amount:
          totalAmount.toFixed(2),

        balanceBefore:
          recipientBalanceBefore.toFixed(2),

        balanceAfter:
          recipientBalanceAfter.toFixed(2),

        referenceId:
          idempotencyKey,

        description:
          `🎁 ${gift.name} x${quantity} reçu`,
      });

    /**
     * =====================================================
     * 1️⃣2️⃣ HISTORIQUE DU CADEAU
     * =====================================================
     */

    const transactionRows =
      await tx
        .insert(giftTransactions)
        .values({
          senderId,
          receiverId: recipientId,
          giftId: gift.id,

          quantity,

          coinPrice,

          totalCoins:
            totalAmount,

          videoId,

          liveId,

          referenceId:
            idempotencyKey,
        })
        .returning();

    const transaction =
      transactionRows[0];

    /**
     * =====================================================
     * ✅ SUCCÈS
     * =====================================================
     */

    return {
      success: true,

      duplicate: false,

      transaction,

      balance:
        senderBalanceAfter,

      recipientBalance:
        recipientBalanceAfter,

      gift: {
        id: gift.id,
        name: gift.name,
        icon: gift.icon,
        price: coinPrice,
        quantity,
        totalAmount,
      },
    };
  });
}