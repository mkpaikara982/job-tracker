"use client";

import { PLATFORMS } from "@/lib/types";

export interface Filters {
	search: string;
	platform: string; // "All" | Platform
	regionalOnly: boolean;
}

export const EMPTY_FILTERS: Filters = { search: "", platform: "All", regionalOnly: false };

export function isFiltering(f: Filters): boolean {
	return f.search.trim() !== "" || f.platform !== "All" || f.regionalOnly;
}

export function FilterBar({
	filters,
	onChange,
}: {
	filters: Filters;
	onChange: (f: Filters) => void;
}) {
	return (
		<div className="flex flex-wrap items-center gap-2">
			<input
				value={filters.search}
				onChange={(e) => onChange({ ...filters, search: e.target.value })}
				placeholder="Search title, company, location…"
				className="input max-w-xs flex-1"
			/>
			<select
				value={filters.platform}
				onChange={(e) => onChange({ ...filters, platform: e.target.value })}
				className="input w-auto"
			>
				<option value="All">All platforms</option>
				{PLATFORMS.map((p) => (
					<option key={p} value={p}>
						{p}
					</option>
				))}
			</select>
			<label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600">
				<input
					type="checkbox"
					checked={filters.regionalOnly}
					onChange={(e) => onChange({ ...filters, regionalOnly: e.target.checked })}
					className="accent-emerald-600"
				/>
				Regional NSW only
			</label>
			{isFiltering(filters) && (
				<button
					onClick={() => onChange(EMPTY_FILTERS)}
					className="text-sm text-slate-500 hover:text-slate-700 hover:underline"
				>
					Clear
				</button>
			)}
		</div>
	);
}
