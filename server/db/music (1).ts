import { eq, desc } from "drizzle-orm";
import { db } from "./index";
import { music } from "../../drizzle/schema";

/* =====================
MUSIC LIBRARY
===================== */

export async function getAllMusic() {
  return db.select().from(music).where(eq(music.isActive, true)).orderBy(desc(music.createdAt));
}

export async function getMusicById(musicId: number) {
  return (await db.select().from(music).where(eq(music.id, musicId)).limit(1))[0];
}

export async function getMusicByCategory(category: string) {
  return db.select().from(music).where(eq(music.category, category)).orderBy(desc(music.plays));
}

export async function incrementMusicPlays(musicId: number) {
  await db
    .update(music)
    .set({ plays: db.select().from(music).where(eq(music.id, musicId)) as any })
    .where(eq(music.id, musicId));
}

export async function addMusic(data: {
  title: string;
  artist: string;
  audioUrl: string;
  coverUrl?: string;
  duration: number;
  category?: string;
}) {
  await db.insert(music).values({
    title: data.title,
    artist: data.artist,
    audioUrl: data.audioUrl,
    coverUrl: data.coverUrl,
    duration: data.duration,
    category: data.category || "trending",
  });
}

export async function deleteMusic(musicId: number) {
  await db.delete(music).where(eq(music.id, musicId));
}
