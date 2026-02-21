import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase"; // ⭐ client global

interface Video {
  id: string;
  likes?: number;
  comments?: number;
  shares?: number;
  [key: string]: any;
}

export function useRealtimeFeed(
  videos: Video[],
  setVideos: React.Dispatch<React.SetStateAction<Video[]>>
) {
  const channelsRef = useRef<any[]>([]);

  useEffect(() => {
    if (!videos.length) return;

    const updateVideo = (
      videoId: string,
      field: "likes" | "comments" | "shares",
      delta: number
    ) => {
      setVideos((prev) =>
        prev.map((v) =>
          v.id === videoId
            ? { ...v, [field]: Math.max(0, (v[field] || 0) + delta) }
            : v
        )
      );
    };

    // ⭐ Likes
    const likesChannel = supabase
      .channel("likes-feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "likes" },
        (payload: any) => {
          const videoId = payload.new?.video_id || payload.old?.video_id;
          if (!videoId) return;

          if (payload.eventType === "INSERT") updateVideo(videoId, "likes", 1);
          if (payload.eventType === "DELETE") updateVideo(videoId, "likes", -1);
        }
      )
      .subscribe();

    // ⭐ Comments
    const commentsChannel = supabase
      .channel("comments-feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "comments" },
        (payload: any) => {
          const videoId = payload.new?.video_id || payload.old?.video_id;
          if (!videoId) return;

          if (payload.eventType === "INSERT") updateVideo(videoId, "comments", 1);
          if (payload.eventType === "DELETE") updateVideo(videoId, "comments", -1);
        }
      )
      .subscribe();

    // ⭐ Shares
    const sharesChannel = supabase
      .channel("shares-feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "shares" },
        (payload: any) => {
          const videoId = payload.new?.video_id || payload.old?.video_id;
          if (!videoId) return;

          if (payload.eventType === "INSERT") updateVideo(videoId, "shares", 1);
          if (payload.eventType === "DELETE") updateVideo(videoId, "shares", -1);
        }
      )
      .subscribe();

    channelsRef.current = [likesChannel, commentsChannel, sharesChannel];

    return () => {
      channelsRef.current.forEach((c) => supabase.removeChannel(c));
      channelsRef.current = [];
    };
  }, [videos.length]);
}
