import { useEffect, useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";

interface Video { id: number; }

export function useUserLikes(videos: Video[], isAuthenticated: boolean) {
  const [likedVideos, setLikedVideos] = useState<Set<number>>(new Set());
  const videoIds = Array.isArray(videos) ? videos.map(v => v.id) : [];

  const userLikesQuery = trpc.like.getMyForVideos.useQuery(
    { videoIds },
    { enabled: isAuthenticated && videoIds.length > 0 }
  );

  useEffect(() => {
    const ids = userLikesQuery.data?.likedVideoIds;
    setLikedVideos(new Set(Array.isArray(ids) ? ids : []));
  }, [userLikesQuery.data]);

  const toggleLike = useCallback((videoId: number) => {
    setLikedVideos(prev => {
      const next = new Set(prev);
      if (next.has(videoId)) next.delete(videoId); else next.add(videoId);
      return next;
    });
  }, []);

  return {
    likedVideos,
    toggleLike,
    isLoading: userLikesQuery.isLoading,
    isLiked: (videoId: number) => likedVideos.has(videoId),
    refetch: userLikesQuery.refetch,
  };
}
