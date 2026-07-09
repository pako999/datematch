/**
 * Auto-migration, run as part of `pnpm build` (so every Vercel deploy
 * applies pending migrations before the app goes live). Skips cleanly
 * when DATABASE_URL isn't set (local builds, CI without a database).
 */
import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

const url = process.env.DATABASE_URL;
if (!url) {
  console.warn("DATABASE_URL not set — skipping migrations (build continues).");
  process.exit(0);
}

const db = drizzle(neon(url));
console.log("Applying database migrations…");
await migrate(db, { migrationsFolder: "./drizzle" });
console.log("Migrations up to date.");
