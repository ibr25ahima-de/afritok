import { db } from "../db";
import { payments } from "../../drizzle/schema-payments";
import { userWallets, walletTransactions } from "../../drizzle/schema-wallet";
import { eq } from "drizzle-orm";
import { purchaseCoins } from "../coins/purchase-service";

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
        const result = await purchaseCoins({
          userId: payment.userId,
          packageId: `coins_${Number(
            payment.confirmedAmount
          )}`,
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
        return {
          success: true,
          duplicate: false,
          payment,
          nextAction:
            "advertisement",
          message:
            "Paiement confirmé. Traitement publicité à connecter.",
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
