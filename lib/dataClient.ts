// Data-access layer — the single seam through which the app reads/writes applications.
// Keep raw Prisma calls in here only; UI/API code depends on these functions, so
// swapping SQLite for another store later is a contained change.

import "server-only";
import type { Application as PrismaApplication } from "@prisma/client";
import { prisma } from "@/lib/db";
import { tagLocation } from "@/lib/regional/tagLocation";
import { extractSkills, scoreJob } from "@/lib/scoring/score";
import {
	type Application,
	type ApplicationInput,
	type Profile,
	type Status,
	isPlatform,
	isRegionMatchType,
	isSource,
	isStatus,
} from "@/lib/types";

// Parse a stored JSON-array string back into a string[] (tolerant of null/garbage).
function parseStringArray(raw: string | null): string[] {
	if (!raw) return [];
	try {
		const v = JSON.parse(raw);
		return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
	} catch {
		return [];
	}
}

// Prisma returns Date objects; the app uses ISO strings. Normalize here.
function toApplication(a: PrismaApplication): Application {
	return {
		...a,
		platform: isPlatform(a.platform) ? a.platform : "Other",
		status: isStatus(a.status) ? a.status : "Saved",
		regionMatchType: isRegionMatchType(a.regionMatchType) ? a.regionMatchType : "none",
		source: isSource(a.source) ? a.source : "manual",
		matchedSkills: parseStringArray(a.matchedSkills),
		missingSkills: parseStringArray(a.missingSkills),
		dateApplied: a.dateApplied ? a.dateApplied.toISOString() : null,
		createdAt: a.createdAt.toISOString(),
		updatedAt: a.updatedAt.toISOString(),
	};
}

// The persisted shape of a match score (JSON-encoded skill arrays for SQLite).
type ScoreFields = { matchScore: number | null; matchedSkills: string; missingSkills: string };

// Score a job against the current resume. With no resume on file, jobs stay unscored
// (null) rather than showing a misleading 0%.
async function scoreFields(job: {
	title?: string | null;
	description?: string | null;
	notes?: string | null;
}): Promise<ScoreFields> {
	const skills = await currentResumeSkills();
	if (skills.length === 0) {
		return { matchScore: null, matchedSkills: "[]", missingSkills: "[]" };
	}
	const r = scoreJob(skills, job);
	return {
		matchScore: r.score,
		matchedSkills: JSON.stringify(r.matched),
		missingSkills: JSON.stringify(r.missing),
	};
}

async function currentResumeSkills(): Promise<string[]> {
	const p = await prisma.profile.findUnique({ where: { id: "singleton" } });
	return p ? parseStringArray(p.skills) : [];
}

export async function listApplications(): Promise<Application[]> {
	const rows = await prisma.application.findMany({
		orderBy: [{ statusOrder: "asc" }, { createdAt: "desc" }],
	});
	return rows.map(toApplication);
}

// Look up an application by its source URL — used by the extension to avoid
// saving the same job twice.
export async function findApplicationByUrl(url: string): Promise<Application | null> {
	const trimmed = url.trim();
	if (!trimmed) return null;
	const row = await prisma.application.findFirst({ where: { url: trimmed } });
	return row ? toApplication(row) : null;
}

export async function createApplication(input: ApplicationInput): Promise<Application> {
	const status: Status = isStatus(input.status) ? input.status : "Saved";
	const tag = tagLocation(input.location);
	const title = input.title.trim();
	const description = input.description?.trim() || null;
	const notes = input.notes?.trim() || null;
	const score = await scoreFields({ title, description, notes });

	// Place at the end of its kanban column.
	const last = await prisma.application.findFirst({
		where: { status },
		orderBy: { statusOrder: "desc" },
		select: { statusOrder: true },
	});

	const created = await prisma.application.create({
		data: {
			title,
			company: input.company.trim(),
			platform: isPlatform(input.platform) ? input.platform : "SEEK",
			url: input.url?.trim() || null,
			location: input.location?.trim() || null,
			postcode: tag.postcode,
			state: tag.state,
			isRegionalNSW: tag.isRegionalNSW,
			regionMatchType: tag.regionMatchType,
			salaryText: input.salaryText?.trim() || null,
			status,
			statusOrder: (last?.statusOrder ?? -1) + 1,
			dateApplied: input.dateApplied
				? new Date(input.dateApplied)
				: status === "Applied"
					? new Date()
					: null,
			notes,
			description,
			...score,
			source: input.source ?? "manual",
			history: { create: { fromStatus: null, toStatus: status } },
		},
	});
	return toApplication(created);
}

