// Applies every db/migrations/*/migration.sql file, in order. Each file is
// idempotent (CREATE TABLE IF NOT EXISTS, ADD COLUMN IF NOT EXISTS, etc.), so
// re-running the full set on every deploy is safe and needs no tracking table.
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import pg from "pg";

const migrationsDir = fileURLToPath(new URL("../db/migrations", import.meta.url));

// See src/lib/db.ts: recent pg-connection-string versions upgrade
// sslmode=require/prefer to full chain verification, which rejects
// Supabase's pooler cert regardless of an explicit ssl option.
function withNoVerifySsl(connectionString) {
  const url = new URL(connectionString);
  url.searchParams.set("sslmode", "no-verify");
  return url.toString();
}

async function main() {
  const rawConnectionString =
    process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? process.env.POSTGRES_URL_NON_POOLING;
  if (!rawConnectionString) {
    throw new Error("No database connection string set (DATABASE_URL / POSTGRES_URL) — cannot run migrations.");
  }
  const connectionString = withNoVerifySsl(rawConnectionString);

  const dirs = readdirSync(migrationsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();

  const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    for (const dir of dirs) {
      const file = path.join(migrationsDir, dir, "migration.sql");
      const sql = readFileSync(file, "utf8");
      process.stdout.write(`Applying ${dir}...\n`);
      await client.query(sql);
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
