import { eq, and, desc } from "drizzle-orm";
import { db } from "../db";

import {
  gifts,
  giftTransactions,
} from "../../drizzle/schema-gifts";

/**
 * =========================================================
 * 🎁 AFRITOK — GIFT SERVICE
 * =========================================================
 *
 * Gestion des cadeaux virtuels.
 *
 * Les cadeaux sont payés uniquement avec des Coins.
 *
 * 💰 XOF
 *    ↓
 * 🪙 Coins
 *    ↓
 * 🎁 Cadeaux
 *
 * Le portefeuille XOF n'est donc PAS débité directement
 * lors de l'envoi d'un cadeau.
 */

/**
 * =========================================================
 * 🎁 RÉCUPÉRER LES CADEAUX DISPONIBLES
 * =========================================================
 */

export async function getAvailableGifts() {
  return await db
    .select()
    .from(gifts)
    .where(eq(gifts.isActive, true))
    .orderBy(gifts.coinPrice);
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
 * 📋 HISTORIQUE DES CADEAUX ENVOYÉS
 * =========================================================
 */

export async function getGiftTransactions(
  userId: number
) {
  return await db
    .select()
    .from(giftTransactions)
    .where(eq(giftTransactions.senderId, userId))
    .orderBy(desc(giftTransactions.createdAt));
}

/**
 * =========================================================
 * 🎁 PRÉPARER UN CADEAU
 * =========================================================
 *
 * Cette fonction vérifie :
 *
 * ✅ que le cadeau existe
 * ✅ qu'il est actif
 * ✅ que la quantité est valide
 *
 * Le débit réel des Coins sera connecté dans la prochaine
 * étape avec le système Coins existant.
 */

export async function prepareGift(
  senderId: number,
  receiverId: number,
  giftId: number,
  quantity: number,
  videoId?: number | null,
  liveId?: number | null
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

  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new Error(
      "La quantité doit être supérieure ou égale à 1."
    );
  }

  if (videoId && liveId) {
    throw new Error(
      "Un cadeau ne peut pas être associé à une vidéo et un Live en même temps."
    );
  }

  if (!videoId && !liveId) {
    throw new Error(
      "Le cadeau doit être associé à une vidéo ou à un Live."
    );
  }

  const gift = await getGiftById(giftId);

  if (!gift) {
    throw new Error("Cadeau introuvable.");
  }

  if (!gift.isActive) {
    throw new Error(
      "Ce cadeau n'est plus disponible."
    );
  }

  const totalCoins =
    gift.coinPrice * quantity;

  return {
    success: true,

    senderId,

    receiverId,

    giftId: gift.id,

    giftName: gift.name,

    giftIcon: gift.icon,

    quantity,

    coinPrice: gift.coinPrice,

    totalCoins,

    videoId: videoId ?? null,

    liveId: liveId ?? null,

    status: "ready",
  };
}