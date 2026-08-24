import { db } from "../db";
import {
  userCoins,
  coinTransactions,
} from "../../drizzle/schema-coins";
import { payments } from "../../drizzle/schema-payments";
import {
  platformWallet,
  platformTransactions,
} from "../../drizzle/schema-platform-finance";
import { eq, and, sql } from "drizzle-orm";

/**
 * =========================================================
 * 🪙 AFRITOK — COIN PURCHASE SERVICE
 * =========================================================
 *
 * IMPORTANT :
 *
 * Les Coins ne sont JAMAIS crédités simplement parce qu'une
 * référence de paiement existe.
 *
 * Le paiement doit être :
 *
 * 1. existant dans payments
 * 2. destiné à "coin_purchase"
 * 3. confirmé avec status = "success"
 * 4. du bon montant
 *
 * Le crédit des Coins intervient donc uniquement après
 * confirmation réelle du paiement.
 */

/**
 * =========================================================
 * 📦 PACKAGES
 * =========================================================
 */

export const COIN_PACKAGES = [
  {
    id: "coins_100",
    coins: 100,
    price: 100,
    currency: "XOF",
    name: "100 Coins",
  },
  {
    id: "coins_500",
    coins: 500,
    price: 500,
    currency: "XOF",
    name: "500 Coins",
  },
  {
    id: "coins_1000",
    coins: 1000,
    price: 1000,
    currency: "XOF",
    name: "1 000 Coins",
  },
  {
    id: "coins_5000",
    coins: 5000,
    price: 5000,
    currency: "XOF",
    name: "5 000 Coins",
  },
  {
    id: "coins_10000",
    coins: 10000,
    price: 10000,
    currency: "XOF",
    name: "10 000 Coins",
  },
] as const;

export function getCoinPackages() {
  return COIN_PACKAGES;
}

/**
 * =========================================================
 * 🪙 ACHETER DES COINS APRÈS PAIEMENT CONFIRMÉ
 * =========================================================
 */

