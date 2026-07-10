// Seed the resume profile from a local .docx/.txt file, then score every job.
// Usage: node scripts/seed-resume.mjs "<path-to-resume>" [baseUrl]
// The dev server must be running (default http://localhost:3000).
import { readFile } from "node:fs/promises";
import path from "node:path";
import mammoth from "mammoth";

const filePath =
	process.argv[2] || "E:/Job Application/Resume/Manish_Paikara_Updated_Resume.docx";
const base = (process.argv[3] || "http://localhost:3000").replace(/\/+$/, "");

async function extract(file) {
	const buf = await readFile(file);
	if (file.toLowerCase().endsWith(".docx")) {
		const { value } = await mammoth.extractRawText({ buffer: buf });
		return value.trim();
	}
	return buf.toString("utf8").trim();
}

const resumeText = await extract(filePath);
const resumeName = path.basename(filePath);
console.log(`Extracted ${resumeText.length} chars from ${resumeName}`);

const res = await fetch(`${base}/api/profile`, {
	method: "POST",
	headers: { "Content-Type": "application/json" },
	body: JSON.stringify({ resumeText, resumeName }),
});
const data = await res.json();
if (!res.ok) {
	console.error("Failed:", data);
	process.exit(1);
}
console.log(`Saved resume "${data.resumeName}" — ${data.skills.length} skills detected:`);
console.log(data.skills.join(", "));
