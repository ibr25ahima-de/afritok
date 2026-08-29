import { confirmPayment } from "./payment-service";

/**
 * Couche commune pour les webhooks des prestataires de paiement.
 *
 * Les adaptateurs Orange Money / MTN / Wave pourront appeler cette
 * fonction après avoir vérifié leur signature et normalisé leur réponse.
 * Les secrets restent exclusivement dans les variables d'environnement.
 */
export async function handleProviderPaymentConfirmation(params: {
  referenceId: string;
  providerReference: string;
  amount: number;
}) {
  return confirmPayment({
    referenceId: params.referenceId,
    providerReference: params.providerReference,
    confirmedAmount: params.amount,
  });
}
