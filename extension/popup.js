// JobTrackr popup — scrapes the active job page, shows an editable preview, and
// POSTs it to the locally-running JobTrackr app (/api/ingest). The server does the
// authoritative regional-NSW tagging and URL-dedupe.

const DEFAULT_BASE = "http://localhost:3000";
const PLATFORMS = ["SEEK", "LinkedIn", "Indeed", "Other"]; // must match lib/types.ts

const $ = (id) => document.getElementById(id);
const els = {
	platform: $("platform"),
	title: $("title"),
	company: $("company"),
	location: $("location"),
	salary: $("salary"),
	save: $("save"),
	status: $("status"),
	gear: $("gear"),
	settings: $("settings"),
	baseUrl: $("baseUrl"),
	saveSettings: $("saveSettings"),
};

let scrapedUrl = ""; // canonical job URL captured at scrape time
let scrapedPlatform = "Other"; // validated platform captured at scrape time
let scrapedDescription = ""; // job-description body captured at scrape time (for scoring)

function setStatus(msg, kind) {
	els.status.textContent = msg;
	els.status.className = "status" + (kind ? " " + kind : "");
}

async function getBaseUrl() {
	const { baseUrl } = await chrome.storage.sync.get("baseUrl");
	return (baseUrl || DEFAULT_BASE).replace(/\/+$/, "");
}

