import express, { Request, Response } from "express";
import { confirmPayment, failPayment } from "./payment-service";

const router = express.Router();

/**
 * Webhook commun des prestataires de paiement.
 *
 * Le prestataire doit fournir une référence AfriTok, sa référence
 * fournisseur, le montant réellement confirmé et le statut.
 *
 * Le settlement est effectué UNE SEULE FOIS par confirmPayment(),
 * qui crédite le portefeuille réel AfriTok de façon idempotente.
 */
router.post("/webhook", async (req: Request, res: Response) => {
  try {
    const { referenceId, providerReference, amount, status } = req.body ?? {};

    if (typeof referenceId !== "string" || !referenceId.trim()) {
      return res.status(400).json({ success: false, error: "referenceId manquant." });
    }

    if (status === "failed") {
      await failPayment({ referenceId: referenceId.trim() });
      return res.json({ success: true, status: "failed" });
    }

    if (status !== "success") {
      return res.status(400).json({ success: false, error: "Statut de paiement invalide." });
    }

    if (typeof providerReference !== "string" || !providerReference.trim()) {
      return res.status(400).json({ success: false, error: "providerReference manquant." });
    }

    if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ success: false, error: "Montant confirmé invalide." });
    }

    const result = await confirmPayment({
      referenceId: referenceId.trim(),
      providerReference: providerReference.trim(),
      confirmedAmount: amount,
    });

    return res.json({
      success: true,
      status: "success",
      paymentId: result.payment.id,
      referenceId: result.payment.referenceId,
      providerReference: result.payment.providerReference,
      confirmedAmount: Number(result.payment.confirmedAmount),
      settlement: result,
    });
  } catch (error) {
    console.error("[Payment Webhook] Error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Erreur webhook paiement.",
    });
  }
});

export default router;
