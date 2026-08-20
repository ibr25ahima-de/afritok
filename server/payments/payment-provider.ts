import {
  PaymentOperator,
} from "./payment-types";

/**
 * =========================================================
 * 💳 AFRITOK — PAYMENT PROVIDER
 * =========================================================
 *
 * Interface commune pour les prestataires de paiement.
 *
 * Pour l'instant :
 * - aucune clé API
 * - aucun appel externe
 * - aucun argent réel envoyé
 *
 * Les clés seront ajoutées uniquement à la fin.
 */

export type PaymentRequest = {
  referenceId: string;
  amount: number;
  currency: "XOF";
  operator: PaymentOperator;
  phone: string;
};

export type PaymentProviderResult = {
  success: boolean;
  providerReference?: string;
  status: "pending" | "success" | "failed";
  message: string;
};

export async function initiateProviderPayment(
  input: PaymentRequest
): Promise<PaymentProviderResult> {
  if (!input.referenceId) {
    throw new Error(
      "Référence de paiement manquante."
    );
  }

  if (
    !Number.isFinite(input.amount) ||
    input.amount <= 0
  ) {
    throw new Error(
      "Montant de paiement invalide."
    );
  }

  if (!input.phone) {
    throw new Error(
      "Numéro de téléphone manquant."
    );
  }

  /**
   * =======================================================
   * IMPORTANT
   * =======================================================
   *
   * Aucun paiement réel n'est envoyé ici pour le moment.
   *
   * Quand le prestataire sera choisi, cette fonction
   * contiendra l'appel API correspondant.
   *
   * Exemple futur :
   *
   * Orange Money
   * MTN Mobile Money
   * Moov Money
   * Wave
   *
   * Les clés seront uniquement placées dans les variables
   * d'environnement de Render.
   */

  return {
    success: false,
    status: "pending",
    message:
      "Prestataire de paiement non configuré.",
  };
}
