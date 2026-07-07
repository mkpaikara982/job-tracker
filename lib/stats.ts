// Pure client-side aggregation over the application list (fine at personal-tracker scale —
// tens to low-hundreds of records; no server-side GROUP BY needed).

import { type Application, type Status, STATUSES } from "@/lib/types";

export interface Stats {
	total: number;
	byStatus: Record<Status, number>;
	byPlatform: { platform: string; count: number }[];
	regionalCount: number;
	nonRegionalCount: number;
	appliedTotal: number; // reached Applied or beyond
	responseCount: number; // Interview or Offer
	responseRate: number; // % of applied that got a response
	overTime: { date: string; cumulative: number }[]; // cumulative jobs applied to
}

const ACTIVE_APPLIED: Status[] = ["Applied", "Interview", "Offer", "Rejected"];
const RESPONDED: Status[] = ["Interview", "Offer"];

export function computeStats(apps: Application[]): Stats {
	const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<Status, number>;
	const platformCounts = new Map<string, number>();
	let regionalCount = 0;

	for (const a of apps) {
		byStatus[a.status] = (byStatus[a.status] ?? 0) + 1;
		platformCounts.set(a.platform, (platformCounts.get(a.platform) ?? 0) + 1);
		if (a.isRegionalNSW) regionalCount++;
	}

	const appliedTotal = ACTIVE_APPLIED.reduce((n, s) => n + byStatus[s], 0);
	const responseCount = RESPONDED.reduce((n, s) => n + byStatus[s], 0);

	// Cumulative "applied to" over time, bucketed by the day of dateApplied.
	const appliedDates = apps
		.filter((a) => a.dateApplied)
		.map((a) => (a.dateApplied as string).slice(0, 10))
		.sort();
	const overTime: { date: string; cumulative: number }[] = [];
	let running = 0;
	const seen = new Map<string, number>();
	for (const d of appliedDates) {
		running++;
		seen.set(d, running);
	}
	for (const [date, cumulative] of seen) overTime.push({ date, cumulative });

	return {
		total: apps.length,
		byStatus,
		byPlatform: [...platformCounts.entries()].map(([platform, count]) => ({ platform, count })),
		regionalCount,
		nonRegionalCount: apps.length - regionalCount,
		appliedTotal,
		responseCount,
		responseRate: appliedTotal ? Math.round((responseCount / appliedTotal) * 100) : 0,
		overTime,
	};
}
