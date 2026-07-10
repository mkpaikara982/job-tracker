// Re-score every application against the current resume on demand.
import { NextResponse } from "next/server";
import { rescoreAll } from "@/lib/dataClient";

export async function POST() {
	try {
		const rescored = await rescoreAll();
		return NextResponse.json({ rescored });
	} catch {
		return NextResponse.json({ error: "Rescore failed." }, { status: 500 });
	}
}
