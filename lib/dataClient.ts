// Data-access layer — the single seam through which the app reads/writes applications.
// Keep raw Prisma calls in here only; UI/API code depends on these functions, so
// swapping SQLite for another store later is a contained change.

import "server-only";
import type { Application as PrismaApplication } from "@prisma/client";
import { prisma } from "@/lib/db";
import { tagLocation } from "@/lib/regional/tagLocation";
import {
	type Application,
	type ApplicationInput,
	type Status,
	isPlatform,
	isRegionMatchType,
	isSource,
	isStatus,
} from "@/lib/types";

// Prisma returns Date objects; the app uses ISO strings. Normalize here.
function toApplication(a: PrismaApplication): Application {
	return {
		...a,
		platform: isPlatform(a.platform) ? a.platform : "Other",
		status: isStatus(a.status) ? a.status : "Saved",
		regionMatchType: isRegionMatchType(a.regionMatchType) ? a.regionMatchType : "none",
		source: isSource(a.source) ? a.source : "manual",
		dateApplied: a.dateApplied ? a.dateApplied.toISOString() : null,
		createdAt: a.createdAt.toISOString(),
		updatedAt: a.updatedAt.toISOString(),
	};
}

export async function listApplications(): Promise<Application[]> {
	const rows = await prisma.application.findMany({
		orderBy: [{ statusOrder: "asc" }, { createdAt: "desc" }],
	});
	return rows.map(toApplication);
}

export async function createApplication(input: ApplicationInput): Promise<Application> {
	const status: Status = isStatus(input.status) ? input.status : "Saved";
	const tag = tagLocation(input.location);

	// Place at the end of its kanban column.
	const last = await prisma.application.findFirst({
		where: { status },
		orderBy: { statusOrder: "desc" },
		select: { statusOrder: true },
	});

	const created = await prisma.application.create({
		data: {
			title: input.title.trim(),
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
			notes: input.notes?.trim() || null,
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

	const updated = await prisma.application.update({
		where: { id },
		data: {
			title: input.title?.trim(),
			company: input.company?.trim(),
			platform: isPlatform(input.platform) ? input.platform : undefined,
			url: input.url !== undefined ? input.url?.trim() || null : undefined,
			salaryText: input.salaryText !== undefined ? input.salaryText?.trim() || null : undefined,
			notes: input.notes !== undefined ? input.notes?.trim() || null : undefined,
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
