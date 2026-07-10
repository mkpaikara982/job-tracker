"use client";

import { useEffect, useMemo, useState } from "react";
import {
	type Application,
	type ApplicationInput,
	type Profile,
	STATUSES,
	type Status,
} from "@/lib/types";
import { apiCreate, apiDelete, apiGetProfile, apiList, apiMove, apiUpdate } from "@/lib/apiClient";
import { AddApplicationModal } from "@/components/AddApplicationModal";
import { Board } from "@/components/Board";
import { StatsBar } from "@/components/StatsBar";
import { ResumePanel } from "@/components/ResumePanel";
import { EMPTY_FILTERS, type Filters, FilterBar, isFiltering } from "@/components/FilterBar";

function groupByStatus(apps: Application[], sortByMatch: boolean): Record<Status, Application[]> {
	const cols = Object.fromEntries(STATUSES.map((s) => [s, [] as Application[]])) as Record<Status, Application[]>;
	for (const a of apps) cols[a.status].push(a);
	for (const s of STATUSES)
		cols[s].sort((x, y) =>
			sortByMatch
				? (y.matchScore ?? -1) - (x.matchScore ?? -1) || x.statusOrder - y.statusOrder
				: x.statusOrder - y.statusOrder || x.createdAt.localeCompare(y.createdAt),
		);
	return cols;
}

export function TrackerApp({ initial }: { initial: Application[] }) {
	const [apps, setApps] = useState<Application[]>(initial);
	const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
	const [modalOpen, setModalOpen] = useState(false);
	const [editing, setEditing] = useState<Application | null>(null);
	const [profile, setProfile] = useState<Profile | null>(null);
	const [sortByMatch, setSortByMatch] = useState(false);

	useEffect(() => {
		apiGetProfile().then(setProfile).catch(() => {});
	}, []);

	// After a resume change/rescore, pull the freshly-scored board.
	function onProfileChanged(p: Profile) {
		setProfile(p);
		apiList().then(setApps).catch(() => {});
	}

	const filtering = isFiltering(filters);
	// Match-sort reorders columns, which conflicts with drag persistence — disable drag
	// while it's on (same rule as active filters).
	const draggable = !filtering && !sortByMatch;

	const filtered = useMemo(() => {
		const q = filters.search.trim().toLowerCase();
		return apps.filter((a) => {
			if (filters.platform !== "All" && a.platform !== filters.platform) return false;
			if (filters.regionalOnly && !a.isRegionalNSW) return false;
			if (q) {
				const hay = `${a.title} ${a.company} ${a.location ?? ""}`.toLowerCase();
				if (!hay.includes(q)) return false;
			}
			return true;
		});
	}, [apps, filters]);

	const columns = useMemo(() => groupByStatus(filtered, sortByMatch), [filtered, sortByMatch]);

	function openAdd() {
		setEditing(null);
		setModalOpen(true);
	}
	function openEdit(app: Application) {
		setEditing(app);
		setModalOpen(true);
	}

	async function submit(input: ApplicationInput) {
		if (editing) {
			const updated = await apiUpdate(editing.id, input);
			setApps((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
		} else {
			const created = await apiCreate(input);
			setApps((prev) => [...prev, created]);
		}
	}

	async function remove(app: Application) {
		if (!confirm(`Delete "${app.title}" at ${app.company}?`)) return;
		const prev = apps;
		setApps((p) => p.filter((a) => a.id !== app.id)); // optimistic
		try {
			await apiDelete(app.id);
		} catch {
			setApps(prev); // rollback
		}
	}

	function move(activeId: string, toStatus: Status, overCardId: string | null) {
		const active = apps.find((a) => a.id === activeId);
		if (!active) return;

		const cols = groupByStatus(apps, false);
		cols[active.status] = cols[active.status].filter((a) => a.id !== activeId);
		const target = cols[toStatus];
		let idx = overCardId ? target.findIndex((a) => a.id === overCardId) : target.length;
		if (idx < 0) idx = target.length;
		target.splice(idx, 0, { ...active, status: toStatus });

		const orderMap = new Map<string, { status: Status; order: number }>();
		for (const s of STATUSES) cols[s].forEach((a, i) => orderMap.set(a.id, { status: s, order: i }));

		const next = apps.map((a) => {
			const o = orderMap.get(a.id);
			return o ? { ...a, status: o.status, statusOrder: o.order } : a;
		});
		const changed = next.filter((n) => {
			const old = apps.find((a) => a.id === n.id);
			return old && (old.status !== n.status || old.statusOrder !== n.statusOrder);
		});
		if (changed.length === 0) return;

		setApps(next); // optimistic
		// Persist all reindexed cards; if any fail, reconcile from the server (don't
		// blind-rollback, which could discard moves that did succeed).
		Promise.allSettled(changed.map((c) => apiMove(c.id, c.status, c.statusOrder))).then((results) => {
			if (results.some((r) => r.status === "rejected")) apiList().then(setApps).catch(() => {});
		});
	}

	return (
		<div className="mx-auto max-w-7xl px-4 py-6">
			<header className="mb-6 flex flex-wrap items-center justify-between gap-3">
				<div>
					<h1 className="text-2xl font-bold text-slate-800">JobTrackr</h1>
					<p className="text-sm text-slate-500">
						Your regional-NSW job hunt — one board across SEEK, LinkedIn & Indeed.
					</p>
				</div>
				<button
					onClick={openAdd}
					className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-700"
				>
					+ Add job
				</button>
			</header>

			<div className="mb-4">
				<ResumePanel profile={profile} onChanged={onProfileChanged} />
			</div>

			<div className="mb-6">
				<StatsBar apps={apps} />
			</div>

			<div className="mb-3 flex flex-wrap items-center justify-between gap-2">
				<FilterBar filters={filters} onChange={setFilters} />
				<div className="flex items-center gap-3">
					<label className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-slate-600">
						<input
							type="checkbox"
							checked={sortByMatch}
							onChange={(e) => setSortByMatch(e.target.checked)}
							className="h-3.5 w-3.5"
						/>
						Sort by match
					</label>
					{!draggable && <p className="text-xs text-slate-400">Reordering paused</p>}
				</div>
			</div>

			{apps.length === 0 ? (
				<div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
					<p className="text-slate-500">No applications yet.</p>
					<button onClick={openAdd} className="mt-3 text-sm font-medium text-sky-600 hover:underline">
						Add your first job →
					</button>
				</div>
			) : (
				<Board
					columns={columns}
					draggable={draggable}
					onEdit={openEdit}
					onDelete={remove}
					onMove={move}
				/>
			)}

			<AddApplicationModal
				open={modalOpen}
				editing={editing}
				onClose={() => setModalOpen(false)}
				onSubmit={submit}
			/>
		</div>
	);
}
