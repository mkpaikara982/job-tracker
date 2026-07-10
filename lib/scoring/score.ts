// Resume-match scoring — v1: deterministic, offline keyword overlap.
// A job's keywords (from its title + description + notes) are matched against the
// user's resume skills. The score is the resume's coverage of the job's demanded
// skills, with skills in the JOB TITLE weighted higher (they signal the core role).
//
// Pure and dependency-free so it runs identically on the server and in seed scripts.
// Structured to let a v2 semantic (LLM) scorer slot in behind the same interface.

import { SKILLS, type SkillDef } from "@/lib/scoring/skills";

const TITLE_WEIGHT = 3; // a skill named in the title counts 3x a body-only skill

// Build a matcher for one alias. Alphanumeric-bounded terms use word boundaries; the
// left boundary also rejects a preceding "." so a short alias like "js" can't match the
// tail of a dotted identifier ("Node.js" must not count as JavaScript). Symbol terms
// (c++, c#, .net, ci/cd) can't rely on \b, so they use "not a word char" lookarounds.
function aliasRegex(alias: string): RegExp {
	const esc = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const startsWord = /^[a-z0-9]/i.test(alias);
	const endsWord = /[a-z0-9]$/i.test(alias);
	const left = startsWord ? "(?<![\\w.])" : "(?<![\\w#+])";
	const right = endsWord ? "(?![\\w])" : "(?![\\w#+])";
	return new RegExp(`${left}${esc}${right}`, "i");
}

// The search terms for a skill: its explicit override if given, else canonical + aliases.
// (Overrides drop ambiguous bare tokens like "go"/"c" that collide with plain English.)
function searchTerms(def: SkillDef): string[] {
	return def.matchTerms ?? [def.canonical, ...def.aliases];
}

// Precompile once: canonical -> list of alias regexes.
const COMPILED: { def: SkillDef; res: RegExp[] }[] = SKILLS.map((def) => ({
	def,
	res: searchTerms(def).map(aliasRegex),
}));

// Return the canonical skills present anywhere in `text`.
export function extractSkills(text: string): string[] {
	if (!text?.trim()) return [];
	const found: string[] = [];
	for (const { def, res } of COMPILED) {
		if (res.some((re) => re.test(text))) found.push(def.canonical);
	}
	return found;
}

export interface JobText {
	title?: string | null;
	description?: string | null;
	notes?: string | null;
}

export interface ScoreResult {
	score: number | null; // 0-100, or null when the job has no detectable skills to score against
	matched: string[]; // resume skills the job asks for
	missing: string[]; // job skills absent from the resume
}

// Score how well `resumeSkills` covers the skills demanded by a job.
export function scoreJob(resumeSkills: string[], job: JobText): ScoreResult {
	const titleSkills = new Set(extractSkills(job.title ?? ""));
	const bodySkills = extractSkills(`${job.description ?? ""}\n${job.notes ?? ""}`);
	const jobSkills = new Set<string>([...titleSkills, ...bodySkills]);

	// Nothing recognisable in the posting — can't score honestly (usually a
	// title-only job with no description captured yet).
	if (jobSkills.size === 0) return { score: null, matched: [], missing: [] };

	const resume = new Set(resumeSkills);
	const weightOf = (skill: string) => (titleSkills.has(skill) ? TITLE_WEIGHT : 1);

	let total = 0;
	let hit = 0;
	const matched: string[] = [];
	const missing: string[] = [];
	for (const skill of jobSkills) {
		const w = weightOf(skill);
		total += w;
		if (resume.has(skill)) {
			hit += w;
			matched.push(skill);
		} else {
			missing.push(skill);
		}
	}

	return { score: Math.round((hit / total) * 100), matched, missing };
}
