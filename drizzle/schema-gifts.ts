import {
  integer,
  serial,
  timestamp,
  varchar,
  pgTable,
  boolean,
} from "drizzle-orm/pg-core";

/**
 * =========================================================
 * 🎁 AFRITOK — CADEAUX VIRTUELS
 * =========================================================
 *
 * Les cadeaux sont achetés avec des Coins.
 *
 * Exemple :
 *
 * 🌹 Rose       → 10 Coins
 * ❤️ Cœur       → 50 Coins
 * 💎 Diamant    → 500 Coins
 * 👑 Couronne   → 1 000 Coins
 *
 * Les cadeaux peuvent être envoyés :
 *
 * 🎬 sur une vidéo
 * 🔴 pendant un Live
 *
 * Le créateur reçoit ensuite la valeur correspondante
 * dans ses gains AfriTok.
 */

/**
 * =========================================================
 * 🎁 CADEAUX DISPONIBLES
 * =========================================================
 */

export const gifts = pgTable("gifts", {
  id: serial("id").primaryKey(),

  /**
   * Nom affiché du cadeau.
   *
   * Exemple :
   * Rose
   * Cœur
   * Diamant
   * Couronne
   */
  name: varchar("name", {
    length: 100,
  }).notNull(),

  /**
   * Emoji ou icône du cadeau.
   */
  icon: varchar("icon", {
    length: 20,
  }).notNull(),

  /**
   * Prix du cadeau en Coins.
   */
  coinPrice: integer("coinPrice").notNull(),

  /**
   * Cadeau disponible ou désactivé.
   */
  isActive: boolean("isActive")
    .default(true)
    .notNull(),

  createdAt: timestamp("createdAt", {
    mode: "string",
  })
    .defaultNow()
    .notNull(),

  updatedAt: timestamp("updatedAt", {
    mode: "string",
  })
    .defaultNow()
    .notNull(),
});

export type Gift = typeof gifts.$inferSelect;
export type InsertGift = typeof gifts.$inferInsert;


/**
 * =========================================================
 * 📋 HISTORIQUE DES CADEAUX ENVOYÉS
 * =========================================================
 */

export const giftTransactions = pgTable(
  "gift_transactions",
  {
    id: serial("id").primaryKey(),

    /**
     * Utilisateur qui envoie le cadeau.
     */
    senderId: integer("senderId").notNull(),

    /**
     * Créateur qui reçoit le cadeau.
     */
    receiverId: integer("receiverId").notNull(),

    /**
     * Cadeau envoyé.
     */
    giftId: integer("giftId").notNull(),

    /**
     * Nombre de cadeaux envoyés.
     *
     * Exemple :
     * 1 Rose
     * 5 Roses
     * 10 Cœurs
     */
    quantity: integer("quantity")
      .default(1)
      .notNull(),

    /**
     * Prix d'un cadeau au moment de l'envoi.
     *
     * On conserve le prix historique même si le prix
     * du cadeau est modifié plus tard.
     */
    coinPrice: integer("coinPrice").notNull(),

    /**
     * Nombre total de Coins dépensés.
     */
    totalCoins: integer("totalCoins").notNull(),

    /**
     * Vidéo concernée.
     *
     * NULL si le cadeau est envoyé pendant un Live.
     */
    videoId: integer("videoId"),

    /**
     * Live concerné.
     *
     * NULL si le cadeau est envoyé sur une vidéo.
     */
    liveId: integer("liveId"),

    /**
     * Référence unique de l'opération.
     */
    referenceId: varchar("referenceId", {
      length: 150,
    }),

    createdAt: timestamp("createdAt", {
      mode: "string",
    })
      .defaultNow()
      .notNull(),
  }
);

export type GiftTransaction =
  typeof giftTransactions.$inferSelect;

export type InsertGiftTransaction =
  typeof giftTransactions.$inferInsert;