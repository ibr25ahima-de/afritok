import { eq } from "drizzle-orm";
import { db } from "../db";
import { withdrawals } from "../../drizzle/schema";
import { getUserById } from "./users";

export async function getUserWithdrawals(userId: number) {
  return db.select().from(withdrawals).where(eq(withdrawals.userId, userId));
}

export async function createWithdrawalRecord(
  userId: number,
  amount: number,
  paymentMethod: string
) {
  const user = await getUserById(userId);
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
