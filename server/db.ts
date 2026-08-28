export * from "./db/index";
export { db } from "./db/index";

// Compatibility helper for legacy server modules.
// The project now uses a shared PostgreSQL Drizzle instance.
export async function getDb() {
  return db;
}
