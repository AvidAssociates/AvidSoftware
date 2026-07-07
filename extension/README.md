# Avid Search — LinkedIn Chrome Extension

Adds LinkedIn profiles to **Avid retained searches** with one click.

## Install (developer mode)

1. Open Chrome → **Extensions** → enable **Developer mode**
2. Click **Load unpacked**
3. Select this `extension/` folder

## Connect

1. Click the extension icon in Chrome
2. Enter your **API URL** (e.g. `https://your-app.vercel.app` or `http://localhost:3000`)
3. Sign in with your Avid dashboard email and password

## Use on LinkedIn

1. Open any LinkedIn profile (`linkedin.com/in/...`)
2. Click the red **Add to Search** button (bottom-right)
3. Type to find a retained search (client or role name)
4. Pick a **stage** (Presented, Interview, Offer, Placed)
5. Click **Add to Search**

The candidate appears on that search’s kanban board in the Avid app, with their name and profile photo.

## What gets captured

- Full name (from profile heading)
- Profile photo URL
- LinkedIn profile URL
- Stage you choose

## API endpoints (used by extension)

- `POST /api/extension/login` — bearer token auth
- `GET /api/extension/searches?q=` — search picker
- `POST /api/extension/candidates` — add candidate to a search

## Icons

Replace `icons/icon16.png`, `icon48.png`, and `icon128.png` with your own branding if desired. Simple red placeholders are included for development.
