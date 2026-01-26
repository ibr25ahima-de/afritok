import { eq, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { users, videos, likes, comments, followers, earnings, withdrawals } from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;

// Connexion à la base de données
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Impossible de se connecter:", error);
      _db = null;
    }
  }
  return _db;
}

// ======================
// AUTHENTIFICATION
// ======================

/**
 * Créer ou mettre à jour un utilisateur par téléphone
 * Simple et efficace pour l'Afrique
 */
export async function upsertUser(user: {
  phone: string;
  name?: string;
  email?: string;
  loginMethod: string;
  lastSignedIn: Date;
}) {
  if (!user.phone) {
    throw new Error("Le numéro de téléphone est obligatoire");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Impossible de mettre à jour l'utilisateur: base de données indisponible");
    return;
  }

  try {
    const existing = await getUserByPhone(user.phone);

    if (existing) {
      // Mettre à jour l'utilisateur existant
      await db.update(users)
        .set({
          lastSignedIn: user.lastSignedIn,
          loginMethod: user.loginMethod,
          ...(user.name && { name: user.name }),
          ...(user.email && { email: user.email }),
        })
        .where(eq(users.phone, user.phone));
      
      return existing;
    } else {
      // Créer un nouvel utilisateur
      await db.insert(users).values({
        phone: user.phone,
        name: user.name || null,
        email: user.email || null,
        loginMethod: user.loginMethod,
        lastSignedIn: user.lastSignedIn,
        role: "user",
      });

      return getUserByPhone(user.phone);
    }
  } catch (error) {
    console.error("[Database] Erreur lors de la mise à jour de l'utilisateur:", error);
    throw error;
  }
}

/**
 * Obtenir un utilisateur par numéro de téléphone
 * Simple et efficace
 */
export async function getUserByPhone(phone: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Impossible de récupérer l'utilisateur: base de données indisponible");
    return undefined;
  }

  try {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.phone, phone))
      .limit(1);

    return result.length > 0 ? result[0] : undefined;
  } catch (error) {
    console.error("[Database] Erreur lors de la récupération de l'utilisateur:", error);
    return undefined;
  }
}

/**
 * Obtenir un utilisateur par ID
 */
export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  try {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    return result.length > 0 ? result[0] : undefined;
  } catch (error) {
    console.error("[Database] Erreur lors de la récupération de l'utilisateur par ID:", error);
    return undefined;
  }
}

// ======================
// VIDÉOS
// ======================

export async function getUserVideos(userId: number) {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db
      .select()
      .from(videos)
      .where(eq(videos.userId, userId))
      .orderBy((v) => v.createdAt);
  } catch (error) {
    console.error("[Database] Erreur lors de la récupération des vidéos:", error);
    return [];
  }
}

export async function getVideoById(videoId: number) {
  const db = await getDb();
  if (!db) return undefined;
  try {
    const result = await db
      .select()
      .from(videos)
      .where(eq(videos.id, videoId))
      .limit(1);
    return result.length > 0 ? result[0] : undefined;
  } catch (error) {
    console.error("[Database] Erreur lors de la récupération de la vidéo:", error);
    return undefined;
  }
}

export async function getFeedVideos(limit: number = 20, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db
      .select()
      .from(videos)
      .where(eq(videos.isPublic, true))
      .orderBy((v) => v.createdAt)
      .limit(limit)
      .offset(offset);
  } catch (error) {
    console.error("[Database] Erreur lors de la récupération du feed:", error);
    return [];
  }
}

// ======================
// LIKES
// ======================

export async function getUserLike(userId: number, videoId: number) {
  const db = await getDb();
  if (!db) return undefined;
  try {
    const result = await db
      .select()
      .from(likes)
      .where(and(eq(likes.userId, userId), eq(likes.videoId, videoId)))
      .limit(1);
    return result.length > 0 ? result[0] : undefined;
  } catch (error) {
    console.error("[Database] Erreur lors de la vérification du like:", error);
    return undefined;
  }
}

// ======================
// COMMENTAIRES
// ======================

export async function getVideoComments(videoId: number) {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db
      .select()
      .from(comments)
      .where(eq(comments.videoId, videoId))
      .orderBy((c) => c.createdAt);
  } catch (error) {
    console.error("[Database] Erreur lors de la récupération des commentaires:", error);
    return [];
  }
}

// ======================
// ABONNEMENTS
// ======================

export async function getFollowerCount(userId: number) {
  const db = await getDb();
  if (!db) return 0;
  try {
    const result = await db
      .select()
      .from(followers)
      .where(eq(followers.followingId, userId));
    return result.length;
  } catch (error) {
    console.error("[Database] Erreur lors du comptage des followers:", error);
    return 0;
  }
}

export async function getFollowingCount(userId: number) {
  const db = await getDb();
  if (!db) return 0;
  try {
    const result = await db
      .select()
      .from(followers)
      .where(eq(followers.followerId, userId));
    return result.length;
  } catch (error) {
    console.error("[Database] Erreur lors du comptage des following:", error);
    return 0;
  }
}

export async function isFollowing(followerId: number, followingId: number) {
  const db = await getDb();
  if (!db) return false;
  try {
    const result = await db
      .select()
      .from(followers)
      .where(
        and(
          eq(followers.followerId, followerId),
          eq(followers.followingId, followingId)
        )
      )
      .limit(1);
    return result.length > 0;
  } catch (error) {
    console.error("[Database] Erreur lors de la vérification du follow:", error);
    return false;
  }
}

// ======================
// GAINS ET RETRAITS
// ======================

export async function getUserEarnings(userId: number) {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db
      .select()
      .from(earnings)
      .where(eq(earnings.userId, userId))
      .orderBy((e) => e.createdAt);
  } catch (error) {
    console.error("[Database] Erreur lors de la récupération des gains:", error);
    return [];
  }
}

export async function getUserWithdrawals(userId: number) {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db
      .select()
      .from(withdrawals)
      .where(eq(withdrawals.userId, userId))
      .orderBy((w) => w.createdAt);
  } catch (error) {
    console.error("[Database] Erreur lors de la récupération des retraits:", error);
    return [];
  }
                            }
        
