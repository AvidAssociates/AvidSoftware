// Applies every db/migrations/*/migration.sql file, in order. Each file is
// idempotent (CREATE TABLE IF NOT EXISTS, ADD COLUMN IF NOT EXISTS, etc.), so
// re-running the full set on every deploy is safe and needs no tracking table.
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import pg from "pg";

const migrationsDir = fileURLToPath(new URL("../db/migrations", import.meta.url));

// See src/lib/db.ts for the full explanation: pg-connection-string reads
// `sslmode` out of the connection string and overrides the `ssl` option
// passed to Client, so it needs to be stripped here too. Full certificate
// verification is enabled by setting SUPABASE_DB_CA_CERT (Supabase's pooler
// CA cert, from Project Settings > Database > SSL Configuration); without
// it we fall back to the previous no-verify behavior.
function stripSslMode(connectionString) {
  const url = new URL(connectionString);
  url.searchParams.delete("sslmode");
  return url.toString();
}

function sslConfig() {
  const ca = process.env.SUPABASE_DB_CA_CERT;
  return ca ? { rejectUnauthorized: true, ca } : { rejectUnauthorized: false };
}

async function main() {
  const rawConnectionString =
    process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? process.env.POSTGRES_URL_NON_POOLING;
  if (!rawConnectionString) {
    throw new Error("No database connection string set (DATABASE_URL / POSTGRES_URL) — cannot run migrations.");
  }
  const connectionString = stripSslMode(rawConnectionString);

  const dirs = readdirSync(migrationsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();

  const client = new pg.Client({ connectionString, ssl: sslConfig() });
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
