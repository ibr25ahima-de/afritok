import { eq, sql } from "drizzle-orm";
import {
  gifts,
  giftTransactions,
  userCoins,
  coinTransactions,
} from "../../drizzle/schema-coins";
import { db } from "../db";

/**
 * =========================================================
 * 🎁 AFRITOK — GIFTS SERVICE
 * =========================================================
 *
 * Gestion serveur des cadeaux virtuels.
 *
 * Fonctionne pour :
 * - vidéo
 * - live
 *
 * IMPORTANT :
 * Le client envoie uniquement :
 * - giftId
 * - recipientId
 * - quantity
 * - context
 * - contextId
 *
 * Le serveur récupère lui-même le prix du cadeau.
 */


/**
 * =========================================================
 * 🎁 RÉCUPÉRER LES CADEAUX DISPONIBLES
 * =========================================================
 */
export async function getActiveGifts() {
  return db
    .select()
    .from(gifts)
    .where(eq(gifts.isActive, true))
    .orderBy(sql`${gifts.price} ASC`);
}


/**
 * =========================================================
 * 🎁 RÉCUPÉRER UN CADEAU
 * =========================================================
 */
export async function getGift(giftId: number) {
  const result = await db
    .select()
    .from(gifts)
    .where(eq(gifts.id, giftId))
    .limit(1);

  return result[0] ?? null;
}


/**
 * =========================================================
 * 💰 RÉCUPÉRER LE PORTEFEUILLE
 * =========================================================
 */
async function getOrCreateWallet(
  userId: number
) {
  const existing = await db
    .select()
    .from(userCoins)
    .where(eq(userCoins.userId, userId))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  const created = await db
    .insert(userCoins)
    .values({
      userId,
      balance: "0",
      totalPurchased: "0",
      totalSpent: "0",
    })
    .returning();

  return created[0];
}


/**
 * =========================================================
 * 🎁 ENVOYER UN CADEAU
 * =========================================================
 *
 * Cette opération :
 *
 * 1. vérifie le cadeau
 * 2. vérifie le destinataire
 * 3. vérifie la quantité
 * 4. récupère le prix depuis la base
 * 5. vérifie le solde
 * 6. débite l'expéditeur
 * 7. enregistre le cadeau
 * 8. enregistre la transaction du portefeuille
 *
 * Toutes les opérations financières sont effectuées
 * dans UNE transaction PostgreSQL.
 */
