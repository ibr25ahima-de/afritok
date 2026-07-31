import { eq } from "drizzle-orm";
import { db } from "./index";
import { users } from "../../drizzle/schema";

/* =====================
PROFILE UPDATES
===================== */

export async function updateUserProfile(
  userId: number,
  data: {
    name: string;
    bio?: string;
    country?: string;
  }
) {
  await db
    .update(users)
    .set({
      name: data.name,
      bio: data.bio,
      country: data.country,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  return { success: true };
}

export async function updateUserAvatar(
  userId: number,
  avatarUrl: string
) {
  await db
    .update(users)
    .set({
      avatarUrl,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  return {
    success: true,
    avatarUrl,
  };
}
