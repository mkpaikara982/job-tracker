# JobTrackr — Regional-NSW Job Application Tracker

A personal, single-user job-hunt dashboard that tracks applications across **SEEK, LinkedIn, and Indeed** on one kanban board — with automatic **designated-regional-area (NSW) tagging** built for the subclass 485 → 491 skilled-visa pathway.

> Every saved job is auto-classified as **Regional NSW** (counts toward a 491) or **Greater Sydney / non-regional**, using the authoritative [Home Affairs designated-regional-area postcodes](https://immi.homeaffairs.gov.au/visas/working-in-australia/skill-occupation-list/regional-postcodes).

## Features

- **Kanban pipeline** — drag applications through `Saved → Applied → Interview → Offer → Rejected` (dnd-kit). Reordering and status changes persist automatically.
- **Regional-NSW auto-tagging** — each job is tagged by postcode (confident) or suburb name (inferred), with an ACT-overlap guard so Canberra postcodes aren't mistaken for regional NSW. A "Regional NSW only" filter isolates 491-qualifying roles.
- **Dashboard** — totals, pipeline distribution, response rate (`Interview+Offer ÷ applied`), regional vs non-regional split, and an applications-over-time chart (Recharts).
- **Add / edit** — quick modal with a live regional-status preview as you type the location.
- **Filter & search** — by keyword, platform, and regional status.

## Why not "just log into my SEEK/LinkedIn/Indeed account"?

None of those platforms expose a candidate-side API to read *your* applications — their APIs are employer/recruiter-only. So, like Teal/Huntr/Simplify, this app is the source of truth and jobs enter via **manual add**, **paste-a-URL**, and (planned) a **companion browser extension** that one-click-captures the job you're viewing. See [`data/regional-nsw.md`](./data/regional-nsw.md) for the regional-area definition and [`data/seek-saved-searches.md`](./data/seek-saved-searches.md) for the SEEK saved-search setup that feeds discovery.

## Tech stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS 4**
- **Prisma 6 + SQLite** (local, private; the data layer is isolated behind `lib/dataClient.ts` so swapping to Postgres/Firestore later is a contained change)
- **dnd-kit** (kanban), **Recharts** (charts)

## Getting started

```bash
npm install
cp .env.example .env          # DATABASE_URL="file:./dev.db"
npx prisma migrate dev        # create the SQLite DB + generate the client
npm run dev                   # http://localhost:3000

# optional: load the real regional-NSW starter matches (dev server must be running)
node scripts/seed-via-api.mjs
```

## Project structure

```
app/
  page.tsx                     server component — loads applications from the DB
  api/applications/            REST endpoints (manual add/edit/move/delete)
  api/ingest/                  extension ingest endpoint (CORS + URL dedupe)
  api/profile/                 resume upload/get (docx/txt → text → skills); saving re-scores all jobs
  api/rescore/                 re-score every job against the current resume on demand
components/                    TrackerApp, Board, ApplicationCard, AddApplicationModal, StatsBar, FilterBar, ResumePanel, MatchBadge
lib/
  types.ts                     canonical value sets + shared types
  dataClient.ts                data-access seam (all Prisma calls live here)
  stats.ts                     pure client-side aggregation
  regional/tagLocation.ts      designated-regional-area tagging (pure, unit-testable)
  scoring/                     resume-match scoring — skill dictionary + pure keyword-overlap scorer
  resume.ts                    resume file → text extraction (mammoth for .docx)
extension/                     companion Chrome extension (MV3) — one-click save + JD capture (see extension/README.md)
data/                          regional-NSW dataset + saved-search notes + starter jobs
prisma/schema.prisma           Application + StatusHistory + Profile models
```

## Roadmap

- [x] **MVP** — auth-free tracker: add/edit, kanban, stats, filters
- [x] **Regional-NSW tagging** — postcode + suburb classification, ACT guard
- [x] **Companion Chrome extension (MV3)** — one-click save from a SEEK/LinkedIn/Indeed job page ([`extension/`](./extension)), now also capturing the job description for scoring
- [x] **Resume-match scoring** — upload a resume (`.docx`/`.txt`), and every job gets a 0–100 match score from keyword overlap (title-weighted, with matched/missing skill lists). Sort the board by match, and re-score on demand.
- [ ] **Paste-URL auto-fetch** — pull title/company/location from a job URL

## Notes & limitations

- The regional tag is **guidance, not immigration advice** — a postcode approximation of the official designation; it's user-overridable via the location field.
- Single-user and local by design. No accounts, no cloud — your data lives in `prisma/dev.db` on your machine.
