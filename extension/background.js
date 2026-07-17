// JobTrackr background service worker — weekly new-job alert.
//
// Once a week (Monday ~10:00 Australia/Sydney, or the next time Chrome is running if it
// was closed then) it runs the user's regional-NSW SEEK searches in background tabs,
// upserts them onto the local board via /api/refresh, and fires a Chrome notification
// for jobs it hasn't seen before — so the user remembers to apply.

const ALARM = "jobtrackr-weekly-check";
const DEFAULT_BASE = "http://localhost:3000";
const TZ = "Australia/Sydney";
const CHECK_HOUR = 10; // 10:00 Sydney, Monday

// The regional-NSW ICT searches (mirror of data/seek-search-urls.json).
const SEARCHES = [
	{
		region: "Wollongong, Illawarra & South Coast NSW",
		url: "https://au.seek.com/jobs-in-information-communication-technology/in-Wollongong,-Illawarra-&-South-Coast-NSW",
	},
	{
		region: "Newcastle, Maitland & Hunter NSW",
		url: "https://au.seek.com/jobs-in-information-communication-technology/in-Newcastle,-Maitland-&-Hunter-NSW",
	},
	{
		region: "Gosford & Central Coast NSW",
		url: "https://au.seek.com/jobs-in-information-communication-technology/in-Gosford-&-Central-Coast-NSW",
	},
];
const CLEARANCE =
	/leidos|boeing defence|tspv|disa|nv1|nv2|agsva|security clearance|baseline clearance|australian citizen|citizenship required|national security|defence|raaf|combat aircraft|mq-28|air battle/i;

// ---- Scheduling ------------------------------------------------------------

// Offset (ms) between a timezone's wall clock and UTC at the given instant.
function tzOffsetMs(date, tz) {
	const parts = new Intl.DateTimeFormat("en-US", {
		timeZone: tz,
		hour12: false,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	})
		.formatToParts(date)
		.reduce((a, p) => ((a[p.type] = p.value), a), {});
	const asUTC = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
	return asUTC - date.getTime();
}

// Epoch ms for a given Sydney wall-clock time (handles DST via a refinement pass).
function sydneyWallClockToEpoch(y, m, d, h, mi) {
	const guess = Date.UTC(y, m - 1, d, h, mi);
	let epoch = guess - tzOffsetMs(new Date(guess), TZ);
	epoch = guess - tzOffsetMs(new Date(epoch), TZ); // refine across a possible DST edge
	return epoch;
}

// Next Monday 10:00 Sydney strictly after `fromEpoch`.
function nextMonday10Sydney(fromEpoch) {
	const p = new Intl.DateTimeFormat("en-CA", {
		timeZone: TZ,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	})
		.formatToParts(new Date(fromEpoch))
		.reduce((a, x) => ((a[x.type] = x.value), a), {});
	const y = +p.year,
		m = +p.month,
		d = +p.day;
	const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=Sun..6=Sat for that calendar date
	let addDays = (1 - dow + 7) % 7; // days until Monday
	let target = sydneyWallClockToEpoch(y, m, d + addDays, CHECK_HOUR, 0);
	if (target <= fromEpoch) target = sydneyWallClockToEpoch(y, m, d + addDays + 7, CHECK_HOUR, 0);
	return target;
}

async function scheduleNext(fromEpoch = Date.now()) {
	const when = nextMonday10Sydney(fromEpoch);
	await chrome.storage.local.set({ nextRunAt: when });
	await chrome.alarms.create(ALARM, { when });
	return when;
}

// ---- Settings & seen-set ---------------------------------------------------

async function getSettings() {
	const { enabled = true, baseUrl } = await chrome.storage.sync.get(["enabled", "baseUrl"]);
	return { enabled, base: (baseUrl || DEFAULT_BASE).replace(/\/+$/, "") };
}

