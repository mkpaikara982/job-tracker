"use client";

import { useRef, useState } from "react";
import type { Profile } from "@/lib/types";
import { apiRescore, apiUploadResume } from "@/lib/apiClient";

// Resume status + upload/rescore controls. Uploading a new resume re-scores every
// job on the server; onChanged() lets the parent refetch the (re-scored) board.
export function ResumePanel({
	profile,
	onChanged,
}: {
	profile: Profile | null;
	onChanged: (profile: Profile) => void;
}) {
	const fileRef = useRef<HTMLInputElement>(null);
	const [busy, setBusy] = useState(false);
	const [msg, setMsg] = useState<string | null>(null);
	const [err, setErr] = useState<string | null>(null);

	const hasResume = !!profile?.resumeName || (profile?.skills.length ?? 0) > 0;
	const updated = profile?.updatedAt ? new Date(profile.updatedAt).toLocaleDateString() : null;

	async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		e.target.value = ""; // allow re-selecting the same file later
		if (!file) return;
		setBusy(true);
		setErr(null);
		setMsg(null);
		try {
			const p = await apiUploadResume(file);
			onChanged(p);
			setMsg(`Loaded “${p.resumeName ?? "resume"}” — ${p.skills.length} skills detected. Jobs re-scored.`);
		} catch (e2) {
			setErr(e2 instanceof Error ? e2.message : "Upload failed.");
		} finally {
			setBusy(false);
		}
	}

	async function rescore() {
		setBusy(true);
		setErr(null);
		setMsg(null);
		try {
			const { rescored } = await apiRescore();
			// Reuse the current profile object; the board refetch carries new scores.
			if (profile) onChanged(profile);
			setMsg(`Re-scored ${rescored} job${rescored === 1 ? "" : "s"}.`);
		} catch (e2) {
			setErr(e2 instanceof Error ? e2.message : "Rescore failed.");
		} finally {
			setBusy(false);
		}
	}

	return (
		<div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="min-w-0">
					<p className="text-sm font-semibold text-slate-700">Resume match</p>
					{hasResume ? (
						<p className="truncate text-xs text-slate-500">
							{profile?.resumeName ?? "Resume"} · {profile?.skills.length ?? 0} skills
							{updated ? ` · updated ${updated}` : ""}
						</p>
					) : (
						<p className="text-xs text-slate-400">
							No resume yet — upload one to score how well each job fits you.
						</p>
					)}
				</div>
				<div className="flex items-center gap-2">
					<button
						onClick={() => fileRef.current?.click()}
						disabled={busy}
						className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
					>
						{busy ? "Working…" : hasResume ? "Replace resume" : "Upload resume"}
					</button>
					{hasResume && (
						<button
							onClick={rescore}
							disabled={busy}
							className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
						>
							Rescore all
						</button>
					)}
					<input
						ref={fileRef}
						type="file"
						accept=".docx,.txt,.md"
						onChange={onFile}
						className="hidden"
					/>
				</div>
			</div>
			{msg && <p className="mt-2 text-xs text-emerald-600">{msg}</p>}
			{err && <p className="mt-2 text-xs text-rose-600">{err}</p>}
			{hasResume && profile && profile.skills.length > 0 && (
				<p className="mt-2 line-clamp-2 text-[11px] text-slate-400" title={profile.skills.join(", ")}>
					Skills: {profile.skills.join(", ")}
				</p>
			)}
		</div>
	);
}
