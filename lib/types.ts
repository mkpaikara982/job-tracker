// Canonical value sets + TS types shared across the app (and the future browser extension).
// SQLite has no enums, so these arrays are the source of truth for validation.

export const PLATFORMS = ["SEEK", "LinkedIn", "Indeed", "Other"] as const;
export type Platform = (typeof PLATFORMS)[number];

export const STATUSES = ["Saved", "Applied", "Interview", "Offer", "Rejected"] as const;
export type Status = (typeof STATUSES)[number];

export const SOURCES = ["manual", "url-fetch", "extension"] as const;
export type Source = (typeof SOURCES)[number];

export const REGION_MATCH_TYPES = ["postcode", "suburb", "none"] as const;
export type RegionMatchType = (typeof REGION_MATCH_TYPES)[number];

// Statuses that count as an "active response" for the response-rate stat.
export const RESPONSE_STATUSES: Status[] = ["Interview", "Offer"];

// A job application record as used in the UI (dates are ISO strings over the wire).
export interface Application {
	id: string;
	title: string;
	company: string;
	platform: Platform;
	url: string | null;
	location: string | null;
	postcode: string | null;
	state: string | null;
	isRegionalNSW: boolean;
	regionMatchType: RegionMatchType;
	salaryMin: number | null;
	salaryMax: number | null;
	salaryText: string | null;
	status: Status;
	statusOrder: number;
	dateApplied: string | null;
	notes: string | null;
	description: string | null;
	source: Source;
	matchScore: number | null;
	matchedSkills: string[];
	missingSkills: string[];
	createdAt: string;
	updatedAt: string;
}

// Fields accepted when creating/updating an application from the UI.
export interface ApplicationInput {
	title: string;
	company: string;
	platform?: Platform;
	url?: string | null;
	location?: string | null;
	salaryText?: string | null;
	status?: Status;
	dateApplied?: string | null;
	notes?: string | null;
	description?: string | null;
	source?: Source;
}

// The user's resume profile that jobs are scored against.
export interface Profile {
	resumeText: string;
	resumeName: string | null;
	skills: string[];
	updatedAt: string | null;
}

export function isStatus(v: unknown): v is Status {
	return typeof v === "string" && (STATUSES as readonly string[]).includes(v);
}

export function isPlatform(v: unknown): v is Platform {
	return typeof v === "string" && (PLATFORMS as readonly string[]).includes(v);
}

export function isSource(v: unknown): v is Source {
	return typeof v === "string" && (SOURCES as readonly string[]).includes(v);
}

export function isRegionMatchType(v: unknown): v is RegionMatchType {
	return typeof v === "string" && (REGION_MATCH_TYPES as readonly string[]).includes(v);
}
