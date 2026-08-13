import {
  integer,
  numeric,
  serial,
  timestamp,
  varchar,
  pgTable,
} from "drizzle-orm/pg-core";

/**
 * =========================================================
 * 💰 AFRITOK — PORTEFEUILLE XOF
 * =========================================================
 *
 * Argent réel disponible dans le compte AfriTok.
 *
 * Ce portefeuille est séparé :
 *
 * 💰 Solde XOF
 * 🪙 Coins
 * 💵 Earnings créateur
 *
 * Le solde XOF servira à recharger/acheter des Coins.
 */

export const userWallets = pgTable("user_wallets", {
  id: serial("id").primaryKey(),

  /**
   * Un seul portefeuille XOF par utilisateur.
   */
  userId: integer("userId").notNull().unique(),

  /**
   * Solde disponible en francs CFA.
   *
   * Exemple :
   * 10000.00
   */
  balance: numeric("balance", {
    precision: 14,
    scale: 2,
  })
    .default("0")
    .notNull(),

  /**
   * Total d'argent déposé par l'utilisateur.
   */
  totalDeposited: numeric("totalDeposited", {
    precision: 14,
    scale: 2,
  })
    .default("0")
    .notNull(),

  /**
   * Total utilisé pour acheter des Coins.
   */
  totalUsedForCoins: numeric("totalUsedForCoins", {
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

export type UserWallet = typeof userWallets.$inferSelect;
export type InsertUserWallet = typeof userWallets.$inferInsert;


/**
 * =========================================================
 * 📋 HISTORIQUE DU PORTEFEUILLE XOF
 * =========================================================
 */

export const walletTransactions = pgTable(
  "wallet_transactions",
  {
    id: serial("id").primaryKey(),

    userId: integer("userId").notNull(),

    /**
     * deposit
     * coin_purchase
     * refund
     */
    type: varchar("type", {
      length: 30,
    }).notNull(),

    /**
     * Montant de l'opération en XOF.
     *
     * Positif = argent ajouté
     * Négatif = argent utilisé
     */
    amount: numeric("amount", {
      precision: 14,
      scale: 2,
    }).notNull(),

    balanceBefore: numeric("balanceBefore", {
      precision: 14,
      scale: 2,
    }).notNull(),

    balanceAfter: numeric("balanceAfter", {
      precision: 14,
      scale: 2,
    }).notNull(),

    /**
     * Référence du paiement Mobile Money
     * ou de l'opération interne.
     */
    referenceId: varchar("referenceId", {
      length: 150,
    }),
/**
 * État de l'opération.
 *
 * pending  = paiement en attente
 * success  = paiement confirmé
 * failed   = paiement échoué
 */
status: varchar("status", {
  length: 20,
})
  .default("pending")
  .notNull(),
    /**
     * orange_money
     * mtn_money
     * wave
     */
    paymentMethod: varchar("paymentMethod", {
      length: 30,
    }),

    description: varchar("description", {
      length: 255,
    }),

    createdAt: timestamp("createdAt", {
      mode: "string",
    })
      .defaultNow()
      .notNull(),
  }
);

export type WalletTransaction =
  typeof walletTransactions.$inferSelect;

export type InsertWalletTransaction =
  typeof walletTransactions.$inferInsert;
