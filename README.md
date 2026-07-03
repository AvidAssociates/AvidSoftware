# Avid Send-Out Tracker

A send-out pipeline tracker for Avid Associates: log candidates as they move
through sent → interview → offer → placed, or mark them declined. Built with
Next.js and Netlify DB (Postgres).

## App

Single page at `/`. Sign in by picking (or typing) a name — stays signed in
on that device. From there:

- Log a new send-out with candidate, company, role, interview type/round,
  and the team members working it.
- Advance an entry's stage by clicking a dot on its progress track, or mark
  it declined.
- Filter by team member, stage, or search text; switch months with the
  header arrows.
- Toggle light/dark theme (persisted per device).

## Data model

Postgres database provisioned automatically via Netlify DB (`@netlify/database`).
Schema lives in `netlify/database/migrations/`. Single `pipeline_entries` table
holding each send-out's candidate/company/role, interview details, team,
stage, and declined flag.

## Running locally

```bash
npm install
netlify dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deployment

Deployed on Netlify. Pushing to the linked branch triggers a build; database
migrations run automatically before each deploy is published. Each deploy
preview gets its own isolated database branch.
