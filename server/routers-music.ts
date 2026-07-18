import { router, publicProcedure } from "./_core/trpc";
import { db } from "./db";
import { music } from "../drizzle/schema";
import { eq, desc, ilike } from "drizzle-orm";
import { z } from "zod";

export const musicRouter = router({
  getTrending: publicProcedure.query(async () => {
    return await db
      .select()
      .from(music)
      .where(eq(music.isActive, true))
      .orderBy(desc(music.plays))
      .limit(50);
  }),

  getByTab: publicProcedure
    .input(
      z.object({
        tab: z.enum(["popular", "forYou", "favorites", "recent"]),
      })
    )
    .query(async ({ input }) => {
      switch (input.tab) {
        case "popular":
          return await db
            .select()
            .from(music)
            .where(eq(music.isActive, true))
            .orderBy(desc(music.plays))
            .limit(50);

        case "recent":
          return await db
            .select()
            .from(music)
            .where(eq(music.isActive, true))
            .orderBy(desc(music.createdAt))
            .limit(50);

        case "forYou":
          return await db
            .select()
            .from(music)
            .where(eq(music.isActive, true))
            .orderBy(desc(music.plays))
            .limit(50);

        case "favorites":
          return await db
            .select()
            .from(music)
            .where(eq(music.isActive, true))
            .orderBy(desc(music.plays))
            .limit(50);

        default:
          return [];
      }
    }),

  search: publicProcedure
    .input(
      z.object({
        query: z.string(),
      })
    )
    .query(async ({ input }) => {
      return await db
        .select()
        .from(music)
        .where(ilike(music.title, `%${input.query}%`));
    }),
});
