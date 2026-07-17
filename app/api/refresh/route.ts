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
	const brief = (a: { title: string; company: string; url: string | null; matchScore: number | null; isRegionalNSW: boolean }) => ({
		title: a.title,
		company: a.company,
		url: a.url,
		matchScore: a.matchScore,
		isRegionalNSW: a.isRegionalNSW,
	});
	const added: ReturnType<typeof brief>[] = [];
	const enriched: ReturnType<typeof brief>[] = [];

	for (const job of body.jobs) {
		if (!job?.title?.trim() || !job?.company?.trim()) {
			summary.skipped++;
			continue;
		}
		const { result, application } = await upsertScrapedJob(job);
		summary[result]++;
		if (result === "added") added.push(brief(application));
		if (result === "enriched") enriched.push(brief(application));
	}

	return NextResponse.json({ summary, added, enriched }, { status: 200, headers: CORS });
}
