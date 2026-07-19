import { router, publicProcedure } from "./_core/trpc";
import { storageList } from "./storage";
import { z } from "zod";

export const musicRouter = router({
  getTrending: publicProcedure.query(async () => {
    const files = await storageList("music");

    return files.map((file, index) => ({
      id: String(index + 1),
      title: file.name.replace(".mp3", ""),
      artist: "Afritok",
      audioUrl: file.url,
      category: "popular",
      duration: 0,
      plays: 0,
      isActive: true,
    }));
  }),

  getByTab: publicProcedure
    .input(
      z.object({
        tab: z.enum(["popular", "forYou", "favorites", "recent"]),
      })
    )
    .query(async () => {
      const files = await storageList("music");

      return files.map((file, index) => ({
        id: String(index + 1),
        title: file.name.replace(".mp3", ""),
        artist: "Afritok",
        audioUrl: file.url,
        category: "popular",
        duration: 0,
        plays: 0,
        isActive: true,
      }));
    }),

  search: publicProcedure
    .input(
      z.object({
        query: z.string(),
      })
    )
    .query(async ({ input }) => {
      const files = await storageList("music");

      return files
        .filter((file) =>
          file.name.toLowerCase().includes(input.query.toLowerCase())
        )
        .map((file, index) => ({
          id: String(index + 1),
          title: file.name.replace(".mp3", ""),
          artist: "Afritok",
          audioUrl: file.url,
          category: "popular",
          duration: 0,
          plays: 0,
          isActive: true,
        }));
    }),
});
