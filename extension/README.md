# JobTrackr — Companion Chrome Extension (MV3)

One-click save of a **SEEK / LinkedIn / Indeed** job listing into your local JobTrackr board, with the same regional-NSW auto-tagging as the web app.

## How it works

1. You open a job listing on SEEK, LinkedIn, or Indeed.
2. Click the JobTrackr toolbar icon → the popup scrapes the page (title, company, location, salary, URL) and shows an **editable preview**.
3. Fix anything the scraper missed, then hit **Save to JobTrackr** → it POSTs to your locally-running app at `/api/ingest`.
4. The **server** does the authoritative regional-NSW tagging and de-duplicates by URL, so re-saving the same job just says "Already on your board".

Scraping strategy is layered for resilience: **site-specific hooks** (SEEK's stable `data-automation` attributes; LinkedIn/Indeed top-card selectors) → **JSON-LD `JobPosting`** → **`og:`/title** fallback. Because the preview is editable, a partial scrape is never a dead end.

## Install (load unpacked)

1. Start the JobTrackr app so the API is reachable:
   ```bash
   npm run dev        # http://localhost:3000
   ```
2. Go to `chrome://extensions`, enable **Developer mode** (top-right).
3. Click **Load unpacked** and select this `extension/` folder.
4. Pin the JobTrackr icon to the toolbar for easy access.

## Settings

Click the ⚙ in the popup to change the JobTrackr URL if your dev server runs on a
non-default port (default `http://localhost:3000`). Stored via `chrome.storage.sync`.

## Permissions — why each is needed

| Permission | Reason |
|---|---|
| `activeTab` + `scripting` | Read the job page **only when you click the icon** (no always-on content script). |
| `storage` | Remember your JobTrackr URL. |
| `host_permissions: localhost / 127.0.0.1` | POST the saved job to your local app. |

No data leaves your machine — the extension talks only to your own `localhost` JobTrackr.

## Regenerating icons

```bash
python make-icons.py   # requires Pillow → writes icons/icon{16,48,128}.png
```

## Known limitations

- **DOM churn:** SEEK/LinkedIn/Indeed change their markup over time. SEEK's `data-automation` hooks are the most stable; LinkedIn is the flakiest. The editable preview is the safety net — if a field is blank, type it in.
- The app's dev server must be running to save. If it's down, the popup tells you.
