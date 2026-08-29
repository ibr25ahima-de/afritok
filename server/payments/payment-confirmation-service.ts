import { confirmPayment as settlePayment } from "./payment-service";

/**
 * =========================================================
 * 💳 AFRITOK — CONFIRMATION PRESTATAIRE
 * =========================================================
 *
 * Point d'entrée destiné au futur webhook Orange Money / MTN
 * Mobile Money / Wave ou autre prestataire.
 *
 * Les clés et l'API du fournisseur seront branchées ici.
 * Cette couche ne confirme jamais un paiement sur simple demande
 * du frontend : elle doit recevoir une preuve du prestataire.
 *
 * Une confirmation valide passe par payment-service puis par
 * payment-settlement-service, qui crédite le portefeuille réel
 * AfriTok de façon idempotente.
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
  return settlePayment({
    referenceId,
    providerReference,
    confirmedAmount: amount,
  });
}
