import {
  router,
  protectedProcedure,
} from "../_core/trpc";

import { z } from "zod";

import {
  PAYMENT_OPERATORS,
  PAYMENT_PURPOSES,
} from "./payment-types";

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
