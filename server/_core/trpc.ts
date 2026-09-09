import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const viewAttemptWindow = new Map<string, number>();
const VIEW_RETRY_WINDOW_MS = 5 * 60 * 1000;
const MAX_VIEW_KEYS = 100_000;

function enforceVideoViewThrottle(userId: number, path: string, input: unknown) {
  if (path !== "video.incrementViews" || !input || typeof input !== "object") return;

  const videoId = (input as { videoId?: unknown }).videoId;
  if (typeof videoId !== "number" || !Number.isSafeInteger(videoId) || videoId <= 0) return;

  const now = Date.now();
  const key = `${userId}:${videoId}`;
  const previous = viewAttemptWindow.get(key);

  if (previous !== undefined && now - previous < VIEW_RETRY_WINDOW_MS) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Cette vidéo a déjà été comptabilisée récemment.",
    });
  }

  viewAttemptWindow.set(key, now);

  // Bound memory usage in long-running processes. This is an additional
  // application-layer defense; production deployments should also use a
  // shared/DB-backed idempotency mechanism for authoritative view counting.
  if (viewAttemptWindow.size > MAX_VIEW_KEYS) {
    const cutoff = now - VIEW_RETRY_WINDOW_MS;
    for (const [storedKey, timestamp] of viewAttemptWindow) {
      if (timestamp < cutoff) viewAttemptWindow.delete(storedKey);
      if (viewAttemptWindow.size <= MAX_VIEW_KEYS) break;
    }
  }
}

const requireUser = t.middleware(async opts => {
  const { ctx, next, path, input } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  enforceVideoViewThrottle(ctx.user.id, path, input);

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);
