import {
  integer,
  text,
  timestamp,
  varchar,
  numeric,
  boolean,
  pgTable,
  serial,
} from "drizzle-orm/pg-core";

/**
 * =========================================================
 * 🪙 AFRITOK — COINS & CADEAUX VIRTUELS
 * =========================================================
 *
 * Ce fichier contient uniquement le nouveau système :
 *
 * 1. Portefeuille de coins utilisateur
 * 2. Historique des mouvements de coins
 * 3. Catalogue des cadeaux
 * 4. Historique des cadeaux envoyés
 *
 * ⚠️ IMPORTANT :
 * Ce système est totalement séparé du système existant
 * earnings / microEarnings / withdrawals.
 *
 * Il ne modifie pas l'argent réel déjà généré par AfriTok.
 */


/**
 * =========================================================
 * 🪙 USER COINS — PORTEFEUILLE
 * =========================================================
 *
 * Chaque utilisateur possède un portefeuille de coins.
 *
 * Exemple :
 *
 * balance = 10000
 *
 * L'utilisateur peut utiliser ces coins pour envoyer
 * des cadeaux virtuels.
 */
export const userCoins = pgTable("user_coins", {
  id: serial("id").primaryKey(),

  /**
   * Un seul portefeuille par utilisateur.
   */
  userId: integer("userId").notNull().unique(),

  /**
   * Solde actuel de coins.
   *
   * NUMERIC est utilisé pour éviter les problèmes
   * de précision des nombres JavaScript.
   */
  balance: numeric("balance", {
    precision: 14,
    scale: 2,
  })
    .default("0")
    .notNull(),

  /**
   * Total de coins achetés/rechargés.
   */
  totalPurchased: numeric("totalPurchased", {
    precision: 14,
    scale: 2,
  })
    .default("0")
    .notNull(),

  /**
   * Total de coins dépensés.
   */
  totalSpent: numeric("totalSpent", {
    precision: 14,
    scale: 2,
  })
    .default("0")
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

export type UserCoins = typeof userCoins.$inferSelect;
export type InsertUserCoins = typeof userCoins.$inferInsert;


/**
 * =========================================================
 * 📋 COIN TRANSACTIONS — HISTORIQUE DU PORTEFEUILLE
 * =========================================================
 *
 * Toutes les opérations concernant les coins sont conservées.
 *
 * Exemples :
 *
 * purchase       → recharge
 * gift_sent      → cadeau envoyé
 * gift_received  → cadeau reçu
 * bonus          → bonus offert par AfriTok
 * refund         → remboursement
 */
export const coinTransactions = pgTable("coin_transactions", {
  id: serial("id").primaryKey(),

  /**
   * Utilisateur concerné par la transaction.
   */
  userId: integer("userId").notNull(),

  /**
   * Type de transaction.
   */
  type: varchar("type", {
    length: 30,
  }).notNull(),

  /**
   * Montant du mouvement.
   *
   * Pour un achat :
   * +10000
   *
   * Pour une dépense :
   * -500
   */
  amount: numeric("amount", {
    precision: 14,
    scale: 2,
  }).notNull(),

  /**
   * Solde avant l'opération.
   */
  balanceBefore: numeric("balanceBefore", {
    precision: 14,
    scale: 2,
  }).notNull(),

  /**
   * Solde après l'opération.
   */
  balanceAfter: numeric("balanceAfter", {
    precision: 14,
    scale: 2,
  }).notNull(),

  /**
   * Identifiant d'une opération externe ou interne.
   *
   * Exemple :
   * - identifiant paiement
   * - identifiant cadeau
   * - identifiant remboursement
   */
  referenceId: varchar("referenceId", {
    length: 100,
  }),

  /**
   * Description lisible.
   */
  description: text("description"),

  createdAt: timestamp("createdAt", {
    mode: "string",
  })
    .defaultNow()
    .notNull(),
});

export type CoinTransaction =
  typeof coinTransactions.$inferSelect;

export type InsertCoinTransaction =
  typeof coinTransactions.$inferInsert;


/**
 * =========================================================
 * 🎁 GIFTS — CATALOGUE DES CADEAUX
 * =========================================================
 *
 * Cette table contient les cadeaux disponibles dans AfriTok.
 *
 * Exemple :
 *
 * Rose       → 100 coins
 * Cœur       → 500 coins
 * Diamant    → 1000 coins
 *
 * Le prix est TOUJOURS récupéré depuis cette table
 * côté serveur.
 *
 * ⚠️ Le téléphone de l'utilisateur ne doit jamais
 * pouvoir décider du prix.
 */
export const gifts = pgTable("gifts", {
  id: serial("id").primaryKey(),

  /**
   * Nom du cadeau.
   */
  name: varchar("name", {
    length: 100,
  }).notNull(),

  /**
   * Description facultative.
   */
  description: text("description"),

  /**
   * Image ou icône du cadeau.
   */
  iconUrl: text("iconUrl"),

  /**
   * Animation facultative.
   *
   * Peut être utilisée plus tard pour afficher
   * une animation lorsqu'un cadeau est envoyé.
   */
  animationUrl: text("animationUrl"),

  /**
   * Prix du cadeau en coins.
   */
  price: numeric("price", {
    precision: 14,
    scale: 2,
  }).notNull(),

  /**
   * Permet à l'administration de désactiver
   * temporairement un cadeau sans le supprimer.
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
 * 🎁 GIFT TRANSACTIONS — CADEAUX ENVOYÉS
 * =========================================================
 *
 * Cette table enregistre chaque cadeau envoyé.
 *
 * Elle fonctionne pour :
 *
 * - vidéo
 * - live
 *
 * Exemple :
 *
 * utilisateur 12
 *     ↓
 * cadeau Diamant
 *     ↓
 * utilisateur 45
 *     ↓
 * live #abc123
 *
 */
export const giftTransactions = pgTable("gift_transactions", {
  id: serial("id").primaryKey(),

  /**
   * Personne qui envoie le cadeau.
   */
  senderId: integer("senderId").notNull(),

  /**
   * Personne qui reçoit le cadeau.
   */
  recipientId: integer("recipientId").notNull(),

  /**
   * Identifiant du cadeau provenant du catalogue
   * server/coins/gifts.ts
   *
   * Exemples :
   * "rose"
   * "diamond"
   * "lion"
   * "afritok-legend"
   */
  giftId: varchar("giftId", {
    length: 100,
  }).notNull(),

  /**
   * Nombre de cadeaux envoyés.
   *
   * Exemple :
   * quantity = 5
   *
   * signifie 5 cadeaux identiques.
   */
  quantity: integer("quantity")
    .default(1)
    .notNull(),

  /**
   * Prix du cadeau au moment de l'achat.
   *
   * Très important :
   * on conserve le prix historique.
   *
   * Si l'administration change plus tard le prix
   * d'une Rose de 100 à 150 coins,
   * les anciennes transactions restent à 100.
   */
  unitPrice: numeric("unitPrice", {
    precision: 14,
    scale: 2,
  }).notNull(),

  /**
   * Prix total payé.
   *
   * Exemple :
   *
   * unitPrice = 500
   * quantity = 3
   *
   * totalAmount = 1500
   */
  totalAmount: numeric("totalAmount", {
    precision: 14,
    scale: 2,
  }).notNull(),

  /**
   * Endroit où le cadeau a été envoyé.
   *
   * video
   * live
   */
  context: varchar("context", {
    length: 20,
  }).notNull(),

  /**
   * Identifiant du contexte.
   *
   * Pour une vidéo :
   * context = "video"
   * contextId = "123"
   *
   * Pour un live :
   * context = "live"
   * contextId = "live_abc123"
   */
  contextId: varchar("contextId", {
    length: 100,
  }),

  /**
   * Protection contre les doubles paiements.
   *
   * Si l'utilisateur appuie deux fois très rapidement
   * sur le bouton "Envoyer", la même opération ne doit
   * pas être exécutée deux fois.
   */
  idempotencyKey: varchar("idempotencyKey", {
    length: 150,
  })
    .notNull()
    .unique(),

  createdAt: timestamp("createdAt", {
    mode: "string",
  })
    .defaultNow()
    .notNull(),
});

export type GiftTransaction =
  typeof giftTransactions.$inferSelect;

export type InsertGiftTransaction =
  typeof giftTransactions.$inferInsert;
