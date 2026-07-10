"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Application } from "@/lib/types";
import { RegionalBadge } from "@/components/RegionalBadge";
import { MatchBadge } from "@/components/MatchBadge";

const PLATFORM_STYLES: Record<string, string> = {
	SEEK: "bg-pink-100 text-pink-700",
	LinkedIn: "bg-sky-100 text-sky-700",
	Indeed: "bg-indigo-100 text-indigo-700",
	Other: "bg-slate-100 text-slate-600",
};

export function ApplicationCard({
	app,
	onEdit,
	onDelete,
	draggable,
}: {
	app: Application;
	onEdit: (app: Application) => void;
	onDelete: (app: Application) => void;
	draggable: boolean;
}) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id: app.id,
		disabled: !draggable,
	});

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.4 : 1,
	};

	return (
		<div
			ref={setNodeRef}
			style={style}
			className="group rounded-lg border border-slate-200 bg-white p-3 shadow-sm hover:border-slate-300 hover:shadow"
		>
			<div className="flex items-start justify-between gap-2">
				<div
					{...attributes}
					{...listeners}
					className={draggable ? "flex-1 cursor-grab active:cursor-grabbing" : "flex-1"}
				>
					<p className="text-sm font-semibold leading-tight text-slate-800">{app.title}</p>
					<p className="text-xs text-slate-500">{app.company}</p>
				</div>
				<div className="flex shrink-0 gap-1 opacity-0 transition group-hover:opacity-100">
					<button
						onClick={() => onEdit(app)}
						className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
						title="Edit"
						aria-label="Edit application"
					>
						✎
					</button>
					<button
						onClick={() => onDelete(app)}
						className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
						title="Delete"
						aria-label="Delete application"
					>
						🗑
					</button>
				</div>
			</div>

			<div className="mt-2 flex flex-wrap items-center gap-1.5">
				<span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${PLATFORM_STYLES[app.platform] ?? PLATFORM_STYLES.Other}`}>
					{app.platform}
				</span>
				<RegionalBadge app={app} />
				<MatchBadge app={app} />
			</div>

			{(app.location || app.salaryText) && (
				<p className="mt-2 truncate text-xs text-slate-400">
					{[app.location, app.salaryText].filter(Boolean).join(" · ")}
				</p>
			)}

			{app.matchScore != null && (app.matchedSkills.length > 0 || app.missingSkills.length > 0) && (
				<p className="mt-1.5 text-[11px] leading-snug text-slate-500">
					{app.matchedSkills.length > 0 && (
						<span className="text-emerald-600">✓ {app.matchedSkills.slice(0, 5).join(", ")}</span>
					)}
					{app.matchedSkills.length > 0 && app.missingSkills.length > 0 && <span> · </span>}
					{app.missingSkills.length > 0 && (
						<span className="text-slate-400">gap: {app.missingSkills.slice(0, 4).join(", ")}</span>
					)}
				</p>
			)}

			{app.matchScore == null && (
				<p className="mt-1.5 text-[11px] leading-snug text-slate-300">
					Not scored — add a job description (Edit ✎) to match it against your resume.
				</p>
			)}

			{app.url ? (
				<a
					href={app.url}
					target="_blank"
					rel="noopener noreferrer"
					className="mt-2 inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-1 text-xs font-medium text-sky-700 hover:bg-sky-100"
				>
					Open job to apply ↗
				</a>
			) : (
				<p className="mt-2 text-[11px] text-slate-300">
					No job link saved — add one via Edit ✎, or save the job with the extension.
				</p>
			)}
		</div>
	);
}
