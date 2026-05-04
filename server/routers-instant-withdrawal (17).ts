import { protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getUserEarnings, createWithdrawal, db } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

// Simulation de Stripe pour les tests internes
const stripe = {
  transfers: {
    create: async (params: any) => {
      console.log("[SIMULATION STRIPE] Transfert créé :", params);
      return { id: "tr_simulated_" + Date.now() };
    }
  }
};

export const instantWithdrawalRouter = router({
  request: protectedProcedure
    .input(z.object({
      amount: z.number().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });

      // 1. Vérifier le solde
      const earnings = await getUserEarnings(ctx.user.id);
      if (earnings.balance < input.amount) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Solde insuffisant",
        });
      }

      try {
        // 2. SIMULATION DE PAIEMENT (Interne)
        // Au lieu d'utiliser une vraie clé Stripe, on simule le succès
        console.log(`[TEST INTERNE] Retrait de ${input.amount} pour l'utilisateur ${ctx.user.id}`);
        
        const transferId = "tr_test_" + Math.random().toString(36).substring(7);

        // 3. Enregistrer le retrait en base de données
        await createWithdrawal(
          ctx.user.id,
          input.amount,
          "stripe_instant",
          "success", // On le marque directement comme réussi pour le test
          transferId
        );

        // 4. Message de succès personnalisé
        return { 
          success: true, 
          message: "Votre retrait est reçu",
          newBalance: earnings.balance - input.amount
        };

      } catch (error) {
        console.error("Withdrawal error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors du retrait",
        });
      }
    }),
});
