# Avid Send-Out Tracker

A send-out pipeline tracker for Avid Associates: log candidates as they move
through sent → interview → offer → placed, or mark them declined. Built with
Next.js and Postgres, deployed on Vercel.

## App

Single page at `/`. From there:

- Log a new send-out with candidate, company, role, interview type/round,
  and the team members working it.
- Advance an entry's stage by clicking a dot on its progress track, or mark
  it declined (with a reason).
- Filter by team member, stage, or search text; switch months with the
  header arrows.
- Toggle light/dark theme (persisted per device), or open TV mode for a
  display-friendly leaderboard view.

## Data model

Plain Postgres, connected via the `DATABASE_URL` environment variable.
Schema lives in `db/migrations/`, one directory per migration; each
`migration.sql` is idempotent (`CREATE TABLE IF NOT EXISTS`,
`ADD COLUMN IF NOT EXISTS`, etc.), so `scripts/migrate.mjs` can safely
re-run the full set on every deploy.

## Running locally

```bash
npm install
export DATABASE_URL=postgres://... # your Postgres connection string
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deployment

Deployed on Vercel. Pushing to the linked branch triggers a build; Vercel
runs the `vercel-build` script (`node scripts/migrate.mjs && next build`),
which applies any pending migrations before building. Set `DATABASE_URL` in
the project's Environment Variables.
