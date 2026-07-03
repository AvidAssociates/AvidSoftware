import { Pool } from "pg";
import { waddler } from "waddler/node-postgres";

let pool: Pool | undefined;

// Recent pg-connection-string versions upgrade sslmode=require/prefer to a
// full chain verification, which rejects Supabase's pooler cert regardless
// of an explicit `ssl` option passed to Pool/Client. Force no-verify in the
// URL itself (still encrypted, just not chain-validated).
function withNoVerifySsl(connectionString: string): string {
  const url = new URL(connectionString);
  url.searchParams.set("sslmode", "no-verify");
  return url.toString();
}

export function getDb() {
  const connectionString =
    process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? process.env.POSTGRES_URL_NON_POOLING;
  if (!connectionString) {
    throw new Error(
      "No database connection string set. Add DATABASE_URL (or POSTGRES_URL) in your Vercel project's Environment Variables."
    );
  }
  pool ??= new Pool({ connectionString: withNoVerifySsl(connectionString), ssl: { rejectUnauthorized: false } });
  return { sql: waddler({ client: pool }) };
}
