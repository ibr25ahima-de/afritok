import { eq } from "drizzle-orm";
import { db } from "./index";
import { users } from "../../drizzle/schema";

/* =====================
DISPLAY SETTINGS
===================== */

export async function getDisplaySettings(userId: number) {
  const user = (
    await db.select().from(users).where(eq(users.id, userId)).limit(1)
  )[0];

  if (!user) {
    throw new Error("User not found");
  }

  return {
    language: user.language,
    darkMode: user.darkMode,
    dataSaver: user.dataSaver,
    autoPlay: user.autoPlay,
    textSize: user.textSize,
    animations: user.animations,
  };
}

export async function updateDisplaySettings(
  userId: number,
  settings: {
    language: string;
    darkMode: string;
    dataSaver: boolean;
    autoPlay: string;
    textSize: string;
    animations: boolean;
  }
) {
  await db
    .update(users)
    .set({
      language: settings.language,
      darkMode: settings.darkMode,
      dataSaver: settings.dataSaver,
      autoPlay: settings.autoPlay,
      textSize: settings.textSize,
      animations: settings.animations,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  return { success: true };
}
