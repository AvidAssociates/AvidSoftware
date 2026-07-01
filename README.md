# Avid Leaderboard

A sendout and billing tracker for Avid Associates, meant to replace the paper
sendout log and whiteboard. Built with Next.js and Netlify DB (Postgres).

## Pages

- `/` — TV leaderboard. Auto-refreshes every 30 seconds; ranks recruiters by
  total cash-in YTD (billings + retainers) and shows progress toward the
  annual team goal. Intended to be left open full-screen on the office TV.
- `/entry` — form to log a sendout, billing, or retainer.
- `/log` — table of all sendouts and billings, with delete support.
- `/settings` — manage the recruiter roster and the annual team goal.

## Data model

Postgres database provisioned automatically via Netlify DB (`@netlify/database`).
Schema and seed data live in `netlify/database/migrations/`. Four tables:
`recruiters`, `sendouts`, `billings`, `retainers`, plus a `settings` key/value
table for the annual goal.

## Running locally

```bash
npm install
netlify dev
```

Open [http://localhost:3000](http://localhost:3000). For the TV, open `/`
in a browser in kiosk/full-screen mode.

## Deployment

Deployed on Netlify. Pushing to the linked branch triggers a build; database
migrations run automatically before each deploy is published. Each deploy
preview gets its own isolated database branch.
