import { eq, and, gt } from "drizzle-orm";
import { db } from "./index";
import { otps, OTP } from "../../drizzle/schema";

/* =====================
OTP
===================== */

export async function createOTP(phone: string, code: string) {
  await db.insert(otps).values({
    phone,
    code,
    expiresAt: new Date(Date.now() + 10 * 60000),
    attempts: 0,
  });
}

export async function getValidOTP(phone: string, code: string): Promise<OTP | undefined> {
  return (
    await db
      .select()
      .from(otps)
      .where(
        and(
          eq(otps.phone, phone),
          eq(otps.code, code),
          gt(otps.expiresAt, new Date())
        )
      )
      .limit(1)
  )[0];
}

export async function deleteOTP(id: number) {
  await db.delete(otps).where(eq(otps.id, id));
}