export async function updateApplication(
	id: string,
	input: Partial<ApplicationInput>,
): Promise<Application> {
	const existing = await prisma.application.findUniqueOrThrow({ where: { id } });
	const nextStatus: Status = isStatus(input.status) ? input.status : (existing.status as Status);
	const statusChanged = input.status !== undefined && nextStatus !== existing.status;

	// Re-tag if location changed.
	const tag = input.location !== undefined ? tagLocation(input.location) : null;

	// Re-score if any scored field (title, description, notes) changed.
	const scoreFieldChanged =
		input.title !== undefined || input.description !== undefined || input.notes !== undefined;
	const score = scoreFieldChanged
		? await scoreFields({
				title: input.title !== undefined ? input.title : existing.title,
				description: input.description !== undefined ? input.description : existing.description,
				notes: input.notes !== undefined ? input.notes : existing.notes,
			})
		: null;

	const updated = await prisma.application.update({
		where: { id },
		data: {
			title: input.title?.trim(),
			company: input.company?.trim(),
			platform: isPlatform(input.platform) ? input.platform : undefined,
			url: input.url !== undefined ? input.url?.trim() || null : undefined,
			salaryText: input.salaryText !== undefined ? input.salaryText?.trim() || null : undefined,
			notes: input.notes !== undefined ? input.notes?.trim() || null : undefined,
			description:
				input.description !== undefined ? input.description?.trim() || null : undefined,
			...(score ?? {}),
			status: input.status !== undefined ? nextStatus : undefined,
			...(tag && {
				location: input.location?.trim() || null,
				postcode: tag.postcode,
				state: tag.state,
				isRegionalNSW: tag.isRegionalNSW,
				regionMatchType: tag.regionMatchType,
			}),
			// Stamp dateApplied the first time it reaches "Applied".
			...(statusChanged &&
				nextStatus === "Applied" &&
				!existing.dateApplied && { dateApplied: new Date() }),
			...(statusChanged && {
				history: { create: { fromStatus: existing.status, toStatus: nextStatus } },
			}),
		},
	});
	return toApplication(updated);
}

// Move a card within/between kanban columns.
export async function moveApplication(
	id: string,
	toStatus: Status,
	statusOrder: number,
): Promise<Application> {
	const existing = await prisma.application.findUniqueOrThrow({ where: { id } });
	const statusChanged = toStatus !== existing.status;
	const updated = await prisma.application.update({
		where: { id },
		data: {
			status: toStatus,
			statusOrder,
			...(statusChanged &&
				toStatus === "Applied" &&
				!existing.dateApplied && { dateApplied: new Date() }),
			...(statusChanged && {
				history: { create: { fromStatus: existing.status, toStatus } },
			}),
		},
	});
	return toApplication(updated);
}

export async function deleteApplication(id: string): Promise<void> {
	await prisma.application.delete({ where: { id } });
}

// ---- Resume profile + scoring ----

const EMPTY_PROFILE: Profile = { resumeText: "", resumeName: null, skills: [], updatedAt: null };

export async function getProfile(): Promise<Profile> {
	const p = await prisma.profile.findUnique({ where: { id: "singleton" } });
	if (!p) return EMPTY_PROFILE;
	return {
		resumeText: p.resumeText,
		resumeName: p.resumeName,
		skills: parseStringArray(p.skills),
		updatedAt: p.updatedAt.toISOString(),
	};
}

// Save/replace the resume, derive its skills, then re-score every job against it.
export async function saveResume(resumeText: string, resumeName: string | null): Promise<Profile> {
	const text = resumeText.trim();
	const skills = extractSkills(text);
	await prisma.profile.upsert({
		where: { id: "singleton" },
		create: { id: "singleton", resumeText: text, resumeName, skills: JSON.stringify(skills) },
		update: { resumeText: text, resumeName, skills: JSON.stringify(skills) },
	});
	await rescoreAll();
	return getProfile();
}

// Recompute matchScore for every application using the current resume. Returns the
// number of applications scored. Used after a resume change or on demand.
export async function rescoreAll(): Promise<number> {
	const skills = await currentResumeSkills();
	const rows = await prisma.application.findMany();
	// Apply all updates in one transaction so a mid-loop failure can't leave a
	// half-rescored board.
	const updates = rows.map((a) => {
		const r =
			skills.length === 0
				? { score: null, matched: [] as string[], missing: [] as string[] }
				: scoreJob(skills, { title: a.title, description: a.description, notes: a.notes });
		return prisma.application.update({
			where: { id: a.id },
			data: {
				matchScore: r.score,
				matchedSkills: JSON.stringify(r.matched),
				missingSkills: JSON.stringify(r.missing),
			},
		});
	});
	await prisma.$transaction(updates);
	return rows.length;
}
