# Avid Send-Out Tracker

A send-out pipeline tracker for Avid Associates: log candidates as they move
through sent → interview → offer → placed, or mark them declined. Built with
Next.js and Postgres, deployed on Vercel.

## App

Single page at `/`, with four tabs:

- **Send-Outs** — log a candidate with company, role, interview type/round,
  and the team members working it. Advance its stage by clicking a dot on
  its progress track, or mark it declined (with a reason).
- **Billings** — the fee ledger. Marking a send-out **Placed** auto-creates
  a billing row (amount starts at $0 until the fee is entered). You can also
  log a billing directly without a send-out first — useful for deals that
  never went through the pipeline. A solo deal (one person) counts toward
  that person's Personal total; a team deal (two or more) credits the
  *full, unsplit* amount to everyone listed, toward Total only — never
  divided. The summary table shows Monthly/YTD Personal and Total per
  recruiter, plus editable retainers and goal progress (Monthly Avg Needed
  / Company YTD / % to Goal, from the yearly + monthly goals set on the
  Report tab).
- **Report** — a year's production: a firm-wide monthly bar chart (with an
  optional monthly goal line, colored by over/under) and a per-recruiter
  line chart. Exportable to PDF via the print button.
- **Leaderboard** — ranks the team by number of send-outs this month, with a
  First-Time-only variant. Like Billings' Total column, everyone listed on
  a shared send-out gets full credit, not a split.

Filter by team member, stage, or search text; switch months (or years, on
Report) with the header arrows. Toggle light/dark theme (persisted per
device), or open TV mode for a display-friendly leaderboard view.

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
