import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import path from "path";
import { fileURLToPath } from "url";

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
    // Get the directory of this file
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    
    // Path to drizzle migrations folder (relative to dist/index.js after build)
    const migrationsPath = path.join(__dirname, "../drizzle");
    
    console.log(`[Migrations] Running migrations from: ${migrationsPath}`);
    
    await migrate(db, { migrationsFolder: migrationsPath });
    console.log("✅ Database migrated successfully");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    // Don't throw - allow server to start even if migrations fail
    // This prevents production crashes if migrations folder is missing
  } finally {
    await pool.end();
  }
}
