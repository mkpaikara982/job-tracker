import { NextResponse } from "next/server";
import { createApplication, listApplications } from "@/lib/dataClient";
import type { ApplicationInput } from "@/lib/types";

export async function GET() {
	const apps = await listApplications();
	return NextResponse.json(apps);
}

export async function POST(req: Request) {
	const body = (await req.json()) as ApplicationInput;
	if (!body?.title?.trim() || !body?.company?.trim()) {
		return NextResponse.json({ error: "title and company are required" }, { status: 400 });
	}
	const app = await createApplication(body);
	return NextResponse.json(app, { status: 201 });
}
