import { Pool } from "pg";
import { waddler } from "waddler/node-postgres";

let pool: Pool | undefined;

// pg-connection-string reads `sslmode` out of the connection string and
// builds its own ssl config from it, silently overriding whatever `ssl`
// object is passed to Pool/Client. Strip it so the explicit `ssl` option
// below is what actually takes effect.
function stripSslMode(connectionString: string): string {
  const url = new URL(connectionString);
  url.searchParams.delete("sslmode");
  return url.toString();
}

// Supabase's pooler serves a cert chain that Node's default CA store
// doesn't trust (fails with SELF_SIGNED_CERT_IN_CHAIN), so full
// verification needs Supabase's own CA cert pinned explicitly. Grab it from
// the Supabase dashboard (Project Settings > Database > SSL Configuration >
// "Download certificate") and set its full contents as the
// SUPABASE_DB_CA_CERT env var to enable it. Without that env var we fall
// back to the previous no-verify behavior — still encrypted, just not
// chain-validated — so the connection keeps working either way.
function sslConfig(): { rejectUnauthorized: boolean; ca?: string } {
  const ca = process.env.SUPABASE_DB_CA_CERT;
  return ca ? { rejectUnauthorized: true, ca } : { rejectUnauthorized: false };
}

export function getDb() {
  const connectionString =
    process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? process.env.POSTGRES_URL_NON_POOLING;
  if (!connectionString) {
    throw new Error(
      "No database connection string set. Add DATABASE_URL (or POSTGRES_URL) in your Vercel project's Environment Variables."
    );
  }
  pool ??= new Pool({ connectionString: stripSslMode(connectionString), ssl: sslConfig() });
  return { sql: waddler({ client: pool }) };
}
