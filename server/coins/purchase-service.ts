import { db } from "../db";
import { userCoins, coinTransactions } from "../../drizzle/schema-coins";
import { eq } from "drizzle-orm";

export const COIN_PACKAGES = [
  {
    id: "coins_100",
    coins: 100,
    price: 100,
    currency: "XOF",
    name: "100 Coins",
  },
  {
    id: "coins_500",
    coins: 500,
    price: 500,
    currency: "XOF",
    name: "500 Coins",
  },
  {
    id: "coins_1000",
    coins: 1000,
    price: 1000,
    currency: "XOF",
    name: "1 000 Coins",
  },
  {
    id: "coins_5000",
    coins: 5000,
    price: 5000,
    currency: "XOF",
    name: "5 000 Coins",
  },
  {
    id: "coins_10000",
    coins: 10000,
    price: 10000,
    currency: "XOF",
    name: "10 000 Coins",
  },
] as const;

export function getCoinPackages() {
  return COIN_PACKAGES;
}

export async function purchaseCoins({
  userId,
  packageId,
  paymentReference,
}: {
  userId: number;
  packageId: string;
  paymentReference: string;
}) {
  if (!userId) {
    throw new Error("Utilisateur invalide.");
  }

  if (!paymentReference || paymentReference.length < 5) {
    throw new Error("Référence de paiement invalide.");
  }

  const coinPackage = COIN_PACKAGES.find(
    (item) => item.id === packageId
  );

  if (!coinPackage) {
    throw new Error("Package Coins introuvable.");
  }

  return await db.transaction(async (tx) => {
    const existingTransaction = await tx
      .select()
      .from(coinTransactions)
      .where(
        eq(
          coinTransactions.referenceId,
          paymentReference
        )
      )
      .limit(1);

    if (existingTransaction.length > 0) {
      return {
        success: true,
        duplicate: true,
        transaction: existingTransaction[0],
      };
    }

    await tx
      .insert(userCoins)
      .values({
        userId,
        balance: "0",
        totalPurchased: "0",
        totalSpent: "0",
      })
      .onConflictDoNothing({
        target: userCoins.userId,
      });

    const wallets = await tx
      .select()
      .from(userCoins)
      .where(eq(userCoins.userId, userId))
      .for("update");

    if (wallets.length === 0) {
      throw new Error(
        "Portefeuille Coins introuvable."
      );
    }

    const wallet = wallets[0];

    const balanceBefore =
      Number(wallet.balance);

    const balanceAfter =
      balanceBefore + coinPackage.coins;

    const totalPurchased =
      Number(wallet.totalPurchased) +
      coinPackage.coins;

    await tx
      .update(userCoins)
      .set({
        balance: balanceAfter.toFixed(2),
        totalPurchased: totalPurchased.toFixed(2),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(userCoins.userId, userId));

    const transactionResult =
      await tx
        .insert(coinTransactions)
        .values({
          userId,
          type: "purchase",
          amount: coinPackage.coins.toFixed(2),
          balanceBefore: balanceBefore.toFixed(2),
          balanceAfter: balanceAfter.toFixed(2),
          referenceId: paymentReference,
          description:
            `Achat de ${coinPackage.coins} Coins`,
        })
        .returning();

    return {
      success: true,
      duplicate: false,
      package: coinPackage,
      balanceBefore,
      balanceAfter,
      coins: coinPackage.coins,
      transaction: transactionResult[0],
    };
  });
}