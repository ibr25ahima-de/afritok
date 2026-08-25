import { db } from "../db";
import { payments } from "../../drizzle/schema-payments";
import { userWallets, walletTransactions } from "../../drizzle/schema-wallet";
import {
  platformWallet,
  platformTransactions,
} from "../../drizzle/schema-platform-finance";
import { eq } from "drizzle-orm";
import { purchaseCoins } from "../coins/purchase-service";
import { confirmAdvertisingPayment } from "../advertising/advertising-payment-service";

/**
 * =========================================================
 * 💰 AFRITOK — PAYMENT SETTLEMENT
 * =========================================================
 *
 * Cette fonction intervient UNIQUEMENT après confirmation
 * réelle du paiement par le prestataire.
 *
 * Flux :
 *
 * Prestataire
 *      ↓
 * Paiement confirmé
 *      ↓
 * payments.status = success
 *      ↓
 * Settlement
 *      ↓
 * Action correspondant au purpose
 *
 * IMPORTANT :
 * Aucun argent n'est crédité ici tant que le paiement
 * n'est pas confirmé.
 */

export async function settleConfirmedPayment(
  paymentId: number
) {
  return await db.transaction(async (tx) => {
    /**
     * 1. Récupérer le paiement
     */
    const result = await tx
      .select()
      .from(payments)
      .where(eq(payments.id, paymentId))
      .limit(1);

    if (result.length === 0) {
      throw new Error(
        "Paiement introuvable."
      );
    }

    const payment = result[0];

    /**
     * 2. Sécurité :
     * seul un paiement réellement confirmé
     * peut être traité.
     */
    if (payment.status !== "success") {
      throw new Error(
        "Le paiement n'est pas confirmé."
      );
    }

    if (
      Number(payment.confirmedAmount) <= 0
    ) {
      throw new Error(
        "Montant confirmé invalide."
      );
    }

    /**
     * 3. Éviter de traiter deux fois
     * le même paiement.
     *
     * Pour l'instant, le paiement est considéré
     * comme traité si une transaction wallet
     * portant cette référence existe déjà.
     */
    const existingTransaction =
      await tx
        .select()
        .from(walletTransactions)
        .where(
          eq(
            walletTransactions.referenceId,
            payment.referenceId
          )
        )
        .limit(1);

    if (existingTransaction.length > 0) {
      return {
        success: true,
        duplicate: true,
        payment,
        transaction:
          existingTransaction[0],
      };
    }

    /**
     * =====================================================
     * 💰 ENREGISTRER L'ARGENT RÉEL AFRITOK
     * =====================================================
     *
     * Tout paiement confirmé devient une entrée
     * dans le portefeuille réel de la plateforme.
     *
     * Exemple :
     * 1 000 XOF payés pour acheter des Coins
     * → +1 000 XOF dans platformWallet.balance
     *
     * Les Coins restent séparés :
     * → Coins dans le portefeuille utilisateur
     * → XOF réel dans le portefeuille plateforme
     */

    /**
     * Vérifier si le paiement a déjà été enregistré
     * dans les finances de la plateforme.
     */
    const existingPlatformTransaction =
      await tx
        .select()
        .from(platformTransactions)
        .where(
          eq(
            platformTransactions.externalId,
            payment.referenceId
          )
        )
        .limit(1);

    if (existingPlatformTransaction.length === 0) {

      /**
       * Récupérer le portefeuille réel AfriTok.
       */
      let platformWalletResult =
        await tx
          .select()
          .from(platformWallet)
          .limit(1);

      /**
       * Créer le portefeuille s'il n'existe pas.
       */
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

        platformWalletResult =
          await tx
            .select()
            .from(platformWallet)
            .limit(1);
      }

      const platform =
        platformWalletResult[0];

      if (!platform) {
        throw new Error(
          "Portefeuille réel AfriTok introuvable."
        );
      }

      const amount =
        Number(payment.confirmedAmount);

      const balanceBefore =
        Number(platform.balance);

      const balanceAfter =
        balanceBefore + amount;

      const totalRevenue =
        Number(platform.totalRevenue) + amount;

      /**
       * Mettre à jour le solde réel AfriTok.
       */
      await tx
        .update(platformWallet)
        .set({
          balance:
            balanceAfter.toFixed(4),

          totalRevenue:
            totalRevenue.toFixed(4),

          updatedAt:
            new Date().toISOString(),
        })
        .where(
          eq(
            platformWallet.id,
            platform.id
          )
        );

      /**
       * Enregistrer la transaction réelle.
       */
      await tx
        .insert(platformTransactions)
        .values({
          userId:
            payment.userId,

          amount:
            amount.toFixed(4),

          currency:
            payment.currency || "XOF",

          direction:
            "in",

          source:
            payment.purpose,

          status:
            "completed",

          paymentProvider:
            payment.operator,

          paymentReference:
            payment.providerReference,

          externalId:
            payment.referenceId,

          description:
            `Paiement réel confirmé — ${payment.purpose}`,
        });

      console.log(
        `💰 [Platform Finance] +${amount} XOF | ` +
        `Solde réel AfriTok: ${balanceAfter} XOF`
      );
    }

    /**
     * =====================================================
     * 4. TRAITEMENT SELON LE SERVICE
     * =====================================================
     */

    switch (payment.purpose) {

      /**
       * -----------------------------------------------------
       * 💰 RECHARGE DU PORTEFEUILLE XOF
       * -----------------------------------------------------
       */
      case "wallet_recharge": {
        const wallets = await tx
          .select()
          .from(userWallets)
          .where(
            eq(
              userWallets.userId,
              payment.userId
            )
          )
          .limit(1);

        if (wallets.length === 0) {
          await tx
            .insert(userWallets)
            .values({
              userId: payment.userId,
              balance: "0",
              totalDeposited: "0",
              totalUsedForCoins: "0",
            });
        }

        const walletResult =
          await tx
            .select()
            .from(userWallets)
            .where(
              eq(
                userWallets.userId,
                payment.userId
              )
            )
            .limit(1);

        if (walletResult.length === 0) {
          throw new Error(
            "Portefeuille XOF introuvable."
          );
        }

        const wallet =
          walletResult[0];

        const balanceBefore =
          Number(wallet.balance);

        const amount =
          Number(payment.confirmedAmount);

        const balanceAfter =
          balanceBefore + amount;

        await tx
          .update(userWallets)
          .set({
            balance:
              balanceAfter.toFixed(2),

            totalDeposited:
              (
                Number(wallet.totalDeposited) +
                amount
              ).toFixed(2),

            updatedAt:
              new Date().toISOString(),
          })
          .where(
            eq(
              userWallets.userId,
              payment.userId
            )
          );

        const transaction =
          await tx
            .insert(walletTransactions)
            .values({
              userId:
                payment.userId,

              type:
                "deposit",

              amount:
                amount.toFixed(2),

              balanceBefore:
                balanceBefore.toFixed(2),

              balanceAfter:
                balanceAfter.toFixed(2),

              referenceId:
                payment.referenceId,

              paymentMethod:
                payment.operator,

              status:
                "success",

              description:
                `Paiement confirmé de ${amount.toLocaleString(
                  "fr-FR"
                )} XOF`,
            })
            .returning();

        return {
          success: true,
          duplicate: false,
          payment,
          transaction:
            transaction[0],
        };
      }

      /**
       * -----------------------------------------------------
       * 🪙 ACHAT DE COINS
       * -----------------------------------------------------
       *
       * Cette partie sera branchée sur le système Coins
       * après vérification de son flux de paiement.
       */
      case "coin_purchase": {
        if (!payment.productId) {
          throw new Error(
            "Produit Coins manquant sur le paiement confirmé."
          );
        }

        const result = await purchaseCoins({
          userId: payment.userId,
          packageId: payment.productId,
          paymentReference: payment.referenceId,
        });

        return {
          success: true,
          duplicate: result.duplicate,
          payment,
          transaction: result.transaction,
          coins: result.coins ?? 0,
          balance: result.balanceAfter ?? null,
          message: result.duplicate
            ? "Achat de Coins déjà traité."
            : "Paiement confirmé. Coins crédités.",
        };
      }

      /**
       * -----------------------------------------------------
       * 📺 ABONNEMENT
       * -----------------------------------------------------
       */
      case "subscription": {
        return {
          success: true,
          duplicate: false,
          payment,
          nextAction:
            "subscription",
          message:
            "Paiement confirmé. Traitement abonnement à connecter.",
        };
      }

      /**
       * -----------------------------------------------------
       * 📢 PUBLICITÉ
       * -----------------------------------------------------
       */
      case "advertisement": {
        const result = await confirmAdvertisingPayment({
          paymentReference: payment.referenceId,
          confirmedAmount: Number(payment.confirmedAmount),
        });

        return {
          success: true,
          duplicate: result.duplicate,
          payment,
          campaign: result.campaign,
          message: result.duplicate
            ? "Campagne publicitaire déjà activée."
            : "Paiement confirmé. Campagne publicitaire activée.",
        };
      }

      /**
       * -----------------------------------------------------
       * 🛠️ SERVICE
       * -----------------------------------------------------
       */
      case "service": {
        return {
          success: true,
          duplicate: false,
          payment,
          nextAction:
            "service",
          message:
            "Paiement confirmé. Traitement service à connecter.",
        };
      }

      default:
        throw new Error(
          `Purpose de paiement non supporté : ${payment.purpose}`
        );
    }
  });
}
