import { eq, desc, sql } from "drizzle-orm";

import { db } from "../db";

import {
  userCoins,
  coinTransactions,
  gifts,
  giftTransactions,
} from "../../drizzle/schema-coins";

import { GIFTS } from "./gifts";

/**
 * =========================================================
 * 🎁 AFRITOK — GIFTS SERVICE
 * =========================================================
 *
 * Le catalogue officiel est défini dans :
 *
 * server/coins/gifts.ts
 *
 * La table PostgreSQL "gifts" sert de catalogue serveur
 * exploitable par le client et par sendGift.
 *
 * Au premier appel, les cadeaux du catalogue sont
 * automatiquement synchronisés dans PostgreSQL.
 */


/**
 * =========================================================
 * 🔧 EXTRAIRE L'ICÔNE DU NOM DU CATALOGUE
 * =========================================================
 *
 * Dans gifts.ts nous avons par exemple :
 *
 * "🌹 Rose"
 * "💎 Diamant"
 * "👑 Couronne"
 *
 * On sépare automatiquement :
 *
 * icon = 🌹
 * name = Rose
 */

function splitGiftName(value: string) {
  const match = value.match(
    /^(\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*)\s*(.*)$/u
  );

  if (!match) {
    return {
      icon: "🎁",
      name: value.trim(),
    };
  }

  return {
    icon: match[1],
    name: match[2].trim(),
  };
}


/**
 * =========================================================
 * 🔄 SYNCHRONISER LE CATALOGUE
 * =========================================================
 *
 * Le fichier gifts.ts est la source du catalogue.
 *
 * Chaque cadeau absent de PostgreSQL est créé.
 *
 * Si le cadeau existe déjà :
 * - son prix est synchronisé
 * - son icône est synchronisée
 *
 * Les cadeaux présents en DB mais absents du fichier
 * ne sont PAS supprimés.
 *
 * Cela permet de garder une éventuelle désactivation
 * administrative.
 */

async function syncGiftCatalog() {
  const existingGifts = await db
    .select()
    .from(gifts);

  for (const catalogGift of GIFTS) {
    const parsed = splitGiftName(
      catalogGift.name
    );

    const existing = existingGifts.find(
      (gift) => gift.name === parsed.name
    );

    /**
     * 🎁 Nouveau cadeau
     */
    if (!existing) {
      await db
        .insert(gifts)
        .values({
          name: parsed.name,

          description:
            `Cadeau virtuel ${parsed.name}`,

          iconUrl: parsed.icon,

          animationUrl: null,

          price:
            catalogGift.coins.toFixed(2),

          isActive: true,

          updatedAt:
            new Date().toISOString(),
        });

      continue;
    }

    /**
     * 🔄 Cadeau existant
     *
     * Le catalogue gifts.ts reste la source
     * du nom / prix / icône.
     */
    await db
      .update(gifts)
      .set({
        iconUrl: parsed.icon,

        price:
          catalogGift.coins.toFixed(2),

        updatedAt:
          new Date().toISOString(),
      })
      .where(
        eq(
          gifts.id,
          existing.id
        )
      );
  }
}


/**
 * =========================================================
 * 🎁 RÉCUPÉRER LES CADEAUX ACTIFS
 * =========================================================
 */

export async function getActiveGifts() {
  /**
   * Synchronisation automatique du catalogue.
   */
  await syncGiftCatalog();

  /**
   * Ensuite seulement on lit PostgreSQL.
   */
  return await db
    .select()
    .from(gifts)
    .where(
      eq(gifts.isActive, true)
    )
    .orderBy(
      desc(gifts.createdAt)
    );
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


  return await db.transaction(async (tx) => {

    /**
     * -----------------------------------------------------
     * 🔄 SYNCHRONISER LE CATALOGUE AVANT UTILISATION
     * -----------------------------------------------------
     *
     * On s'assure que les cadeaux de gifts.ts existent
     * dans PostgreSQL avant de chercher giftId.
     *
     * Important :
     * la vérification du prix reste toujours côté serveur.
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
      throw new Error(
        "Cadeau introuvable ou désactivé."
      );
    }

    const gift = giftResult[0];


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

          icon:
            gift.iconUrl ?? "🎁",

          price:
            gift.price,

          quantity:
            transaction.quantity,

          totalAmount:
            transaction.totalAmount,
        },
      };
    }


    /**
     * -----------------------------------------------------
     * 💰 PRIX SERVEUR
     * -----------------------------------------------------
     */

    const unitPrice =
      Number(gift.price);

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
     * -----------------------------------------------------
     * 👤 PORTEFEUILLES
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
        target:
          userCoins.userId,
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
        target:
          userCoins.userId,
      });


    /**
     * -----------------------------------------------------
     * 🔒 VERROUILLAGE
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
     * 💰 SOLDES
     * -----------------------------------------------------
     */

    const senderBalanceBefore =
      Number(
        senderWallet.balance
      );

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
        userId:
          senderId,

        type:
          "gift_sent",

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
        userId:
          recipientId,

        type:
          "gift_received",

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
     * 🎁 TRANSACTION CADEAU
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

        icon:
          gift.iconUrl ?? "🎁",

        price:
          gift.price,

        quantity,

        totalAmount:
          totalAmountString,
      },
    };
  });
}
