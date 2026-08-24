import {
  integer,
  numeric,
  serial,
  text,
  timestamp,
  varchar,
  pgTable,
} from "drizzle-orm/pg-core";

/**
 * =========================================================
 * 💵 AFRITOK — PORTEFEUILLE RÉEL DU CRÉATEUR
 * =========================================================
 */

export const creatorWallets = pgTable("creator_wallets", {
  id: serial("id").primaryKey(),

  userId: integer("userId").notNull().unique(),

  availableBalance: numeric("availableBalance", {
    precision: 18,
    scale: 2,
  })
    .notNull()
    .default("0"),

  totalEarned: numeric("totalEarned", {
    precision: 18,
    scale: 2,
  })
    .notNull()
    .default("0"),

  totalWithdrawn: numeric("totalWithdrawn", {
    precision: 18,
    scale: 2,
  })
    .notNull()
    .default("0"),

  currency: varchar("currency", {
    length: 3,
  })
    .notNull()
    .default("XOF"),

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

/**
 * =========================================================
 * 📋 HISTORIQUE ARGENT CRÉATEUR
 * =========================================================
 */

export const creatorTransactions = pgTable(
  "creator_transactions",
  {
    id: serial("id").primaryKey(),

    userId: integer("userId").notNull(),

    type: varchar("type", {
      length: 30,
    }).notNull(),
    // gift_received
    // withdrawal
    // refund
    // adjustment

    amount: numeric("amount", {
      precision: 18,
      scale: 2,
    }).notNull(),

    balanceBefore: numeric("balanceBefore", {
      precision: 18,
      scale: 2,
    }).notNull(),

    balanceAfter: numeric("balanceAfter", {
      precision: 18,
      scale: 2,
    }).notNull(),

    referenceId: varchar("referenceId", {
      length: 150,
    }),

    description: text("description"),

    createdAt: timestamp("createdAt", {
      mode: "string",
    })
      .defaultNow()
      .notNull(),
  }
);

export type CreatorWallet =
  typeof creatorWallets.$inferSelect;

export type InsertCreatorWallet =
  typeof creatorWallets.$inferInsert;

export type CreatorTransaction =
  typeof creatorTransactions.$inferSelect;

export type InsertCreatorTransaction =
  typeof creatorTransactions.$inferInsert;