// ---- In-page extractor. Runs in the job page's context (serialized by
// chrome.scripting.executeScript), so it must be fully self-contained. ----
function extractJob() {
	const host = location.hostname;
	const text = (sel) => {
		const el = document.querySelector(sel);
		return el && el.textContent ? el.textContent.trim() : "";
	};
	// Read the first matching element's visible text, whitespace-collapsed and capped
	// (job descriptions can be long — 8k chars is plenty for keyword scoring).
	const bodyText = (sel) => {
		const el = document.querySelector(sel);
		const t = el && el.innerText ? el.innerText : "";
		return t.replace(/\s+\n/g, "\n").replace(/[ \t]{2,}/g, " ").trim().slice(0, 8000);
	};
	const metaProp = (p) => {
		const m = document.querySelector(`meta[property="${p}"]`);
		return m ? m.content : "";
	};
	const canonical = () => {
		const l = document.querySelector('link[rel="canonical"]');
		return (l && l.href) || metaProp("og:url") || location.href.split(/[?#]/)[0];
	};

	// JSON-LD JobPosting — present on many LinkedIn/Indeed public pages.
	let ld = null;
	for (const s of document.querySelectorAll('script[type="application/ld+json"]')) {
		try {
			const parsed = JSON.parse(s.textContent);
			const arr = Array.isArray(parsed) ? parsed : parsed["@graph"] || [parsed];
			for (const it of arr) if (it && it["@type"] === "JobPosting") ld = it;
		} catch {
			/* ignore malformed blocks */
		}
	}
	const ldLocation = (jp) => {
		if (!jp || !jp.jobLocation) return "";
		const loc = Array.isArray(jp.jobLocation) ? jp.jobLocation[0] : jp.jobLocation;
		const a = loc && loc.address;
		if (!a) return "";
		if (typeof a === "string") return a;
		return [a.addressLocality, a.addressRegion, a.postalCode].filter(Boolean).join(" ");
	};
	const ldSalary = (jp) => {
		const b = jp && jp.baseSalary;
		if (!b) return "";
		const v = b.value || b;
		const parts = [v.minValue, v.maxValue].filter((n) => n != null);
		if (!parts.length) return "";
		const unit = (v.unitText || "").toLowerCase();
		return parts.join(" – ") + (b.currency ? " " + b.currency : "") + (unit ? " /" + unit : "");
	};

	let platform = "Other";
	let title = "";
	let company = "";
	let locationStr = "";
	let salary = "";
	let description = "";

	if (host.includes("seek.com")) {
		platform = "SEEK";
		title = text('[data-automation="job-detail-title"]');
		company = text('[data-automation="advertiser-name"]');
		locationStr = text('[data-automation="job-detail-location"]');
		salary = text('[data-automation="job-detail-salary"]');
		description = bodyText('[data-automation="jobAdDetails"]');
	} else if (host.includes("linkedin.com")) {
		platform = "LinkedIn";
		title = text(
			".job-details-jobs-unified-top-card__job-title, .jobs-unified-top-card__job-title, .top-card-layout__title, .topcard__title",
		);
		company = text(
			".job-details-jobs-unified-top-card__company-name a, .job-details-jobs-unified-top-card__company-name, .topcard__org-name-link, .topcard__flavor",
		);
		// Logged-in LinkedIn puts the location as the first "·"-separated segment of the
		// top-card description line; public/guest pages still use the older bullet class.
		const liDesc = text(
			".job-details-jobs-unified-top-card__primary-description-container, .job-details-jobs-unified-top-card__tertiary-description-container, .jobs-unified-top-card__primary-description, .jobs-unified-top-card__subtitle-primary-grouping",
		);
		locationStr = liDesc
			? liDesc.split("·")[0].replace(/\s+/g, " ").trim()
			: text(".topcard__flavor--bullet, .jobs-unified-top-card__bullet");
		description = bodyText(
			"#job-details, .jobs-description__content, .jobs-box__html-content, .jobs-description-content__text, .show-more-less-html__markup, .description__text",
		);
	} else if (host.includes("indeed.com")) {
		platform = "Indeed";
		title = text('[data-testid="jobsearch-JobInfoHeader-title"], .jobsearch-JobInfoHeader-title');
		company = text(
			'[data-testid="inlineHeader-companyName"], [data-company-name="true"], .jobsearch-CompanyInfoContainer a',
		);
		locationStr = text(
			'[data-testid="inlineHeader-companyLocation"], [data-testid="job-location"], [data-testid="jobsearch-JobInfoHeader-companyLocation"]',
		);
		description = bodyText('#jobDescriptionText, [data-testid="jobsearch-JobComponent-description"]');
	}

	// Fill any gaps from JSON-LD, then meta/title.
	if (ld) {
		title = title || ld.title || "";
		company = company || (ld.hiringOrganization && ld.hiringOrganization.name) || "";
		locationStr = locationStr || ldLocation(ld);
		salary = salary || ldSalary(ld);
		// JSON-LD description is HTML — strip tags to plain text as a fallback.
		if (!description && ld.description) {
			const tmp = document.createElement("div");
			tmp.innerHTML = ld.description;
			description = (tmp.textContent || "").replace(/[ \t]{2,}/g, " ").trim().slice(0, 8000);
		}
	}
	title = title || metaProp("og:title") || document.title || "";
	// Strip trailing site suffixes from meta/title fallbacks (e.g. "… Job in X - SEEK").
	title = title.replace(/\s*[-|]\s*(SEEK|LinkedIn|Indeed).*$/i, "").trim();

	let url = canonical();
	// LinkedIn's split-pane search view reports the search page as canonical, not the
	// open job — recover the real job URL from the currentJobId query param if present.
	if (platform === "LinkedIn") {
		const m = location.href.match(/currentJobId=(\d+)/);
		if (m) url = `https://www.linkedin.com/jobs/view/${m[1]}/`;
	}

	return {
		platform,
		title: title.trim(),
		company: company.trim(),
		location: locationStr.trim(),
		salaryText: salary.trim(),
		description: description.trim(),
		url,
	};
}

async function scrapeActiveTab() {
	const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
	if (!tab || !tab.id || !/^https?:/.test(tab.url || "")) {
		setStatus("Open a job page on SEEK, LinkedIn, or Indeed, then click the icon.", "warn");
		return null;
	}
	try {
		const [{ result }] = await chrome.scripting.executeScript({
			target: { tabId: tab.id },
			func: extractJob,
		});
		return result;
	} catch {
		setStatus("Can't read this page (it may block extensions). Fill the fields in manually.", "warn");
		return { platform: "Other", title: "", company: "", location: "", salaryText: "", url: tab.url };
	}
}

function fillForm(job) {
	scrapedPlatform = PLATFORMS.includes(job.platform) ? job.platform : "Other";
	els.platform.textContent = scrapedPlatform !== "Other" ? scrapedPlatform : "Unknown site";
	els.title.value = job.title || "";
	els.company.value = job.company || "";
	els.location.value = job.location || "";
	els.salary.value = job.salaryText || "";
	scrapedUrl = job.url || "";
	scrapedDescription = job.description || "";
	if (!job.title && !job.company) {
		setStatus("Couldn't detect a job here — fill in the details and save.", "warn");
	} else if (scrapedDescription) {
		setStatus(`Job description captured (${scrapedDescription.length} chars) — will be scored.`, "ok");
	}
}

async function save() {
	const title = els.title.value.trim();
	const company = els.company.value.trim();
	if (!title || !company) {
		setStatus("Job title and company are required.", "err");
		return;
	}

	const payload = {
		title,
		company,
		platform: scrapedPlatform, // validated against PLATFORMS at scrape time
		location: els.location.value.trim() || null,
		salaryText: els.salary.value.trim() || null,
		description: scrapedDescription || null,
		url: scrapedUrl || null,
		source: "extension",
	};

	els.save.disabled = true;
	setStatus("Saving…", "");
	const base = await getBaseUrl();
	try {
		const res = await fetch(`${base}/api/ingest`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
		});
		const data = await res.json().catch(() => ({}));
		if (!res.ok) {
			setStatus(data.error || `Save failed (HTTP ${res.status}).`, "err");
			els.save.disabled = false;
			return;
		}
		const app = data.application || {};
		const regional = app.isRegionalNSW ? " · Regional NSW ✅" : "";
		if (data.result === "duplicate") {
			// Already saved — nothing more to do here, but re-enable so it's not a dead-end.
			setStatus(`Already on your board${regional}.`, "warn");
			els.save.disabled = false;
		} else {
			// Leave the button disabled after a successful create to prevent double-saves;
			// the popup is ephemeral and reopens fresh next time.
			setStatus(`Saved ✓${regional}`, "ok");
		}
	} catch {
		setStatus(`Couldn't reach JobTrackr at ${base}. Is the dev server running?`, "err");
		els.save.disabled = false;
	}
}

// ---- Settings ----
async function initSettings() {
	els.baseUrl.value = await getBaseUrl();
	els.gear.addEventListener("click", () => els.settings.classList.toggle("hidden"));
	els.saveSettings.addEventListener("click", async () => {
		const url = els.baseUrl.value.trim().replace(/\/+$/, "") || DEFAULT_BASE;
		await chrome.storage.sync.set({ baseUrl: url });
		els.settings.classList.add("hidden");
		setStatus("Settings saved.", "ok");
	});
}

async function init() {
	await initSettings();
	els.save.addEventListener("click", save);
	const job = await scrapeActiveTab();
	if (job) fillForm(job);
}

document.addEventListener("DOMContentLoaded", init);
