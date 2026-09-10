import { Request, Response, NextFunction } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import helmet from "helmet";
import cors from "cors";

/**
 * Configuration du rate limiting
 */
export const createRateLimiter = (
  windowMs: number = 15 * 60 * 1000,
  maxRequests: number = 100
) => {
  return rateLimit({
    windowMs,
    max: maxRequests,
    message: "Too many requests from this IP, please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      return req.method === "GET" && req.path.startsWith("/public");
    },
  });
};

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many login attempts, please try again later.",
  skipSuccessfulRequests: true,
  keyGenerator: (req) => ipKeyGenerator(req.ip || req.socket.remoteAddress || "unknown"),
});

export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: "Upload limit exceeded, please try again later.",
});

export const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      mediaSrc: ["'self'", "https:"],
      connectSrc: ["'self'", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
});

export const corsConfig = cors({
  origin: process.env.ALLOWED_ORIGINS?.split(",") || [
    "http://localhost:3000",
    "http://localhost:5173",
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
});

/**
 * Protection CSRF/origin pour les requêtes qui utilisent le cookie de session.
 * Les requêtes cross-site ne doivent jamais pouvoir déclencher une mutation
 * authentifiée simplement parce que le navigateur joint automatiquement le cookie.
 * Les clients natifs/server-to-server sans Origin/Referer restent autorisés.
 */
export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  const method = req.method.toUpperCase();
  if (["GET", "HEAD", "OPTIONS"].includes(method)) return next();

  const configuredOrigins = (process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || process.env.APP_URL || "")
    .split(",")
    .map(value => value.trim())
    .filter(Boolean);

  const origin = req.headers.origin?.trim();
  const referer = req.headers.referer?.trim();
  let requestOrigin: string | undefined = origin;

  if (!requestOrigin && referer) {
    try {
      requestOrigin = new URL(referer).origin;
    } catch {
      return res.status(403).json({ error: "Invalid request origin." });
    }
  }

  if (!requestOrigin) return next();

  const isDevelopmentLocalhost =
    process.env.NODE_ENV === "development" &&
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(requestOrigin);

  if (isDevelopmentLocalhost || configuredOrigins.includes(requestOrigin)) {
    return next();
  }

  return res.status(403).json({ error: "Cross-origin request blocked." });
};

export const validateInput = (req: Request, res: Response, next: NextFunction) => {
  const maxBodySize = 10 * 1024 * 1024;
  if (req.headers["content-length"]) {
    const contentLength = parseInt(req.headers["content-length"], 10);
    if (contentLength > maxBodySize) {
      return res.status(413).json({
        error: "Payload too large",
        message: "Request body exceeds maximum size",
      });
    }
  }

  if (req.body && typeof req.body === "object") sanitizeObject(req.body);
  next();
};

function sanitizeObject(obj: any): void {
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      if (typeof value === "string") {
        obj[key] = value.replace(/[\x00-\x1F\x7F]/g, "").trim();
      } else if (typeof value === "object" && value !== null) {
        sanitizeObject(value);
      }
    }
  }
}

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error("[Error]", {
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
    ip: req.ip,
    error: err.message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });

  if (err.name === "ValidationError") {
    return res.status(400).json({
      error: "Validation Error",
      message: err.message,
      details: err.details,
    });
  }

  if (err.name === "UnauthorizedError") {
    return res.status(401).json({ error: "Unauthorized", message: "Authentication required" });
  }

  if (err.statusCode === 403) {
    return res.status(403).json({ error: "Forbidden", message: "You do not have permission to access this resource" });
  }

  const statusCode = err.statusCode || 500;
  const message = statusCode === 500 ? "Internal Server Error" : err.message || "An error occurred";

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

export const securityLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - startTime;
    const isError = res.statusCode >= 400;
    if (isError || req.path.includes("/api")) {
      console.log("[Security Log]", {
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        ip: req.ip,
        userAgent: req.headers["user-agent"],
        duration: `${duration}ms`,
        userId: (req as any).userId,
      });
    }
  });
  next();
};

export const checkSecurityHeaders = (req: Request, res: Response, next: NextFunction) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
};

export const validateJWT = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized", message: "No token provided" });
  next();
};

export const restrictMethods = (allowedMethods: string[] = ["GET"]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!allowedMethods.includes(req.method)) {
      return res.status(405).json({ error: "Method Not Allowed", message: `${req.method} is not allowed on this endpoint` });
    }
    next();
  };
};
