// Ingest endpoint for the companion browser extension.
// The extension scrapes a job page and POSTs an ApplicationInput here. This route
// mirrors POST /api/applications but adds (a) permissive CORS so a chrome-extension://
// origin can call it, and (b) URL-based dedupe so re-saving the same job is a no-op.
import { NextResponse } from "next/server";
import { createApplication, findApplicationByUrl } from "@/lib/dataClient";
import type { ApplicationInput } from "@/lib/types";

// This is a local, single-user dev tool — the API only listens on localhost, so a
// wildcard origin here just lets the (localhost-scoped) extension talk to it.
const CORS = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "POST, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type",
};

export function OPTIONS() {
	return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(req: Request) {
	let body: ApplicationInput;
	try {
		body = (await req.json()) as ApplicationInput;
	} catch {
		return NextResponse.json({ error: "invalid JSON" }, { status: 400, headers: CORS });
	}

	if (!body?.title?.trim() || !body?.company?.trim()) {
		return NextResponse.json(
			{ error: "title and company are required" },
			{ status: 400, headers: CORS },
		);
	}

	// Dedupe on the job URL so clicking "Save" twice doesn't create duplicates.
	if (body.url?.trim()) {
		const existing = await findApplicationByUrl(body.url);
		if (existing) {
			return NextResponse.json(
				{ result: "duplicate", application: existing },
				{ status: 200, headers: CORS },
			);
		}
	}

	const application = await createApplication({ ...body, source: "extension" });
	return NextResponse.json({ result: "created", application }, { status: 201, headers: CORS });
}
