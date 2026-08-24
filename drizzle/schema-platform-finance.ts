import {
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

/**
 * =========================================================
 * 💰 AFRITOK — PORTEFEUILLE ARGENT RÉEL
 * =========================================================
 */

export const platformWallet = pgTable("platform_wallet", {
  id: serial("id").primaryKey(),

  name: varchar("name", {
    length: 50,
  })
    .notNull()
    .default("AfriTok"),

  balance: numeric("balance", {
    precision: 18,
    scale: 4,
  })
    .notNull()
    .default("0"),

  totalRevenue: numeric("totalRevenue", {
    precision: 18,
    scale: 4,
  })
    .notNull()
    .default("0"),

  totalExpenses: numeric("totalExpenses", {
    precision: 18,
    scale: 4,
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
 * 📋 TRANSACTIONS ARGENT RÉEL
 * =========================================================
 */

export const platformTransactions = pgTable(
  "platform_transactions",
  {
    id: serial("id").primaryKey(),

    userId: integer("userId"),

    amount: numeric("amount", {
      precision: 18,
      scale: 4,
    }).notNull(),

    currency: varchar("currency", {
      length: 3,
    })
      .notNull()
      .default("XOF"),

    direction: varchar("direction", {
      length: 20,
    }).notNull(),

    source: varchar("source", {
      length: 50,
    }).notNull(),

    status: varchar("status", {
      length: 30,
    })
      .notNull()
      .default("completed"),

    paymentProvider: varchar("paymentProvider", {
      length: 30,
    }),

    paymentReference: varchar("paymentReference", {
      length: 255,
    }),

    externalId: varchar("externalId", {
      length: 255,
    }).unique(),

    description: text("description"),

    metadata: text("metadata"),

    createdAt: timestamp("createdAt", {
      mode: "string",
    })
      .defaultNow()
      .notNull(),
  }
);


export type PlatformWallet =
  typeof platformWallet.$inferSelect;

export type InsertPlatformWallet =
  typeof platformWallet.$inferInsert;

export type PlatformTransaction =
  typeof platformTransactions.$inferSelect;

export type InsertPlatformTransaction =
  typeof platformTransactions.$inferInsert;
