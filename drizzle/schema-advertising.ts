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
 * 📢 AFRITOK — SYSTÈME PUBLICITAIRE
 * =========================================================
 *
 * Système indépendant des vidéos normales.
 *
 * Une entreprise peut créer une campagne avec :
 * - texte
 * - image
 * - vidéo
 *
 * Elle définit :
 * - son budget
 * - sa durée
 * - son ciblage
 *
 * Le paiement réel est traité séparément par
 * schema-payments.ts et payment-settlement.ts.
 */

/**
 * =========================================================
 * 📢 CAMPAGNES PUBLICITAIRES
 * =========================================================
 */

export const advertisingCampaigns = pgTable(
  "advertising_campaigns",
  {
    id: serial("id").primaryKey(),

    /**
     * Utilisateur/compte entreprise propriétaire.
     */
    advertiserId: integer("advertiserId").notNull(),

    /**
     * Nom de l'entreprise ou de la marque.
     */
    advertiserName: varchar("advertiserName", {
      length: 150,
    }).notNull(),

    /**
     * Nom de la campagne.
     */
    name: varchar("name", {
      length: 150,
    }).notNull(),

    /**
     * Type de publicité :
     *
     * text
     * image
     * video
     */
    adType: varchar("adType", {
      length: 20,
    }).notNull(),

    /**
     * Texte publicitaire.
     */
    textContent: text("textContent"),

    /**
     * Image publicitaire.
     */
    imageUrl: text("imageUrl"),

    /**
     * Vidéo publicitaire.
     */
    videoUrl: text("videoUrl"),

    /**
     * URL vers laquelle l'utilisateur peut être dirigé.
     */
    destinationUrl: text("destinationUrl"),

    /**
     * Budget total de la campagne.
     *
     * Exemple :
     * 10000 XOF
     */
    budget: numeric("budget", {
      precision: 18,
      scale: 2,
    }).notNull(),

    /**
     * Montant réellement dépensé.
     */
    spentAmount: numeric("spentAmount", {
      precision: 18,
      scale: 2,
    })
      .default("0")
      .notNull(),

    /**
     * Devise.
     */
    currency: varchar("currency", {
      length: 3,
    })
      .default("XOF")
      .notNull(),

    /**
     * Date de début.
     */
    startDate: timestamp("startDate", {
      mode: "string",
    }).notNull(),

    /**
     * Date de fin.
     */
    endDate: timestamp("endDate", {
      mode: "string",
    }).notNull(),

    /**
     * Statut de la campagne.
     *
     * draft
     * pending_payment
     * pending_review
     * active
     * paused
     * completed
     * rejected
     * cancelled
     */
    status: varchar("status", {
      length: 30,
    })
      .default("draft")
      .notNull(),

    /**
     * Référence du paiement AfriTok.
     *
     * Reliée au système payments.
     */
    paymentReference: varchar("paymentReference", {
      length: 150,
    }),

    /**
     * Nombre d'impressions.
     */
    impressions: integer("impressions")
      .default(0)
      .notNull(),

    /**
     * Nombre de clics.
     */
    clicks: integer("clicks")
      .default(0)
      .notNull(),

    /**
     * Pays ciblé.
     *
     * Exemple : CI
     */
    targetCountry: varchar("targetCountry", {
      length: 10,
    }),

    /**
     * Genre ciblé.
     *
     * Optionnel.
     */
    targetGender: varchar("targetGender", {
      length: 20,
    }),

    /**
     * Âge minimum ciblé.
     */
    targetAgeMin: integer("targetAgeMin"),

    /**
     * Âge maximum ciblé.
     */
    targetAgeMax: integer("targetAgeMax"),

    /**
     * Date de création.
     */
    createdAt: timestamp("createdAt", {
      mode: "string",
    })
      .defaultNow()
      .notNull(),

    /**
     * Dernière modification.
     */
    updatedAt: timestamp("updatedAt", {
      mode: "string",
    })
      .defaultNow()
      .notNull(),
  }
);

/**
 * =========================================================
 * 📊 ÉVÉNEMENTS PUBLICITAIRES
 * =========================================================
 *
 * Chaque impression ou clic est enregistré séparément.
 *
 * Cela permettra plus tard de calculer :
 *
 * - impressions
 * - clics
 * - CTR
 * - dépenses
 * - performances
 */

export const advertisingEvents = pgTable(
  "advertising_events",
  {
    id: serial("id").primaryKey(),

    /**
     * Campagne concernée.
     */
    campaignId: integer("campaignId").notNull(),

    /**
     * Utilisateur ayant vu/interagi avec la publicité.
     */
    userId: integer("userId"),

    /**
     * Type d'événement :
     *
     * impression
     * click
     */
    eventType: varchar("eventType", {
      length: 20,
    }).notNull(),

    /**
     * Montant éventuellement facturé
     * pour cet événement.
     */
    chargedAmount: numeric("chargedAmount", {
      precision: 18,
      scale: 4,
    })
      .default("0")
      .notNull(),

    /**
     * Identifiant permettant d'éviter
     * les doublons d'événements.
     */
    eventReference: varchar("eventReference", {
      length: 150,
    }).unique(),

    /**
     * Date de l'événement.
     */
    createdAt: timestamp("createdAt", {
      mode: "string",
    })
      .defaultNow()
      .notNull(),
  }
);

/**
 * =========================================================
 * 📈 TYPES
 * =========================================================
 */

export type AdvertisingCampaign =
  typeof advertisingCampaigns.$inferSelect;

export type InsertAdvertisingCampaign =
  typeof advertisingCampaigns.$inferInsert;

export type AdvertisingEvent =
  typeof advertisingEvents.$inferSelect;

export type InsertAdvertisingEvent =
  typeof advertisingEvents.$inferInsert;
