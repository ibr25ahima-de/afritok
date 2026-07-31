import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export const db = drizzle(pool);

// Users
export * from "./users";

// Videos
export * from "./videos";

// OTP
export * from "./otp";

// Likes
export * from "./likes";

// Comments
export * from "./comments";

// Favorites
export * from "./favorites";

// Followers
export * from "./followers";

// Shares
export * from "./shares";

// Views
export * from "./views";

// Earnings
export * from "./earnings";

// Withdrawals
export * from "./withdrawals";

// Profile
export * from "./profile";

// Settings
export * from "./settings";

// Notifications
export * from "./notifications";

// Reports
export * from "./reports";

// Blocks
export * from "./blocks";

// Music
export * from "./music";

// Admin
export * from "./admin";
