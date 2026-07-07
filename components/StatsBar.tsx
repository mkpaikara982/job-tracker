"use client";

import { useMemo } from "react";
import {
	CartesianGrid,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { type Application, STATUSES, type Status } from "@/lib/types";
import { computeStats } from "@/lib/stats";

const STATUS_COLORS: Record<Status, string> = {
	Saved: "#94a3b8",
	Applied: "#3b82f6",
	Interview: "#f59e0b",
	Offer: "#22c55e",
	Rejected: "#f43f5e",
};

export function StatsBar({ apps }: { apps: Application[] }) {
	const stats = useMemo(() => computeStats(apps), [apps]);

	return (
		<section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
			{/* KPI tiles */}
			<div className="grid grid-cols-2 gap-3 lg:col-span-1">
				<Tile label="Total tracked" value={stats.total} />
				<Tile label="Applied+" value={stats.appliedTotal} />
				<Tile label="Response rate" value={`${stats.responseRate}%`} hint="Interview or Offer ÷ applied" />
				<Tile
					label="Regional NSW"
					value={stats.regionalCount}
					hint={`${stats.nonRegionalCount} non-regional`}
					accent="emerald"
				/>
			</div>

			{/* Pipeline distribution */}
			<div className="rounded-xl border border-slate-200 bg-white p-4 lg:col-span-1">
				<h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pipeline</h3>
				<div className="mt-3 flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
					{STATUSES.map((s) =>
						stats.byStatus[s] > 0 ? (
							<div
								key={s}
								style={{
									width: `${(stats.byStatus[s] / Math.max(stats.total, 1)) * 100}%`,
									background: STATUS_COLORS[s],
								}}
								title={`${s}: ${stats.byStatus[s]}`}
							/>
						) : null,
					)}
				</div>
				<ul className="mt-3 space-y-1">
					{STATUSES.map((s) => (
						<li key={s} className="flex items-center justify-between text-xs">
							<span className="flex items-center gap-2 text-slate-600">
								<span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_COLORS[s] }} />
								{s}
							</span>
							<span className="font-medium text-slate-700">{stats.byStatus[s]}</span>
						</li>
					))}
				</ul>
			</div>

			{/* Applications over time */}
			<div className="rounded-xl border border-slate-200 bg-white p-4 lg:col-span-1">
				<h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
					Applications over time
				</h3>
				{stats.overTime.length >= 2 ? (
					<div className="mt-2 h-[140px]">
						<ResponsiveContainer width="100%" height="100%">
							<LineChart data={stats.overTime} margin={{ top: 5, right: 8, bottom: 0, left: -20 }}>
								<CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
								<XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
								<YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
								<Tooltip />
								<Line type="monotone" dataKey="cumulative" stroke="#3b82f6" strokeWidth={2} dot={false} />
							</LineChart>
						</ResponsiveContainer>
					</div>
				) : (
					<p className="mt-6 text-center text-xs text-slate-400">
						Mark jobs as “Applied” to see your momentum here.
					</p>
				)}
			</div>
		</section>
	);
}

function Tile({
	label,
	value,
	hint,
	accent,
}: {
	label: string;
	value: string | number;
	hint?: string;
	accent?: "emerald";
}) {
	return (
		<div className="rounded-xl border border-slate-200 bg-white p-4">
			<p className="text-xs font-medium text-slate-500">{label}</p>
			<p className={`mt-1 text-2xl font-bold ${accent === "emerald" ? "text-emerald-600" : "text-slate-800"}`}>
				{value}
			</p>
			{hint && <p className="mt-0.5 text-[10px] text-slate-400">{hint}</p>}
		</div>
	);
}
