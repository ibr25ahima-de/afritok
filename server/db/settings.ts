import { eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "../../drizzle/schema";
import { getUserById } from "./users";

export async function getDisplaySettings(userId: number) {
  const user = await getUserById(userId);

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
