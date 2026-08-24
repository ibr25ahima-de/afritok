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
 * 💳 AFRITOK — PAIEMENTS RÉELS
 * =========================================================
 *
 * Cette table représente l'argent réel envoyé à AfriTok.
 *
 * Elle est totalement séparée :
 *
 * 💰 Paiements réels
 * 🪙 Coins
 * 💵 Earnings créateurs
 * 💼 Portefeuille XOF utilisateur
 */

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),

  /**
   * Utilisateur qui effectue le paiement.
   */
  userId: integer("userId").notNull(),

  /**
   * Montant demandé au prestataire.
   */
  amount: numeric("amount", {
    precision: 14,
    scale: 2,
  })
    .notNull(),

  /**
   * Montant réellement confirmé
   * par le prestataire.
   */
  confirmedAmount: numeric("confirmedAmount", {
    precision: 14,
    scale: 2,
  })
    .default("0")
    .notNull(),

  /**
   * Devise.
   */
  currency: varchar("currency", {
    length: 10,
  })
    .default("XOF")
    .notNull(),

  /**
   * Opérateur utilisé.
   *
   * orange
   * mtn
   * moov
   * wave
   */
  operator: varchar("operator", {
    length: 30,
  })
    .notNull(),

  /**
   * Numéro utilisé pour le paiement.
   */
  phone: varchar("phone", {
    length: 30,
  }),

  /**
   * Pourquoi l'utilisateur paie.
   *
   * wallet_recharge
   * coin_purchase
   * subscription
   * advertisement
   * service
   */
  purpose: varchar("purpose", {
    length: 50,
  })
    .notNull(),

  /**
   * Produit concerné par le paiement.
   * Nullable pour préserver les paiements historiques.
   */
  productId: varchar("productId", {
    length: 150,
  }),

  /**
   * Référence interne AfriTok.
   *
   * Exemple :
   *
   * afritok_pay_xxxxx
   */
  referenceId: varchar("referenceId", {
    length: 150,
  })
    .notNull()
    .unique(),

  /**
   * Référence fournie par le prestataire.
   *
   * Exemple :
   *
   * identifiant Orange Money
   * identifiant MTN
   * identifiant Wave
   */
  providerReference: varchar("providerReference", {
    length: 150,
  }),

  /**
   * État du paiement.
   */
  status: varchar("status", {
    length: 20,
  })
    .default("pending")
    .notNull(),

  /**
   * Date de confirmation réelle.
   */
  confirmedAt: timestamp("confirmedAt", {
    mode: "string",
  }),

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

export type Payment =
  typeof payments.$inferSelect;

export type InsertPayment =
  typeof payments.$inferInsert;
