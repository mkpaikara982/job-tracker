import type { Application } from "@/lib/types";

// Colour bands for a 0-100 resume-match score.
function bandStyle(score: number): string {
	if (score >= 70) return "bg-emerald-100 text-emerald-700";
	if (score >= 40) return "bg-amber-100 text-amber-700";
	return "bg-rose-100 text-rose-600";
}

// A small pill showing how well the resume matches this job. Null score (no resume,
// or no detectable skills in the posting) renders nothing to avoid noise.
export function MatchBadge({ app }: { app: Application }) {
	if (app.matchScore == null) return null;
	const title = [
		app.matchedSkills.length ? `Matches: ${app.matchedSkills.join(", ")}` : null,
		app.missingSkills.length ? `Missing: ${app.missingSkills.join(", ")}` : null,
	]
		.filter(Boolean)
		.join("\n");
	return (
		<span
			className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${bandStyle(app.matchScore)}`}
			title={title || undefined}
		>
			{app.matchScore}% match
		</span>
	);
}
