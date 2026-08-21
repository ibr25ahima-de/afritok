import {
  router,
  protectedProcedure,
} from "../_core/trpc";

import { z } from "zod";
import { TRPCError } from "@trpc/server";

import {
  PAYMENT_OPERATORS,
  PAYMENT_PURPOSES,
} from "./payment-types";

import {
  COIN_PACKAGES,
} from "../coins/purchase-service";

import {
  createPaymentTransaction,
} from "./payment-service";

import {
  initiateProviderPayment,
} from "./payment-provider";

export const paymentRouter = router({

  /**
   * =========================================================
   * 💳 CRÉER UN PAIEMENT RÉEL
   * =========================================================
   *
   * Cette route est commune à tous les services AfriTok.
   *
   * wallet_recharge
   * coin_purchase
   * subscription
   * advertisement
   * service
   */

  createPayment:
    protectedProcedure

      .input(
        z.object({

          amount:
            z.number()
              .int()
              .positive(),

          currency:
            z.literal("XOF")
              .default("XOF"),

          operator:
            z.enum(
              PAYMENT_OPERATORS
            ),

          phone:
            z.string()
              .min(8),

          purpose:
            z.enum(
              PAYMENT_PURPOSES
            ),
        })
      )

      .mutation(
        async ({ ctx, input }) => {

          /**
           * =====================================================
           * 🪙 VÉRIFICATION ACHAT DE COINS
           * =====================================================
           */

          if (input.purpose === "coin_purchase") {
            const coinPackage =
              COIN_PACKAGES.find(
                (item) =>
                  item.price === input.amount
              );

            if (!coinPackage) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message:
                  "Montant de package Coins invalide.",
              });
            }
          }

          /**
           * Référence unique AfriTok.
           */

          const referenceId =
            `afritok_pay_${ctx.user.id}_${Date.now()}_${Math.random()
              .toString(36)
              .slice(2, 10)}`;


          /**
           * 1️⃣ Enregistrer le paiement
           * dans la base AfriTok.
           */

          const payment =
            await createPaymentTransaction({

              userId:
                ctx.user.id,

              amount:
                input.amount,

              currency:
                input.currency,

              operator:
                input.operator,

              phone:
                input.phone,

              purpose:
                input.purpose,

              referenceId,
            });


          /**
           * 2️⃣ Envoyer la demande
           * au fournisseur de paiement.
           */

          const providerResult =
            await initiateProviderPayment({

              referenceId,

              amount:
                input.amount,

              currency:
                input.currency,

              operator:
                input.operator,

              phone:
                input.phone,
            });


          return {

            success:
              providerResult.success,

            paymentId:
              payment.id,

            referenceId:
              payment.referenceId,

            status:
              providerResult.status,

            providerReference:
              providerResult.providerReference ??
              null,

            amount:
              input.amount,

            currency:
              input.currency,

            operator:
              input.operator,

            purpose:
              input.purpose,

            message:
              providerResult.message,
          };
        }
      ),
});
