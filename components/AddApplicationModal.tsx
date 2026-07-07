"use client";

import { useEffect, useState } from "react";
import { type Application, type ApplicationInput, PLATFORMS, STATUSES } from "@/lib/types";
import { tagLocation } from "@/lib/regional/tagLocation";
import { RegionalBadge } from "@/components/RegionalBadge";

const EMPTY: ApplicationInput = {
	title: "",
	company: "",
	platform: "SEEK",
	url: "",
	location: "",
	salaryText: "",
	status: "Saved",
	notes: "",
};

export function AddApplicationModal({
	open,
	editing,
	onClose,
	onSubmit,
}: {
	open: boolean;
	editing: Application | null;
	onClose: () => void;
	onSubmit: (input: ApplicationInput) => Promise<void>;
}) {
	const [form, setForm] = useState<ApplicationInput>(EMPTY);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!open) return;
		setError(null);
		setForm(
			editing
				? {
						title: editing.title,
						company: editing.company,
						platform: editing.platform,
						url: editing.url ?? "",
						location: editing.location ?? "",
						salaryText: editing.salaryText ?? "",
						status: editing.status,
						notes: editing.notes ?? "",
					}
				: EMPTY,
		);
	}, [open, editing]);

	if (!open) return null;

	const preview = tagLocation(form.location);

	function set<K extends keyof ApplicationInput>(key: K, value: ApplicationInput[K]) {
		setForm((f) => ({ ...f, [key]: value }));
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!form.title.trim() || !form.company.trim()) {
			setError("Title and company are required.");
			return;
		}
		setSaving(true);
		setError(null);
		try {
			await onSubmit(form);
			onClose();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Something went wrong.");
		} finally {
			setSaving(false);
		}
	}

	return (
		<div
			className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 pt-12"
			onClick={onClose}
		>
			<div
				className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl"
				onClick={(e) => e.stopPropagation()}
			>
				<h2 className="text-lg font-semibold text-slate-800">
					{editing ? "Edit application" : "Add application"}
				</h2>

				<form onSubmit={handleSubmit} className="mt-4 space-y-4">
					<div className="grid grid-cols-2 gap-3">
						<Field label="Job title *" className="col-span-2">
							<input
								autoFocus
								value={form.title}
								onChange={(e) => set("title", e.target.value)}
								className="input"
								placeholder="Graduate Software Developer"
							/>
						</Field>
						<Field label="Company *">
							<input
								value={form.company}
								onChange={(e) => set("company", e.target.value)}
								className="input"
								placeholder="Objective Corporation"
							/>
						</Field>
						<Field label="Platform">
							<select
								value={form.platform}
								onChange={(e) => set("platform", e.target.value as ApplicationInput["platform"])}
								className="input"
							>
								{PLATFORMS.map((p) => (
									<option key={p} value={p}>
										{p}
									</option>
								))}
							</select>
						</Field>
						<Field label="Location" className="col-span-2">
							<input
								value={form.location ?? ""}
								onChange={(e) => set("location", e.target.value)}
								className="input"
								placeholder="Wollongong NSW 2500"
							/>
							{form.location ? (
								<div className="mt-1.5">
									<RegionalBadge app={{ ...preview }} />
								</div>
							) : null}
						</Field>
						<Field label="Job URL" className="col-span-2">
							<input
								value={form.url ?? ""}
								onChange={(e) => set("url", e.target.value)}
								className="input"
								placeholder="https://www.seek.com.au/job/..."
							/>
						</Field>
						<Field label="Salary (free text)">
							<input
								value={form.salaryText ?? ""}
								onChange={(e) => set("salaryText", e.target.value)}
								className="input"
								placeholder="$85k–95k + super"
							/>
						</Field>
						<Field label="Status">
							<select
								value={form.status}
								onChange={(e) => set("status", e.target.value as ApplicationInput["status"])}
								className="input"
							>
								{STATUSES.map((s) => (
									<option key={s} value={s}>
										{s}
									</option>
								))}
							</select>
						</Field>
						<Field label="Notes" className="col-span-2">
							<textarea
								value={form.notes ?? ""}
								onChange={(e) => set("notes", e.target.value)}
								className="input min-h-[70px]"
								placeholder="Referral, recruiter name, follow-up date…"
							/>
						</Field>
					</div>

					{error && <p className="text-sm text-rose-600">{error}</p>}

					<div className="flex justify-end gap-2 pt-1">
						<button
							type="button"
							onClick={onClose}
							className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={saving}
							className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
						>
							{saving ? "Saving…" : editing ? "Save changes" : "Add job"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}

function Field({
	label,
	className,
	children,
}: {
	label: string;
	className?: string;
	children: React.ReactNode;
}) {
	return (
		<label className={`block ${className ?? ""}`}>
			<span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
			{children}
		</label>
	);
}
