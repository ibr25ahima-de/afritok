import { PaymentWebhookData } from "./payment-types";

/**
 * =========================================================
 * 💳 AFRITOK — RÉCEPTION DES CONFIRMATIONS DE PAIEMENT
 * =========================================================
 *
 * Le prestataire de paiement appellera cette fonction
 * lorsqu'un paiement change d'état.
 *
 * Exemple :
 *
 * pending → success
 * pending → failed
 * pending → cancelled
 *
 * ⚠️ Pour le moment, cette fonction ne crédite encore
 * aucun portefeuille.
 *
 * Nous allons construire cette partie après.
 */

export async function handlePaymentWebhook(
  data: PaymentWebhookData
) {
  if (!data.referenceId) {
    throw new Error(
      "Référence de paiement manquante."
    );
  }

  if (!Number.isFinite(data.amount) || data.amount <= 0) {
    throw new Error(
      "Montant de paiement invalide."
    );
  }

  if (data.currency !== "XOF") {
    throw new Error(
      "Devise de paiement non supportée."
    );
  }

  switch (data.status) {
    case "pending":
      return {
        success: true,
        status: "pending",
        referenceId: data.referenceId,
      };

    case "success":
      /**
       * Le crédit réel sera ajouté ici.
       */
      return {
        success: true,
        status: "success",
        referenceId: data.referenceId,
      };

    case "failed":
      return {
        success: true,
        status: "failed",
        referenceId: data.referenceId,
      };

    case "cancelled":
      return {
        success: true,
        status: "cancelled",
        referenceId: data.referenceId,
      };

    default:
      throw new Error(
        "Statut de paiement inconnu."
      );
  }
}
