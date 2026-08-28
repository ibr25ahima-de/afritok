import { eq } from "drizzle-orm";
import { db } from "./index";
import { users } from "../../drizzle/schema";

/* =====================
DISPLAY SETTINGS
===================== */

export async function getDisplaySettings(userId: number) {
  const user = (await db.select().from(users).where(eq(users.id, userId)).limit(1))[0];
  if (!user) throw new Error("User not found");
  return {
    language: user.language,
    darkMode: user.darkMode,
    dataSaver: user.dataSaver,
    autoPlay: user.autoPlay,
    textSize: user.textSize,
    animations: user.animations,
  };
}

export async function updateDisplaySettings(userId: number, settings: {
  language: string;
  darkMode: string;
  dataSaver: boolean;
  autoPlay: string;
  textSize: string;
  animations: boolean;
}) {
  await db.update(users).set({
    language: settings.language,
    darkMode: settings.darkMode,
    dataSaver: settings.dataSaver,
    autoPlay: settings.autoPlay,
    textSize: settings.textSize,
    animations: settings.animations,
    updatedAt: new Date(),
  }).where(eq(users.id, userId));
  return { success: true };
}

/* =====================
PRIVACY SETTINGS
===================== */

export async function getPrivacySettings(userId: number) {
  const user = (await db.select({
    profilePublic: users.profilePublic,
    allowMessages: users.allowMessages,
    allowComments: users.allowComments,
    showFollowers: users.showFollowers,
    showFollowing: users.showFollowing,
  }).from(users).where(eq(users.id, userId)).limit(1))[0];

  if (!user) throw new Error("User not found");
  return user;
}

export async function updatePrivacySettings(userId: number, settings: {
  profilePublic?: boolean;
  allowMessages?: boolean;
  allowComments?: boolean;
  showFollowers?: boolean;
  showFollowing?: boolean;
}) {
  const values: Partial<typeof users.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (settings.profilePublic !== undefined) values.profilePublic = settings.profilePublic;
  if (settings.allowMessages !== undefined) values.allowMessages = settings.allowMessages;
  if (settings.allowComments !== undefined) values.allowComments = settings.allowComments;
  if (settings.showFollowers !== undefined) values.showFollowers = settings.showFollowers;
  if (settings.showFollowing !== undefined) values.showFollowing = settings.showFollowing;

  await db.update(users).set(values).where(eq(users.id, userId));
  return { success: true };
}
