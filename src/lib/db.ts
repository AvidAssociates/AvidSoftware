import { Pool } from "pg";
import { waddler } from "waddler/node-postgres";

let pool: Pool | undefined;

export function getDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Add it in your Vercel project's Environment Variables (Postgres connection string)."
    );
  }
  pool ??= new Pool({ connectionString });
  return { sql: waddler({ client: pool }) };
}
