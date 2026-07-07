import type { Application } from "@/lib/types";

// Small visual indicator of a job's regional-NSW status (the 491-pathway signal).
// A postcode match is confident; a suburb match is inferred (shown with a ~).
export function RegionalBadge({ app }: { app: Pick<Application, "isRegionalNSW" | "regionMatchType" | "state"> }) {
	if (app.isRegionalNSW) {
		const inferred = app.regionMatchType === "suburb";
		return (
			<span
				title={inferred ? "Inferred from suburb name — verify" : "Matched by postcode"}
				className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700"
			>
				📍 {inferred ? "~" : ""}Regional NSW
			</span>
		);
	}
	if (app.regionMatchType !== "none") {
		return (
			<span
				title="Greater Sydney / non-regional — does not count toward the 491 pathway"
				className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500"
			>
				Non-regional
			</span>
		);
	}
	return (
		<span
			title="Couldn't determine region — add a postcode to tag it"
			className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-400"
		>
			Location?
		</span>
	);
}
