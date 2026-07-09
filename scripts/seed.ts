/**
 * CLI seed — wipes ALL matchmaking tables and loads the labelled demo
 * personas (see src/lib/seed-data.ts). Refuses to run against a
 * non-empty database unless invoked with `--force`:
 *   pnpm db:seed -- --force
 *
 * Prefer the admin "Load demo data" button in /settings for deployed
 * environments — it appends into an empty roster without touching staff.
 */

import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "drizzle-orm";
import * as schema from "../src/db/schema";
import { runSeed } from "../src/lib/seed-data";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set — aborting.");
  process.exit(1);
}
const db = drizzle(neon(url), { schema });
const FORCE = process.argv.includes("--force");

// DRY-RUN reasoning: inspect before the destructive wipe.
const [{ count }] = (await db.execute(
  sql`SELECT count(*)::int AS count FROM clients`,
)) as unknown as [{ count: number }];
console.log(`Database currently holds ${count} client rows.`);
if (count > 0 && !FORCE) {
  console.error(
    "Refusing to wipe a non-empty database. Re-run with --force to replace " +
      "ALL data with seed data:\n  pnpm db:seed -- --force",
  );
  process.exit(1);
}

console.log("Wiping matchmaking tables and loading demo data…");
const summary = await runSeed(db, { wipe: true });
console.log("Seed complete.");
console.log(`  staff:   ${summary.staff}`);
console.log(`  clients: ${summary.clients} (all labelled [SEED])`);
console.log(`  scores:  ${summary.scores}`);
console.log(`  intros:  ${summary.intros}`);