export async function sendGift(params: {
  senderId: number;
  recipientId: number;
  giftId: number;
  quantity: number;
  context: "video" | "live";
  contextId?: string;
  idempotencyKey: string;
}) {
  const {
    senderId,
    recipientId,
    giftId,
    quantity,
    context,
    contextId,
    idempotencyKey,
  } = params;


  /**
   * =======================================================
   * VALIDATIONS
   * =======================================================
   */

  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new Error("INVALID_QUANTITY");
  }

  if (quantity > 100) {
    throw new Error("QUANTITY_TOO_HIGH");
  }

  if (senderId === recipientId) {
    throw new Error("CANNOT_GIFT_YOURSELF");
  }

  if (!idempotencyKey) {
    throw new Error("IDEMPOTENCY_KEY_REQUIRED");
  }


  /**
   * =======================================================
   * PROTECTION DOUBLE ENVOI
   * =======================================================
   *
   * Si la même requête arrive deux fois,
   * on retourne la transaction existante.
   */
  const existingTransaction = await db
    .select()
    .from(giftTransactions)
    .where(
      eq(
        giftTransactions.idempotencyKey,
        idempotencyKey
      )
    )
    .limit(1);

  if (existingTransaction.length > 0) {
    return {
      success: true,
      duplicate: true,
      transaction: existingTransaction[0],
    };
  }


  /**
   * =======================================================
   * RÉCUPÉRATION DU CADEAU
   * =======================================================
   *
   * Le prix vient TOUJOURS de la base.
   *
   * Le téléphone ne peut pas envoyer :
   *
   * price: 1
   *
   * pour essayer de payer moins cher.
   */
  const gift = await getGift(giftId);

  if (!gift) {
    throw new Error("GIFT_NOT_FOUND");
  }

  if (!gift.isActive) {
    throw new Error("GIFT_NOT_AVAILABLE");
  }


  /**
   * =======================================================
   * CALCUL DU MONTANT
   * =======================================================
   */
  const unitPrice = gift.price;

  const totalAmount = (
    Number(unitPrice) * quantity
  ).toFixed(2);


  /**
   * =======================================================
   * TRANSACTION FINANCIÈRE
   * =======================================================
   */
  const result = await db.transaction(async (tx) => {

    /**
     * Création du portefeuille si nécessaire.
     */
    await getOrCreateWallet(senderId);


    /**
     * -------------------------------------------------------
     * DÉBIT ATOMIQUE
     * -------------------------------------------------------
     *
     * Le débit n'est accepté que si :
     *
     * balance >= totalAmount
     *
     * Cela empêche :
     *
     * - solde négatif
     * - double dépense
     * - problèmes de concurrence
     */
    const updatedWallet = await tx
      .update(userCoins)
      .set({
        balance: sql`
          ${userCoins.balance} - ${totalAmount}
        `,
        totalSpent: sql`
          ${userCoins.totalSpent} + ${totalAmount}
        `,
        updatedAt: new Date().toISOString(),
      })
      .where(
        sql`
          ${userCoins.userId} = ${senderId}
          AND ${userCoins.balance} >= ${totalAmount}
        `
      )
      .returning({
        balance: userCoins.balance,
      });


    if (updatedWallet.length === 0) {
      throw new Error("INSUFFICIENT_BALANCE");
    }


    const balanceAfter =
      updatedWallet[0].balance;

    const balanceBefore = (
      Number(balanceAfter) +
      Number(totalAmount)
    ).toFixed(2);


    /**
     * -------------------------------------------------------
     * HISTORIQUE DU PORTEFEUILLE
     * -------------------------------------------------------
     */
    await tx
      .insert(coinTransactions)
      .values({
        userId: senderId,

        type: "gift_sent",

        amount: `-${totalAmount}`,

        balanceBefore,

        balanceAfter,

        referenceId: idempotencyKey,

        description:
          `Cadeau ${gift.name} envoyé à l'utilisateur ${recipientId}`,
      });


    /**
     * -------------------------------------------------------
     * ENREGISTRER LE CADEAU
     * -------------------------------------------------------
     */
    const insertedGift =
      await tx
        .insert(giftTransactions)
        .values({
          senderId,

          recipientId,

          giftId,

          quantity,

          unitPrice,

          totalAmount,

          context,

          contextId,

          idempotencyKey,
        })
        .returning();


    /**
     * -------------------------------------------------------
     * CRÉDITER LE DESTINATAIRE
     * -------------------------------------------------------
     *
     * Le destinataire reçoit ici le montant virtuel
     * correspondant au cadeau.
     *
     * Ce crédit est volontairement séparé de l'argent
     * réel et du système withdrawals.
     */
    const recipientWallet =
      await getOrCreateWallet(recipientId);


    const recipientBalanceBefore =
      recipientWallet.balance;


    const recipientUpdated =
      await tx
        .update(userCoins)
        .set({
          balance: sql`
            ${userCoins.balance} + ${totalAmount}
          `,

          updatedAt:
            new Date().toISOString(),
        })
        .where(
          eq(
            userCoins.userId,
            recipientId
          )
        )
        .returning({
          balance: userCoins.balance,
        });


    if (recipientUpdated.length === 0) {
      throw new Error(
        "RECIPIENT_WALLET_ERROR"
      );
    }


    const recipientBalanceAfter =
      recipientUpdated[0].balance;


    /**
     * -------------------------------------------------------
     * HISTORIQUE DU CADEAU REÇU
     * -------------------------------------------------------
     */
    await tx
      .insert(coinTransactions)
      .values({
        userId: recipientId,

        type: "gift_received",

        amount: totalAmount,

        balanceBefore:
          recipientBalanceBefore,

        balanceAfter:
          recipientBalanceAfter,

        referenceId:
          idempotencyKey,

        description:
          `Cadeau ${gift.name} reçu de l'utilisateur ${senderId}`,
      });


    return {
      transaction:
        insertedGift[0],

      senderBalance:
        balanceAfter,

      recipientBalance:
        recipientBalanceAfter,
    };
  });


  return {
    success: true,

    duplicate: false,

    transaction:
      result.transaction,

    balance:
      result.senderBalance,

    recipientBalance:
      result.recipientBalance,

    gift: {
      id: gift.id,
      name: gift.name,
      price: gift.price,
      quantity,
      totalAmount,
    },
  };
}
