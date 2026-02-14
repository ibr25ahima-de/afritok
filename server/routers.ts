// ... (keep all existing imports and code above the video router)

// ============================================
// VIDEO ROUTES
// ============================================
video: router({
feed: publicProcedure
.input(z.object({ limit: z.number().default(20), offset: z.number().default(0) }))
.query(({ input }) => getFeedVideos(input.limit, input.offset)),

getById: publicProcedure  
  .input(z.object({ id: z.number() }))  
  .query(({ input }) => getVideoById(input.id)),  

getUserVideos: publicProcedure  
  .input(z.object({ userId: z.number() }))  
  .query(({ input }) => getUserVideos(input.userId)),  

upload: protectedProcedure  
  .input(  
    z.object({  
      title: z.string(),  
      description: z.string().optional(),  
      // ✅ FIXED: Accept array of numbers (Uint8Array serialized as array)
      file: z.array(z.number()),
      fileName: z.string(),
      fileType: z.string(),
      thumbnailFile: z.array(z.number()).optional(),  
    })  
  )  
  .mutation(async ({ ctx, input }) => {  
    if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });  

    try {  
      // ✅ Convert array back to Buffer
      const fileBuffer = Buffer.from(input.file);
      
      // Generate unique file key
      const fileKey = `videos/${ctx.user.id}/${Date.now()}-${input.fileName}`;
      
      // Upload video to storage
      const { videoUrl, thumbnailUrl, duration } = await uploadVideoToStorage(
        fileBuffer,
        input.fileType,
        input.thumbnailFile ? Buffer.from(input.thumbnailFile) : undefined
      );

      // Save video metadata to database
      const result = await db.insert(videos).values({  
        userId: ctx.user.id,  
        title: input.title,  
        description: input.description,  
        videoUrl,  
        thumbnailUrl,  
        duration,  
        isPublic: true,  
      });  

      return { success: true, videoId: result.insertId };  
    } catch (error) {  
      console.error("[Video] Upload failed:", error);  
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to upload video" });  
    }  
  }),  

delete: protectedProcedure  
  .input(z.object({ id: z.number() }))  
  .mutation(async ({ ctx, input }) => {  
    if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });  

    try {  
      const video = await getVideoById(input.id);  
      if (!video || video.userId !== ctx.user.id) {  
        throw new TRPCError({ code: "FORBIDDEN", message: "Cannot delete this video" });  
      }  

      await db.delete(videos).where(eq(videos.id, input.id));  
      return { success: true };  
    } catch (error) {  
      if (error instanceof TRPCError) throw error;  
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });  
    }  
  }),

}),

// ... (keep all remaining code below)
