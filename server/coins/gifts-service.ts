import { eq, desc, sql } from "drizzle-orm";

import { db } from "../db";

import {
  userCoins,
  coinTransactions,
  gifts as giftsTable,
  giftTransactions,
} from "../../drizzle/schema-coins";

import {
  GIFTS,
  getGift,
} from "./gifts";

/**
 * =========================================================
 * 🎁 AFRITOK — GIFTS SERVICE
 * =========================================================
 *
 * Le catalogue officiel des cadeaux vient de :
 *
 * server/coins/gifts.ts
 *
 * Ce service utilise ce catalogue pour :
 *
 * - afficher les cadeaux
 * - retrouver un cadeau
 * - retrouver son prix
 * - envoyer le cadeau
 *
 * Le client ne peut jamais imposer le prix.
 */


/**
 * =========================================================
 * 🎁 RÉCUPÉRER LES CADEAUX ACTIFS
 * =========================================================
 *
 * IMPORTANT :
 *
 * On ne cherche plus les cadeaux uniquement dans PostgreSQL.
 *
 * Le catalogue principal est GIFTS depuis :
 *
 * server/coins/gifts.ts
 *
 * =========================================================
 */

export async function getActiveGifts() {
  return GIFTS.map((gift) => ({
    id: gift.id,
    name: gift.name,
    icon: gift.icon,
    coins: gift.coins,
    isActive: true,
  }));
}


/**
 * =========================================================
 * 🔎 TROUVER UN CADEAU
 * =========================================================
 */

