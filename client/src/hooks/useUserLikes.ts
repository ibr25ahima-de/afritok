import { useEffect, useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";

interface Video {
  id: number;
}

export function useUserLikes(videos: Video[], isAuthenticated: boolean) {
  const [likedVideos, setLikedVideos] = useState<Set<number>>(new Set());

  // ✅ Always safe array
  const videoIds = Array.isArray(videos) ? videos.map((v) => v.id) : [];

  const userLikesQuery = trpc.like.userLikes.useQuery(
    { videoIds },
    {
      enabled: isAuthenticated && videoIds.length > 0,
    }
  );

  useEffect(() => {
    const incoming = userLikesQuery.data;

    // ✅ HARD CRASH SHIELD
    const safeArray = Array.isArray(incoming)
      ? incoming
      : Array.isArray((incoming as any)?.likes)
      ? (incoming as any).likes
      : [];

    setLikedVideos(new Set(safeArray));
  }, [userLikesQuery.data]);

  const toggleLike = useCallback((videoId: number) => {
    setLikedVideos((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(videoId)) newSet.delete(videoId);
      else newSet.add(videoId);
      return newSet;
    });
  }, []);

  return {
    likedVideos,
    toggleLike,
    isLoading: userLikesQuery.isLoading,
    isLiked: (videoId: number) => likedVideos.has(videoId),
  };
}
