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
  pool ??= new Pool({ connectionString });
  return { sql: waddler({ client: pool }) };
}
