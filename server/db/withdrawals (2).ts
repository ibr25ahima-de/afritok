import { eq } from "drizzle-orm";
import { db } from "./index";
import { withdrawals, users } from "../../drizzle/schema";

/* =====================
WITHDRAWALS
===================== */

export async function getUserWithdrawals(userId: number) {
  return db.select().from(withdrawals).where(eq(withdrawals.userId, userId));
}

export async function createWithdrawalRecord(
  userId: number,
  amount: number,
  paymentMethod: string
) {
  const user = (
    await db.select().from(users).where(eq(users.id, userId)).limit(1)
  )[0];
  if (!user) throw new Error("User not found");

  const balance = parseFloat(user.totalEarnings?.toString() || "0");

  if (amount > balance) throw new Error("Insufficient balance");

  await db.insert(withdrawals).values({
    userId,
    amount: amount.toFixed(2),
    paymentMethod,
    phone: user.phone,
    status: "completed",
  });
}
