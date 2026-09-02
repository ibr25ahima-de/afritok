import { PaymentOperator } from "./payment-types";
import {
  getSandboxProviderReference,
  isPremiumSandboxEnabled,
} from "./premium-sandbox";

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

/**
 * Payment gateway boundary.
 *
 * Production providers are intentionally NOT called until their credentials
 * and provider-specific endpoints are configured. This keeps the Premium
 * system deployable without exposing secrets in source code.
 *
 * Explicit sandbox mode is available for end-to-end Premium testing without
 * real money. It is disabled by default and must never be enabled in a real
 * production payment environment.
 */
export async function initiateProviderPayment(
  input: PaymentRequest
): Promise<PaymentProviderResult> {
  if (!input.referenceId) {
    throw new Error("Référence de paiement manquante.");
  }

  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error("Montant de paiement invalide.");
  }

  if (!input.phone) {
    throw new Error("Numéro de téléphone manquant.");
  }

  if (isPremiumSandboxEnabled()) {
    return {
      success: true,
      status: "success",
      providerReference: getSandboxProviderReference(input.referenceId),
      message: "Paiement Premium simulé avec succès (sandbox, aucun argent réel).",
    };
  }

  return {
    success: false,
    status: "pending",
    message:
      "Prestataire de paiement non configuré. Les clés et l'API du prestataire seront ajoutées séparément.",
  };
}
