import { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import cors from "cors";

/**
 * Configuration du rate limiting
 */
export const createRateLimiter = (
  windowMs: number = 15 * 60 * 1000, // 15 minutes
  maxRequests: number = 100
) => {
  return rateLimit({
    windowMs,
    max: maxRequests,
    message: "Too many requests from this IP, please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Ne pas limiter les requêtes GET pour les assets statiques
      return req.method === "GET" && req.path.startsWith("/public");
    },
  });
};

/**
 * Configuration du rate limiting pour l'authentification
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 tentatives
  message: "Too many login attempts, please try again later.",
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    return req.ip || req.socket.remoteAddress || "unknown";
  },
});

/**
 * Configuration du rate limiting pour l'upload
 */
export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 10, // 10 uploads par heure
  message: "Upload limit exceeded, please try again later.",
});

/**
 * Configuration Helmet pour la sécurité HTTP
 */
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
    maxAge: 31536000, // 1 an
    includeSubDomains: true,
    preload: true,
  },
});

/**
 * Configuration CORS
 */
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
 * Middleware de validation des entrées
 */
export const validateInput = (req: Request, res: Response, next: NextFunction) => {
  // Vérifier la taille du corps de la requête
  const maxBodySize = 10 * 1024 * 1024; // 10 MB
  if (req.headers["content-length"]) {
    const contentLength = parseInt(req.headers["content-length"], 10);
    if (contentLength > maxBodySize) {
      return res.status(413).json({
        error: "Payload too large",
        message: "Request body exceeds maximum size",
      });
    }
  }

  // Nettoyer les entrées
  if (req.body && typeof req.body === "object") {
    sanitizeObject(req.body);
  }

  next();
};

/**
 * Nettoie un objet des caractères malveillants
 */
function sanitizeObject(obj: any): void {
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];

      if (typeof value === "string") {
        // Supprimer les caractères de contrôle et les espaces excessifs
        obj[key] = value
          .replace(/[\x00-\x1F\x7F]/g, "") // Caractères de contrôle
          .trim();
      } else if (typeof value === "object" && value !== null) {
        sanitizeObject(value);
      }
    }
  }
}

/**
 * Middleware de gestion d'erreurs
 */
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

  // Erreurs de validation
  if (err.name === "ValidationError") {
    return res.status(400).json({
      error: "Validation Error",
      message: err.message,
      details: err.details,
    });
  }

  // Erreurs d'authentification
  if (err.name === "UnauthorizedError") {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Authentication required",
    });
  }

  // Erreurs de permission
  if (err.statusCode === 403) {
    return res.status(403).json({
      error: "Forbidden",
      message: "You do not have permission to access this resource",
    });
  }

  // Erreurs par défaut
  const statusCode = err.statusCode || 500;
  const message =
    statusCode === 500
      ? "Internal Server Error"
      : err.message || "An error occurred";

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

/**
 * Middleware de logging de sécurité
 */
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

/**
 * Middleware pour vérifier les en-têtes de sécurité
 */
export const checkSecurityHeaders = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Ajouter les en-têtes de sécurité supplémentaires
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  next();
};

/**
 * Middleware pour valider les tokens JWT
 */
export const validateJWT = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "No token provided",
    });
  }

  // La validation réelle est faite par tRPC/le contexte
  // Ce middleware est juste un exemple
  next();
};

/**
 * Middleware pour limiter les requêtes POST/PUT/DELETE
 */
export const restrictMethods = (
  allowedMethods: string[] = ["GET"]
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!allowedMethods.includes(req.method)) {
      return res.status(405).json({
        error: "Method Not Allowed",
        message: `${req.method} is not allowed on this endpoint`,
      });
    }
    next();
  };
};
