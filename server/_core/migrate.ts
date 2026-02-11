import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const db = drizzle(pool);

export async function runMigrations() {
  try {
    await migrate(db, { migrationsFolder: "drizzle" });
    console.log("✅ Database migrated successfully");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  }
}