async function getSeen() {
	const { seenUrls = [] } = await chrome.storage.local.get("seenUrls");
	return new Set(seenUrls);
}

async function addSeen(urls) {
	const seen = await getSeen();
	for (const u of urls) seen.add(u);
	// Cap the set so it can't grow forever.
	const arr = [...seen].slice(-2000);
	await chrome.storage.local.set({ seenUrls: arr });
}

// ---- Scraping --------------------------------------------------------------

// Runs in the SEEK page. Waits for result cards to render, then extracts them.
async function pageScraper() {
	const wait = (ms) => new Promise((r) => setTimeout(r, ms));
	for (let i = 0; i < 20 && document.querySelectorAll("article").length === 0; i++) await wait(400);
	const seen = {};
	const out = [];
	for (const a of document.querySelectorAll("article")) {
		const link = a.querySelector('a[href*="/job/"]');
		const m = (link?.href || "").match(/\/job\/(\d+)/);
		if (!m || seen[m[1]]) continue;
		seen[m[1]] = 1;
		const txt = (sel) => (a.querySelector(sel)?.textContent || "").trim();
		const desc = [...a.querySelectorAll('[data-automation="jobShortDescription"] li, [data-automation="jobShortDescription"]')]
			.map((e) => e.textContent.trim())
			.join(" · ")
			.slice(0, 600);
		const title = txt('a[data-automation="jobTitle"]') || txt("h3");
		if (!title) continue;
		out.push({
			title,
			company: txt('a[data-automation="jobCompany"]'),
			location: txt('a[data-automation="jobLocation"]') || txt('[data-automation="jobCardLocation"]'),
			salaryText: txt('[data-automation="jobSalary"]'),
			description: desc,
			applied: !!a.querySelector('[data-automation="applied-job"]'),
			platform: "SEEK",
			source: "extension",
			url: `https://au.seek.com/job/${m[1]}`,
		});
	}
	return out;
}

function waitTabComplete(tabId, timeout = 20000) {
	return new Promise((resolve) => {
		const done = () => {
			chrome.tabs.onUpdated.removeListener(listener);
			clearTimeout(timer);
			resolve();
		};
		const listener = (id, info) => {
			if (id === tabId && info.status === "complete") done();
		};
		const timer = setTimeout(done, timeout);
		chrome.tabs.onUpdated.addListener(listener);
		// Guard the race where the tab finished loading before the listener attached.
		chrome.tabs.get(tabId, (t) => {
			if (!chrome.runtime.lastError && t && t.status === "complete") done();
		});
	});
}

async function scrapeSearch(url) {
	const tab = await chrome.tabs.create({ url, active: false });
	try {
		await waitTabComplete(tab.id);
		const [{ result }] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: pageScraper });
		return Array.isArray(result) ? result : [];
	} catch {
		return [];
	} finally {
		try {
			await chrome.tabs.remove(tab.id);
		} catch {
			/* tab already gone */
		}
	}
}

// ---- The weekly check ------------------------------------------------------

let running = false;

