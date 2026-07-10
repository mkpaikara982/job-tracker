// Batch refresh endpoint: accepts jobs scraped from the user's SEEK saved searches
// (driven by the authenticated browser, since SEEK has no server-callable API) and
// upserts each — enriching existing cards or adding new ones. Returns a summary.
import { NextResponse } from "next/server";
import { type ScrapedJob, upsertScrapedJob } from "@/lib/dataClient";

// Localhost-only single-user tool; wildcard just lets a browser-context caller POST.
const CORS = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "POST, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type",
};

export function OPTIONS() {
	return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(req: Request) {
	let body: { jobs?: ScrapedJob[] };
	try {
		body = (await req.json()) as { jobs?: ScrapedJob[] };
	} catch {
		return NextResponse.json({ error: "invalid JSON" }, { status: 400, headers: CORS });
	}
	if (!Array.isArray(body.jobs)) {
		return NextResponse.json({ error: "expected { jobs: [...] }" }, { status: 400, headers: CORS });
	}

	const summary = { added: 0, enriched: 0, duplicate: 0, skipped: 0 };
	const addedJobs: string[] = [];
	const enrichedJobs: string[] = [];

	for (const job of body.jobs) {
		if (!job?.title?.trim() || !job?.company?.trim()) {
			summary.skipped++;
			continue;
		}
		const { result, application } = await upsertScrapedJob(job);
		summary[result]++;
		if (result === "added") addedJobs.push(`${application.title} — ${application.company}`);
		if (result === "enriched") enrichedJobs.push(`${application.title} — ${application.company}`);
	}

	return NextResponse.json({ summary, addedJobs, enrichedJobs }, { status: 200, headers: CORS });
}
