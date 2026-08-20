import express, { Request, Response } from "express";
import {
  confirmPayment,
  failPayment,
} from "./payment-service";
import { settleConfirmedPayment } from "./payment-settlement";

const router = express.Router();

/**
 * =========================================================
 * 💳 AFRITOK — WEBHOOK PAIEMENT
 * =========================================================
 *
 * Flux :
 *
 * Prestataire
 *    ↓
 * Webhook
 *    ↓
 * Confirmation du paiement
 *    ↓
 * Settlement
 *    ↓
 * Action AfriTok
 */

router.post(
  "/webhook",
  async (req: Request, res: Response) => {
    try {
      const {
        referenceId,
        providerReference,
        amount,
        status,
      } = req.body;

      if (!referenceId) {
        return res.status(400).json({
          success: false,
          error: "referenceId manquant.",
        });
      }

      /**
       * =====================================================
       * ❌ PAIEMENT ÉCHOUÉ
       * =====================================================
       */

      if (status === "failed") {
        await failPayment({
          referenceId,
        });

        return res.json({
          success: true,
          status: "failed",
        });
      }

      /**
       * =====================================================
       * ✅ PAIEMENT CONFIRMÉ
       * =====================================================
       */

      if (status === "success") {
        if (!providerReference) {
          return res.status(400).json({
            success: false,
            error:
              "providerReference manquant.",
          });
        }

        if (
          typeof amount !== "number" ||
          !Number.isFinite(amount) ||
          amount <= 0
        ) {
          return res.status(400).json({
            success: false,
            error:
              "Montant confirmé invalide.",
          });
        }

        /**
         * 1️⃣ Marquer le paiement comme confirmé.
         */

        const payment =
          await confirmPayment({
            referenceId,
            providerReference,
            confirmedAmount: amount,
          });

        /**
         * 2️⃣ Faire entrer le paiement
         * dans le système AfriTok.
         */

        const settlement =
          await settleConfirmedPayment(
            payment.id
          );

        return res.json({
          success: true,
          status: "success",

          paymentId:
            payment.id,

          referenceId:
            payment.referenceId,

          providerReference:
            payment.providerReference,

          confirmedAmount:
            Number(
              payment.confirmedAmount
            ),

          settlement,
        });
      }

      return res.status(400).json({
        success: false,
        error:
          "Statut de paiement invalide.",
      });

    } catch (error) {
      console.error(
        "[Payment Webhook] Error:",
        error
      );

      return res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erreur webhook paiement.",
      });
    }
  }
);

export default router;
