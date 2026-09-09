import express, { Request, Response } from "express";
import crypto from "node:crypto";
import { confirmPayment, failPayment } from "./payment-service";
import { ENV } from "../_core/env";

const router = express.Router();

const MAX_REFERENCE_LENGTH = 150;
const MAX_PROVIDER_REFERENCE_LENGTH = 150;
const WEBHOOK_SECRET_MIN_LENGTH = 32;

function hasValidWebhookSecret(req: Request): boolean {
  const configuredSecret = ENV.paymentWebhookSecret;
  const suppliedSecret = req.get("x-afritok-webhook-secret") ?? "";

  // The generic webhook is intentionally unavailable until a server-side
  // webhook secret is configured. No payment provider key is required for this.
  if (!configuredSecret || configuredSecret.length < WEBHOOK_SECRET_MIN_LENGTH) {
    return false;
  }
  if (!suppliedSecret || suppliedSecret.length !== configuredSecret.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(suppliedSecret, "utf8"),
    Buffer.from(configuredSecret, "utf8"),
  );
}

/**
 * Generic payment-provider webhook.
 *
 * This endpoint is fail-closed: it cannot settle or fail a payment unless a
 * server-side PAYMENT_WEBHOOK_SECRET is configured and supplied by the caller.
 * Provider-specific signed webhooks should use their native signature scheme
 * when a real payment provider is integrated.
 */
router.post("/webhook", async (req: Request, res: Response) => {
  if (!hasValidWebhookSecret(req)) {
    return res.status(503).json({
      success: false,
      error: "Webhook de paiement indisponible.",
    });
  }

  try {
    const body = req.body ?? {};
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return res.status(400).json({ success: false, error: "Corps de requête invalide." });
    }

    const { referenceId, providerReference, amount, status } = body as Record<string, unknown>;

    if (
      typeof referenceId !== "string" ||
      !referenceId.trim() ||
      referenceId.trim().length > MAX_REFERENCE_LENGTH
    ) {
      return res.status(400).json({ success: false, error: "Référence de paiement invalide." });
    }

    const normalizedReferenceId = referenceId.trim();

    if (status === "failed") {
      await failPayment({ referenceId: normalizedReferenceId });
      return res.json({ success: true, status: "failed" });
    }

    if (status !== "success") {
      return res.status(400).json({ success: false, error: "Statut de paiement invalide." });
    }

    if (
      typeof providerReference !== "string" ||
      !providerReference.trim() ||
      providerReference.trim().length > MAX_PROVIDER_REFERENCE_LENGTH
    ) {
      return res.status(400).json({ success: false, error: "Référence fournisseur invalide." });
    }

    if (
      typeof amount !== "number" ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      amount > 1_000_000_000
    ) {
      return res.status(400).json({ success: false, error: "Montant confirmé invalide." });
    }

    const result = await confirmPayment({
      referenceId: normalizedReferenceId,
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
      error: "Erreur lors du traitement du webhook de paiement.",
    });
  }
});

export default router;
