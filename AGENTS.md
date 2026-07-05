<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

Single Next.js 16 app (App Router) backed by plain Postgres via `DATABASE_URL`. Standard commands live in `package.json` (`dev`, `build`, `lint`) and `README.md`.

- **Database**: A local PostgreSQL 16 server is provisioned in the VM (installed via apt). It is not started automatically — start it each session with `sudo pg_ctlcluster 16 main start`. The dev database is `avid`, credentials `postgres`/`postgres`.
- **Connection string**: Kept in `.env.local` (gitignored, auto-loaded by Next.js) as `DATABASE_URL=postgres://postgres:postgres@localhost:5432/avid`. If it's missing, recreate that file — the app throws on startup without it.
- **SSL quirk**: `src/lib/db.ts` and `scripts/migrate.mjs` always connect with SSL (`rejectUnauthorized: false`). Ubuntu's Postgres has `ssl=on` by default (snakeoil cert), so local connections work; a Postgres build with SSL disabled would fail to connect.
- **Migrations**: `node scripts/migrate.mjs` applies every `db/migrations/*/migration.sql` in order. They are idempotent and seed sample roster/entries/billings data, so it's safe to re-run anytime.
- **Run/test**: `npm run dev` serves on `http://localhost:3000`. `npm run lint` (eslint) and `npm run build` (also runs `tsc` typecheck) are the checks; there is no automated test suite. Do NOT use `npm run vercel-build` locally unless you intend to run migrations as part of the build.
