// Resume file → plain text extraction (server-only). Supports .docx (via mammoth)
// and plain .txt; other types should be pasted as text instead.
import "server-only";
import mammoth from "mammoth";

export async function extractResumeText(buffer: Buffer, filename: string): Promise<string> {
	const lower = filename.toLowerCase();
	if (lower.endsWith(".docx")) {
		const { value } = await mammoth.extractRawText({ buffer });
		return value.trim();
	}
	if (lower.endsWith(".txt") || lower.endsWith(".md")) {
		return buffer.toString("utf8").trim();
	}
	throw new Error("Unsupported file type — upload a .docx or .txt, or paste the text.");
}
