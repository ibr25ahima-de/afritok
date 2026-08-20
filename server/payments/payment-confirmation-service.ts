import { db } from "../db";
import { payments } from "../../drizzle/schema-payments";
import { eq } from "drizzle-orm";

/**
 * =========================================================
 * 💳 AFRITOK — CONFIRMATION D'UN PAIEMENT
 * =========================================================
 *
 * Cette fonction sera appelée par le webhook du prestataire.
 *
 * IMPORTANT :
 *
 * Le prestataire doit confirmer :
 *
 * - la référence
 * - le montant
 * - la devise
 * - le statut
 *
 * AfriTok ne doit jamais considérer un paiement comme
 * réussi simplement parce que le téléphone a demandé
 * un paiement.
 */

export async function confirmPayment({
  referenceId,
  providerReference,
  amount,
}: {
  referenceId: string;
  providerReference: string;
  amount: number;
}) {
  if (!referenceId) {
    throw new Error(
      "Référence AfriTok manquante."
    );
  }

  if (!providerReference) {
    throw new Error(
      "Référence du prestataire manquante."
    );
  }

  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    throw new Error(
      "Montant confirmé invalide."
    );
  }

  return await db.transaction(
    async (tx) => {

      const result = await tx
        .select()
        .from(payments)
        .where(
          eq(
            payments.referenceId,
            referenceId
          )
        )
        .limit(1);

      if (result.length === 0) {
        throw new Error(
          "Paiement AfriTok introuvable."
        );
      }

      const payment = result[0];

      /**
       * Paiement déjà confirmé.
       *
       * On ne doit jamais le créditer deux fois.
       */
      if (payment.status === "success") {
        return {
          success: true,
          duplicate: true,
          payment,
        };
      }

      /**
       * Vérification du montant.
       */
      const expectedAmount =
        Number(payment.amount);

      if (
        Math.abs(
          expectedAmount - amount
        ) > 0.001
      ) {
        throw new Error(
          "Le montant confirmé ne correspond pas au montant demandé."
        );
      }

      /**
       * Passage à SUCCESS.
       */
      const updated =
        await tx
          .update(payments)
          .set({
            confirmedAmount:
              amount.toFixed(2),

            providerReference,

            status:
              "success",

            confirmedAt:
              new Date().toISOString(),

            updatedAt:
              new Date().toISOString(),
          })
          .where(
            eq(
              payments.id,
              payment.id
            )
          )
          .returning();

      return {
        success: true,
        duplicate: false,
        payment: updated[0],
      };
    }
  );
}
