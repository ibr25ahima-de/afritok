import { eq, desc, sql } from "drizzle-orm";

import { db } from "../db";

import {
  userCoins,
  coinTransactions,
  gifts,
  giftTransactions,
} from "../../drizzle/schema-coins";

/**
 * =========================================================
 * 🎁 AFRITOK — GIFTS SERVICE
 * =========================================================
 *
 * Ce fichier gère uniquement :
 *
 * - récupération des cadeaux actifs
 * - envoi des cadeaux
 * - débit des Coins de l'expéditeur
 * - crédit des Coins du destinataire
 * - historique des transactions
 *
 * IMPORTANT :
 * Le fichier gifts.ts existant reste inchangé.
 *
 * Le catalogue définitif utilisé par le serveur est celui
 * de la table "gifts".
 */


/**
 * =========================================================
 * 🎁 RÉCUPÉRER LES CADEAUX ACTIFS
 * =========================================================
 */

export async function getActiveGifts() {
  return await db
    .select()
    .from(gifts)
    .where(eq(gifts.isActive, true))
    .orderBy(desc(gifts.createdAt));
}


/**
 * =========================================================
 * 🎁 ENVOYER UN CADEAU
 * =========================================================
 *
 * Le serveur :
 *
 * 1. vérifie le cadeau
 * 2. vérifie le destinataire
 * 3. vérifie l'idempotencyKey
 * 4. verrouille le portefeuille de l'expéditeur
 * 5. vérifie son solde
 * 6. débite les Coins
 * 7. crédite le destinataire
 * 8. crée la transaction cadeau
 * 9. crée les historiques Coins
 *
 * Tout se fait dans UNE transaction PostgreSQL.
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
  /**
   * -------------------------------------------------------
   * VALIDATIONS
   * -------------------------------------------------------
   */

  if (senderId === recipientId) {
    throw new Error("Vous ne pouvez pas vous envoyer un cadeau.");
  }

  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
    throw new Error("Quantité de cadeau invalide.");
  }

  if (!idempotencyKey || idempotencyKey.length < 10) {
    throw new Error("Idempotency key invalide.");
  }


  return await db.transaction(async (tx) => {

    /**
     * -----------------------------------------------------
     * 🔁 PROTECTION CONTRE LES DOUBLES ENVOIS
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

      const transaction = existing[0];

      const senderWallet = await tx
        .select()
        .from(userCoins)
        .where(eq(userCoins.userId, senderId))
        .limit(1);

      const recipientWallet = await tx
        .select()
        .from(userCoins)
        .where(eq(userCoins.userId, recipientId))
        .limit(1);

      /**
       * Récupérer le cadeau pour reconstruire la réponse.
       */

      const giftResult = await tx
        .select()
        .from(gifts)
        .where(eq(gifts.id, transaction.giftId))
        .limit(1);

      if (giftResult.length === 0) {
        throw new Error("Cadeau introuvable.");
      }

      const gift = giftResult[0];

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
          price: gift.price,
          quantity: transaction.quantity,
          totalAmount: transaction.totalAmount,
        },
      };
    }


    /**
     * -----------------------------------------------------
     * 🎁 RÉCUPÉRER LE CADEAU
     * -----------------------------------------------------
     *
     * Le prix vient TOUJOURS de PostgreSQL.
     * Le client ne peut pas imposer son prix.
     */

    const giftResult = await tx
      .select()
      .from(gifts)
      .where(
        sql`
          ${gifts.id} = ${giftId}
          AND ${gifts.isActive} = true
        `
      )
      .limit(1);

    if (giftResult.length === 0) {
      throw new Error("Cadeau introuvable ou désactivé.");
    }

    const gift = giftResult[0];


    /**
     * -----------------------------------------------------
     * 💰 CALCUL DU PRIX
     * -----------------------------------------------------
     */

    const unitPrice = Number(gift.price);

    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      throw new Error("Prix du cadeau invalide.");
    }

    const totalAmount = unitPrice * quantity;

    const totalAmountString = totalAmount.toFixed(2);


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
     * 🔒 VERROUILLER LES DEUX PORTEFEUILLES
     * -----------------------------------------------------
     *
     * On verrouille toujours dans l'ordre des userId
     * afin de réduire le risque de deadlock.
     */

    const firstUserId = Math.min(
      senderId,
      recipientId
    );

    const secondUserId = Math.max(
      senderId,
      recipientId
    );


    const firstWalletResult = await tx
      .select()
      .from(userCoins)
      .where(eq(userCoins.userId, firstUserId))
      .for("update");

    const secondWalletResult = await tx
      .select()
      .from(userCoins)
      .where(eq(userCoins.userId, secondUserId))
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

    if (senderBalanceBefore < totalAmount) {
      throw new Error(
        "Solde de Coins insuffisant."
      );
    }

    const senderBalanceAfter =
      senderBalanceBefore - totalAmount;


    /**
     * -----------------------------------------------------
     * 💰 SOLDE DESTINATAIRE
     * -----------------------------------------------------
     */

    const recipientBalanceBefore =
      Number(recipientWallet.balance);

    const recipientBalanceAfter =
      recipientBalanceBefore + totalAmount;


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


    /**
     * -----------------------------------------------------
     * 🎁 ENREGISTRER LE CADEAU
     * -----------------------------------------------------
     */

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
            contextId ?? null,

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

        price:
          gift.price,

        quantity,

        totalAmount:
          totalAmountString,
      },
    };
  });
}