async function runWeeklyCheck(trigger) {
	if (running) return { skipped: "already-running" };
	running = true;
	// Arm the NEXT weekly run first thing — so if the service worker is evicted mid-check
	// (or Chrome quits), the alert is still scheduled and can't silently stop.
	await scheduleNext();
	try {
		const { enabled, base } = await getSettings();
		if (!enabled) return { skipped: "disabled" };

		// Scrape all searches, dedupe by URL, drop clearance/defence roles.
		let scraped = [];
		for (const s of SEARCHES) scraped = scraped.concat(await scrapeSearch(s.url));
		const byUrl = new Map();
		for (const j of scraped) {
			if (byUrl.has(j.url)) continue;
			if (CLEARANCE.test(`${j.company} ${j.title} ${j.description}`)) continue;
			byUrl.set(j.url, j);
		}
		const jobs = [...byUrl.values()];

		// "New to me" = URLs the extension hasn't seen on a prior run.
		const seen = await getSeen();
		const freshUrls = [...byUrl.keys()].filter((u) => !seen.has(u));

		// Push to the board (best-effort — notifications still work if the server is down).
		// Use the server's per-job match scores (from both added & enriched) when available.
		const scoreByUrl = {};
		try {
			const res = await fetch(`${base}/api/refresh`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ jobs }),
			});
			if (res.ok) {
				const data = await res.json();
				for (const a of [...(data.added || []), ...(data.enriched || [])]) scoreByUrl[a.url] = a;
			}
		} catch {
			/* server offline — still notify, just without scores */
		}

		const notify = freshUrls.map((url) => {
			const j = byUrl.get(url) || {};
			const s = scoreByUrl[url] || {};
			return { url, title: j.title, company: j.company, matchScore: s.matchScore ?? null };
		});

		await addSeen(jobs.map((j) => j.url));
		await chrome.storage.local.set({
			lastRun: { at: Date.now(), scraped: jobs.length, newCount: notify.length, trigger },
		});
		if (notify.length) await postNotification(notify, base);
		return { scraped: jobs.length, newCount: notify.length };
	} finally {
		running = false;
	}
}

async function postNotification(items, base) {
	const top = items
		.slice()
		.sort((a, b) => (b.matchScore ?? -1) - (a.matchScore ?? -1))
		.slice(0, 4);
	const n = items.length;
	const title = n === 1 ? "1 new regional job on JobTrackr" : `${n} new regional jobs on JobTrackr`;
	const lines = top.map((j) => {
		const score = j.matchScore != null ? ` — ${j.matchScore}% match` : "";
		return `• ${j.title}${j.company ? " · " + j.company : ""}${score}`;
	});
	if (n > top.length) lines.push(`…and ${n - top.length} more`);
	const notifId = `jobtrackr-${Date.now()}`;
	// Clicking opens the board (sorted-by-match) so the user can triage and apply.
	await chrome.storage.local.set({ [`notif_${notifId}`]: base });
	chrome.notifications.create(notifId, {
		type: "basic",
		iconUrl: "icons/icon128.png",
		title,
		message: lines.join("\n"),
		priority: 2,
	});
}

chrome.notifications.onClicked.addListener(async (notifId) => {
	const key = `notif_${notifId}`;
	const { [key]: base } = await chrome.storage.local.get(key);
	await chrome.tabs.create({ url: base || DEFAULT_BASE });
	chrome.notifications.clear(notifId);
	chrome.storage.local.remove(key);
});

// ---- Lifecycle -------------------------------------------------------------

chrome.runtime.onInstalled.addListener(async () => {
	// Default settings on first install (don't clobber existing).
	const cur = await chrome.storage.sync.get("enabled");
	if (cur.enabled === undefined) await chrome.storage.sync.set({ enabled: true });
	await scheduleNext();
});

chrome.runtime.onStartup.addListener(async () => {
	// Catch up if the scheduled Monday slot passed while Chrome was closed.
	const { nextRunAt = 0, lastRun } = await chrome.storage.local.get(["nextRunAt", "lastRun"]);
	const ranRecently = lastRun && Date.now() - lastRun.at < 12 * 3600 * 1000;
	if (nextRunAt && Date.now() >= nextRunAt && !ranRecently) runWeeklyCheck("catchup");
	else if (!(await chrome.alarms.get(ALARM))) await scheduleNext();
});

chrome.alarms.onAlarm.addListener((alarm) => {
	if (alarm.name === ALARM) runWeeklyCheck("alarm");
});

// Popup messages: run a check now, or read status.
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
	if (msg?.type === "checkNow") {
		runWeeklyCheck("manual").then(sendResponse);
		return true; // async response
	}
	if (msg?.type === "status") {
		chrome.storage.local.get(["lastRun", "nextRunAt"]).then(sendResponse);
		return true;
	}
});
