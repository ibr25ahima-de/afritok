import express, { Request, Response } from "express";
import { db } from "../db";
import { payments } from "../../drizzle/schema-payments";
import { eq } from "drizzle-orm";
import { confirmPayment } from "./payment-service";
import { settleConfirmedPayment } from "./payment-settlement";

const router = express.Router();

/**
 * TEST INTERNE DU CIRCUIT DE PAIEMENT
 *
 * ⚠️ Aucun argent réel.
 * ⚠️ Aucun appel Orange / MTN / Moov / Wave.
 *
 * Ce test prend un paiement pending existant
 * et simule la confirmation du prestataire.
 */

router.post(
  "/confirm",
  async (req: Request, res: Response) => {
    try {
      const { referenceId, amount } = req.body;

      if (!referenceId) {
        return res.status(400).json({
          success: false,
          error: "referenceId manquant.",
        });
      }

      if (
        typeof amount !== "number" ||
        !Number.isFinite(amount) ||
        amount <= 0
      ) {
        return res.status(400).json({
          success: false,
          error: "Montant invalide.",
        });
      }

      const result = await db
        .select()
        .from(payments)
        .where(eq(payments.referenceId, referenceId))
        .limit(1);

      if (result.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Paiement introuvable.",
        });
      }

      const payment = await confirmPayment({
        referenceId,
        providerReference: `TEST_PROVIDER_${Date.now()}`,
        confirmedAmount: amount,
      });

      const settlement =
        await settleConfirmedPayment(payment.id);

      return res.json({
        success: true,
        test: true,
        paymentId: payment.id,
        referenceId: payment.referenceId,
        confirmedAmount: Number(
          payment.confirmedAmount
        ),
        settlement,
      });
    } catch (error) {
      console.error(
        "[Payment Test] Error:",
        error
      );

      return res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erreur test paiement.",
      });
    }
  }
);

export default router;