export function findGift(giftId: string) {
  const gift = getGift(giftId);

  if (!gift) {
    throw new Error("Cadeau introuvable.");
  }

  return gift;
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

  /**
   * IMPORTANT :
   * Le catalogue utilise maintenant des IDs texte.
   *
   * Exemple :
   *
   * "rose"
   * "diamond"
   * "lion"
   * "afritok-legend"
   */
  giftId: string;

  quantity: number;

  context: "video" | "live";

  contextId?: string;

  idempotencyKey: string;
}) {

  /**
   * -------------------------------------------------------
   * VALIDATIONS
   * -------------------------------------------------------
   */

  if (senderId === recipientId) {
    throw new Error(
      "Vous ne pouvez pas vous envoyer un cadeau."
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

  if (
    !idempotencyKey ||
    idempotencyKey.length < 10
  ) {
    throw new Error(
      "Idempotency key invalide."
    );
  }


  /**
   * -------------------------------------------------------
   * 🎁 RÉCUPÉRER LE CADEAU DEPUIS gifts.ts
   * -------------------------------------------------------
   */

  const gift = findGift(giftId);


  /**
   * -------------------------------------------------------
   * 💰 PRIX OFFICIEL
   * -------------------------------------------------------
   *
   * Le prix vient UNIQUEMENT de gifts.ts.
   *
   * Le client ne peut pas envoyer :
   *
   * price: 1
   *
   * pour essayer de payer moins cher.
   */

  const unitPrice = Number(gift.coins);

  if (
    !Number.isFinite(unitPrice) ||
    unitPrice <= 0
  ) {
    throw new Error(
      "Prix du cadeau invalide."
    );
  }


  const totalAmount =
    unitPrice * quantity;

  const totalAmountString =
    totalAmount.toFixed(2);


  /**
   * -------------------------------------------------------
   * 🔐 TRANSACTION DATABASE
   * -------------------------------------------------------
   */

  return await db.transaction(async (tx) => {

    /**
     * -----------------------------------------------------
     * 🔁 PROTECTION DOUBLE ENVOI
     * -----------------------------------------------------
     */

    const existing = await tx
      .select()
      .from(giftTransactions)
      .where(
        eq(
          giftTransactions.idempotencyKey,
          idempotencyKey
        )
      )
      .limit(1);


    if (existing.length > 0) {

      const transaction =
        existing[0];


      /**
       * Les anciennes transactions utilisent
       * encore éventuellement un ID numérique.
       *
       * On ne dépend donc pas de la table gifts
       * pour reconstruire le cadeau.
       *
       * On utilise le catalogue officiel.
       */

      const existingGift =
        transaction.giftId;


      /**
       * Si la transaction historique utilise
       * un ancien ID numérique, on essaie de
       * retrouver le cadeau correspondant.
       *
       * Pour les nouvelles transactions,
       * giftId sera stocké dans contextId /
       * ou via le système de migration.
       */

      const senderWallet =
        await tx
          .select()
          .from(userCoins)
          .where(
            eq(
              userCoins.userId,
              senderId
            )
          )
          .limit(1);


      const recipientWallet =
        await tx
          .select()
          .from(userCoins)
          .where(
            eq(
              userCoins.userId,
              recipientId
            )
          )
          .limit(1);


      return {
        success: true,

        duplicate: true,

        transaction,

        balance:
          senderWallet.length > 0
            ? senderWallet[0].balance
            : "0",

        recipientBalance:
          recipientWallet.length > 0
            ? recipientWallet[0].balance
            : "0",

        gift: {
          id: gift.id,
          name: gift.name,
          icon: gift.icon,
          price: unitPrice,
          quantity:
            transaction.quantity,
          totalAmount:
            transaction.totalAmount,
        },
      };
    }


    /**
     * -----------------------------------------------------
     * 👤 PORTEFEUILLE EXPÉDITEUR
     * -----------------------------------------------------
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


    /**
     * -----------------------------------------------------
     * 👤 PORTEFEUILLE DESTINATAIRE
     * -----------------------------------------------------
     */

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
     * -----------------------------------------------------
     * 🔒 VERROUILLER LES PORTEFEUILLES
     * -----------------------------------------------------
     */

    const firstUserId =
      Math.min(
        senderId,
        recipientId
      );

    const secondUserId =
      Math.max(
        senderId,
        recipientId
      );


    const firstWalletResult =
      await tx
        .select()
        .from(userCoins)
        .where(
          eq(
            userCoins.userId,
            firstUserId
          )
        )
        .for("update");


    const secondWalletResult =
      await tx
        .select()
        .from(userCoins)
        .where(
          eq(
            userCoins.userId,
            secondUserId
          )
        )
        .for("update");


    if (
      firstWalletResult.length === 0 ||
      secondWalletResult.length === 0
    ) {
      throw new Error(
        "Portefeuille Coins introuvable."
      );
    }


    const senderWallet =
      senderId === firstUserId
        ? firstWalletResult[0]
        : secondWalletResult[0];


    const recipientWallet =
      recipientId === firstUserId
        ? firstWalletResult[0]
        : secondWalletResult[0];


    /**
     * -----------------------------------------------------
     * 💰 SOLDE EXPÉDITEUR
     * -----------------------------------------------------
     */

    const senderBalanceBefore =
      Number(senderWallet.balance);


    if (
      senderBalanceBefore <
      totalAmount
    ) {
      throw new Error(
        "Solde de Coins insuffisant."
      );
    }


    const senderBalanceAfter =
      senderBalanceBefore -
      totalAmount;


    /**
     * -----------------------------------------------------
     * 💰 SOLDE DESTINATAIRE
     * -----------------------------------------------------
     */

    const recipientBalanceBefore =
      Number(
        recipientWallet.balance
      );


    const recipientBalanceAfter =
      recipientBalanceBefore +
      totalAmount;


    /**
     * -----------------------------------------------------
     * ➖ DÉBIT EXPÉDITEUR
     * -----------------------------------------------------
     */

    await tx
      .update(userCoins)
      .set({
        balance:
          senderBalanceAfter.toFixed(2),

        totalSpent: sql`
          ${userCoins.totalSpent}
          + ${totalAmountString}
        `,

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
     * -----------------------------------------------------
     * ➕ CRÉDIT DESTINATAIRE
     * -----------------------------------------------------
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
     * -----------------------------------------------------
     * 📋 HISTORIQUE EXPÉDITEUR
     * -----------------------------------------------------
     */

    await tx
      .insert(coinTransactions)
      .values({
        userId: senderId,

        type: "gift_sent",

        amount:
          `-${totalAmountString}`,

        balanceBefore:
          senderBalanceBefore.toFixed(2),

        balanceAfter:
          senderBalanceAfter.toFixed(2),

        referenceId:
          idempotencyKey,

        description:
          `Cadeau envoyé : ${gift.name} x${quantity}`,
      });


    /**
     * -----------------------------------------------------
     * 📋 HISTORIQUE DESTINATAIRE
     * -----------------------------------------------------
     */

    await tx
      .insert(coinTransactions)
      .values({
        userId: recipientId,

        type: "gift_received",

        amount:
          totalAmountString,

        balanceBefore:
          recipientBalanceBefore.toFixed(2),

        balanceAfter:
          recipientBalanceAfter.toFixed(2),

        referenceId:
          idempotencyKey,

        description:
          `Cadeau reçu : ${gift.name} x${quantity}`,
      });


    const transactionResult =
      await tx
        .insert(giftTransactions)
        .values({
          senderId,

          recipientId,

          giftId,

          quantity,

          unitPrice:
            unitPrice.toFixed(2),

          totalAmount:
            totalAmountString,

          context,

          contextId:
            contextId ?? gift.id,

          idempotencyKey,
        })
        .returning();


    const transaction =
      transactionResult[0];


    /**
     * -----------------------------------------------------
     * ✅ RÉSULTAT
     * -----------------------------------------------------
     */

    return {
      success: true,

      duplicate: false,

      transaction,

      balance:
        senderBalanceAfter.toFixed(2),

      recipientBalance:
        recipientBalanceAfter.toFixed(2),

      gift: {
        id: gift.id,

        name: gift.name,

        icon: gift.icon,

        price:
          unitPrice,

        quantity,

        totalAmount:
          totalAmountString,
      },
    };
  });
}
