// Resume profile endpoint.
//   GET  → current profile (resume name, skills, updatedAt)
//   POST → save resume. Accepts either a multipart file upload (field "file") or a
//          JSON body { resumeText, resumeName }. Saving re-scores every job.
import { NextResponse } from "next/server";
import { getProfile, saveResume } from "@/lib/dataClient";
import { extractResumeText } from "@/lib/resume";

export async function GET() {
	return NextResponse.json(await getProfile());
}

export async function POST(req: Request) {
	const contentType = req.headers.get("content-type") ?? "";
	try {
		let resumeText = "";
		let resumeName: string | null = null;

		if (contentType.includes("multipart/form-data")) {
			const form = await req.formData();
			const file = form.get("file");
			if (!(file instanceof File)) {
				return NextResponse.json({ error: "No file provided." }, { status: 400 });
			}
			resumeName = file.name;
			resumeText = await extractResumeText(Buffer.from(await file.arrayBuffer()), file.name);
		} else {
			const body = (await req.json()) as { resumeText?: string; resumeName?: string };
			resumeText = (body.resumeText ?? "").trim();
			resumeName = body.resumeName?.trim() || null;
		}

		if (!resumeText) {
			return NextResponse.json({ error: "Resume text is empty." }, { status: 400 });
		}
		const profile = await saveResume(resumeText, resumeName);
		return NextResponse.json(profile, { status: 200 });
	} catch (err) {
		const message = err instanceof Error ? err.message : "Failed to save resume.";
		return NextResponse.json({ error: message }, { status: 400 });
	}
}