export async function purchaseCoins({
  userId,
  packageId,
  paymentReference,
}: {
  userId: number;
  packageId: string;
  paymentReference: string;
}) {
  if (!userId) {
    throw new Error("Utilisateur invalide.");
  }

  if (
    !paymentReference ||
    paymentReference.length < 5
  ) {
    throw new Error(
      "Référence de paiement invalide."
    );
  }

  const coinPackage =
    COIN_PACKAGES.find(
      (item) => item.id === packageId
    );

  if (!coinPackage) {
    throw new Error(
      "Package Coins introuvable."
    );
  }

  return await db.transaction(
    async (tx) => {

      /**
       * =====================================================
       * 1️⃣ VÉRIFIER LE PAIEMENT RÉEL
       * =====================================================
       */

      const paymentResult =
        await tx
          .select()
          .from(payments)
          .where(
            and(
              eq(
                payments.referenceId,
                paymentReference
              ),
              eq(
                payments.userId,
                userId
              )
            )
          )
          .limit(1);

      if (paymentResult.length === 0) {
        throw new Error(
          "Paiement introuvable."
        );
      }

      const payment =
        paymentResult[0];

      /**
       * Le paiement doit obligatoirement
       * être destiné à l'achat de Coins.
       */

      if (
        payment.purpose !==
        "coin_purchase"
      ) {
        throw new Error(
          "Ce paiement n'est pas destiné à l'achat de Coins."
        );
      }

      /**
       * Le produit doit être explicitement associé
       * au paiement. Les anciens paiements sans productId
       * restent compatibles avec la base, mais ne peuvent
       * pas être crédités automatiquement.
       */
      if (!payment.productId) {
        throw new Error(
          "Produit Coins manquant sur le paiement."
        );
      }

      if (payment.productId !== packageId) {
        throw new Error(
          "Le produit du paiement ne correspond pas au package Coins demandé."
        );
      }

      /**
       * Le paiement doit être confirmé.
       */

      if (
        payment.status !==
        "success"
      ) {
        throw new Error(
          "Le paiement n'est pas encore confirmé."
        );
      }

      /**
       * La devise doit être XOF.
       */

      if (
        payment.currency !==
        "XOF"
      ) {
        throw new Error(
          "Devise de paiement invalide."
        );
      }

      /**
       * =====================================================
       * 2️⃣ VÉRIFIER LE MONTANT
       * =====================================================
       *
       * Le prix vient TOUJOURS du serveur.
       */

      const confirmedAmount =
        Number(
          payment.confirmedAmount
        );

      if (
        !Number.isFinite(
          confirmedAmount
        ) ||
        confirmedAmount <= 0
      ) {
        throw new Error(
          "Montant confirmé invalide."
        );
      }

      if (
        confirmedAmount !==
        coinPackage.price
      ) {
        throw new Error(
          `Montant du paiement incorrect. ` +
          `Attendu : ${coinPackage.price} XOF. ` +
          `Reçu : ${confirmedAmount} XOF.`
        );
      }

      /**
       * =====================================================
       * 3️⃣ VÉRIFIER SI LES COINS ONT DÉJÀ ÉTÉ CRÉDITÉS
       * =====================================================
       */

      const existingTransaction =
        await tx
          .select()
          .from(coinTransactions)
          .where(
            eq(
              coinTransactions.referenceId,
              paymentReference
            )
          )
          .limit(1);

      if (
        existingTransaction.length > 0
      ) {
        return {
          success: true,
          duplicate: true,
          transaction:
            existingTransaction[0],
        };
      }

      /**
       * Une transaction plateforme existante sans transaction
       * Coins indique une incohérence : on refuse de poursuivre
       * afin d’éviter tout crédit partiel ou double comptabilisation.
       */
      const existingPlatformTransaction =
        await tx
          .select()
          .from(platformTransactions)
          .where(
            eq(
              platformTransactions.externalId,
              paymentReference
            )
          )
          .limit(1);

      if (existingPlatformTransaction.length > 0) {
        throw new Error(
          "Transaction plateforme déjà enregistrée sans crédit Coins correspondant."
        );
      }

      /**
       * =====================================================
       * 4️⃣ ENREGISTRER LE PAIEMENT DANS LA FINANCE PLATEFORME
       * =====================================================
       *
       * Cette opération et le crédit des Coins restent dans
       * la même transaction SQL.
       */

      await tx.execute(
        sql`select pg_advisory_xact_lock(872342)`
      );

      let platformWalletResult = await tx
        .select()
        .from(platformWallet)
        .for("update");

      if (platformWalletResult.length > 1) {
        throw new Error(
          "Plusieurs portefeuilles plateforme existent. Correction de la base requise."
        );
      }

      if (platformWalletResult.length === 0) {
        await tx
          .insert(platformWallet)
          .values({
            name: "AfriTok",
            balance: "0",
            totalRevenue: "0",
            totalExpenses: "0",
            currency: "XOF",
          });

        platformWalletResult = await tx
          .select()
          .from(platformWallet)
          .for("update");
      }

      const platform = platformWalletResult[0];

      if (!platform) {
        throw new Error(
          "Portefeuille plateforme introuvable."
        );
      }

      const platformBalanceBefore =
        Number(platform.balance);

      const platformBalanceAfter =
        platformBalanceBefore + confirmedAmount;

      const platformRevenueAfter =
        Number(platform.totalRevenue) + confirmedAmount;

      await tx
        .update(platformWallet)
        .set({
          balance:
            platformBalanceAfter.toFixed(4),

          totalRevenue:
            platformRevenueAfter.toFixed(4),

          updatedAt:
            new Date().toISOString(),
        })
        .where(
          eq(
            platformWallet.id,
            platform.id
          )
        );

      await tx
        .insert(platformTransactions)
        .values({
          userId,

          amount:
            confirmedAmount.toFixed(4),

          currency:
            payment.currency,

          direction: "in",

          source: "coin_purchase",

          status: "completed",

          paymentProvider:
            payment.operator,

          paymentReference:
            payment.providerReference,

          externalId:
            paymentReference,

          description:
            `Paiement Coins confirmé — ${coinPackage.name}`,
        });

      /**
       * =====================================================
       * 5️⃣ RÉCUPÉRER / CRÉER LE PORTEFEUILLE COINS
       * =====================================================
       */

      await tx
        .insert(userCoins)
        .values({
          userId,
          balance: "0",
          totalPurchased: "0",
          totalSpent: "0",
        })
        .onConflictDoNothing({
          target:
            userCoins.userId,
        });

      const wallets =
        await tx
          .select()
          .from(userCoins)
          .where(
            eq(
              userCoins.userId,
              userId
            )
          )
          .for("update");

      if (
        wallets.length === 0
      ) {
        throw new Error(
          "Portefeuille Coins introuvable."
        );
      }

      const wallet =
        wallets[0];

      /**
       * =====================================================
       * 6️⃣ CRÉDITER LES COINS
       * =====================================================
       */

      const balanceBefore =
        Number(wallet.balance);

      const balanceAfter =
        balanceBefore +
        coinPackage.coins;

      const totalPurchased =
        Number(
          wallet.totalPurchased
        ) +
        coinPackage.coins;

      await tx
        .update(userCoins)
        .set({
          balance:
            balanceAfter.toFixed(2),

          totalPurchased:
            totalPurchased.toFixed(2),

          updatedAt:
            new Date().toISOString(),
        })
        .where(
          eq(
            userCoins.userId,
            userId
          )
        );

      /**
       * =====================================================
       * 7️⃣ ENREGISTRER LA TRANSACTION COINS
       * =====================================================
       */

      const transactionResult =
        await tx
          .insert(
            coinTransactions
          )
          .values({
            userId,

            type:
              "purchase",

            amount:
              coinPackage.coins.toFixed(
                2
              ),

            balanceBefore:
              balanceBefore.toFixed(
                2
              ),

            balanceAfter:
              balanceAfter.toFixed(
                2
              ),

            referenceId:
              paymentReference,

            description:
              `Achat de ${coinPackage.coins} Coins`,
          })
          .returning();

      return {
        success: true,
        duplicate: false,

        package:
          coinPackage,

        paymentId:
          payment.id,

        paymentReference,

        balanceBefore,

        balanceAfter,

        coins:
          coinPackage.coins,

        transaction:
          transactionResult[0],
      };
    }
  );
}
