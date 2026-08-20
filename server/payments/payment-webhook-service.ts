import { confirmPayment } from "./payment-confirmation-service";

/**
 * =========================================================
 * 💳 AFRITOK — WEBHOOK CENTRAL
 * =========================================================
 *
 * Cette fonction recevra plus tard les notifications
 * des différents prestataires de paiement.
 *
 * IMPORTANT :
 *
 * Le webhook ne doit JAMAIS être considéré comme une
 * confirmation simplement parce qu'une requête arrive.
 *
 * Le prestataire devra fournir les informations du paiement.
 *
 * Pour l'instant, cette fonction prépare uniquement
 * l'architecture.
 */

export type PaymentWebhookPayload = {
  referenceId: string;

  providerReference: string;

  amount: number;

  status: "success" | "failed";
};

export async function handlePaymentWebhook(
  payload: PaymentWebhookPayload
) {
  if (!payload.referenceId) {
    throw new Error(
      "Référence AfriTok manquante."
    );
  }

  if (!payload.providerReference) {
    throw new Error(
      "Référence prestataire manquante."
    );
  }

  if (
    !Number.isFinite(payload.amount) ||
    payload.amount <= 0
  ) {
    throw new Error(
      "Montant invalide."
    );
  }

  /**
   * Paiement échoué.
   *
   * La transaction pourra être marquée failed
   * lorsque nous connecterons le routeur webhook.
   */
  if (payload.status === "failed") {
    return {
      success: false,
      status: "failed",
      referenceId:
        payload.referenceId,
    };
  }

  /**
   * Paiement réussi.
   *
   * On passe par le service central de confirmation.
   */
  const result =
    await confirmPayment({
      referenceId:
        payload.referenceId,

      providerReference:
        payload.providerReference,

      amount:
        payload.amount,
    });

  return {
    success: true,

    duplicate:
      result.duplicate,

    status:
      "success",

    payment:
      result.payment,
  };
}

