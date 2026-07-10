# Refresh from SEEK saved searches

Pulls every job from the regional-NSW ICT searches in [`data/seek-search-urls.json`](../data/seek-search-urls.json)
and upserts them onto the board via **`POST /api/refresh`**.

## Why it runs in the browser (not the server)

SEEK migrated to `au.seek.com` and serves search results through an **authenticated
GraphQL endpoint** behind bot protection — a server-side fetch just gets an anti-bot
HTML shell. So the scrape must run inside the user's own logged-in browser. The
Earthling browser bridge (or the companion extension) does this; the results are then
POSTed to the local app.

## How a refresh works

For each search URL, in the authenticated browser:

1. Scrape every result card: `title`, `company`, `location`, `salaryText`, a
   short `description` teaser, the `applied` flag, and the canonical `/job/<id>` URL
   (via SEEK's `data-automation` hooks: `jobTitle`, `jobCompany`, `jobLocation`,
   `jobSalary`, `jobShortDescription`, `applied-job`).
2. Drop security-clearance / defence roles (not visa-eligible) using the
   `clearanceSignals` regex in the config.
3. `POST /api/refresh` with `{ jobs: [...] }`.

## What `/api/refresh` does per job (`upsertScrapedJob`)

- **Same URL already tracked** → `duplicate` (no change).
- **Matches a URL-less card by title + company** → `enriched` (adds the URL, fills
  blank salary/description, and if the site says "applied" and the card is still
  `Saved`, moves it to `Applied`).
- **Otherwise** → `added` (new card; jobs the site marks applied start in `Applied`).

The server does the authoritative regional-NSW tagging and resume-match scoring, so a
refreshed board is immediately tagged and scored.

## Trigger

The scrape needs the authenticated browser, so it is agent-driven: ask the agent to
"refresh my SEEK searches", or wire it to a scheduled job that drives the browser.
The local dev server must be running (the refresh POSTs to `http://localhost:3000`).

> Note: v1 pulls page 1 of each search (~20 cards) and captures the short description
> teaser, not the full JD. Open a job (Apply link) and save it with the extension to
> capture the full description for a sharper match score.
