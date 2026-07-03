import { Pool } from "pg";
import { waddler } from "waddler/node-postgres";

let pool: Pool | undefined;

export function getDb() {
  const connectionString =
    process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? process.env.POSTGRES_URL_NON_POOLING;
  if (!connectionString) {
    throw new Error(
      "No database connection string set. Add DATABASE_URL (or POSTGRES_URL) in your Vercel project's Environment Variables."
    );
  }
  // Supabase's pooler presents a cert chain that Node's default trust store
  // doesn't recognize; rejectUnauthorized: false is Supabase's documented
  // fix for pg/serverless connections (the connection is still encrypted).
  pool ??= new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
  return { sql: waddler({ client: pool }) };
}
