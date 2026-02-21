import { useEffect, useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";

interface Video {
  id: string;
}

export function useUserLikes(
  videos: Video[],
  isAuthenticated: boolean
) {
  const [likedVideos, setLikedVideos] = useState<Set<string>>(new Set());

  const videoIds = videos.map((v) => v.id);

  const userLikesQuery = trpc.like.userLikes.useQuery(
    { videoIds },
    {
      enabled: isAuthenticated && videoIds.length > 0,
    }
  );

  useEffect(() => {
    if (!userLikesQuery.data) return;
    setLikedVideos(new Set(userLikesQuery.data));
  }, [userLikesQuery.data]);

  const toggleLike = useCallback((videoId: string) => {
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
    isLiked: (videoId: string) => likedVideos.has(videoId),
  };
}
