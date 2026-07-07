// Thin client-side wrappers over the /api/applications endpoints.
import type { Application, ApplicationInput, Status } from "@/lib/types";

async function json<T>(res: Response): Promise<T> {
	if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? res.statusText);
	return res.json();
}

export function apiList(): Promise<Application[]> {
	return fetch("/api/applications").then((r) => json<Application[]>(r));
}

export function apiCreate(input: ApplicationInput): Promise<Application> {
	return fetch("/api/applications", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(input),
	}).then((r) => json<Application>(r));
}

export function apiUpdate(id: string, patch: Partial<ApplicationInput>): Promise<Application> {
	return fetch(`/api/applications/${id}`, {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(patch),
	}).then((r) => json<Application>(r));
}

export function apiMove(id: string, status: Status, statusOrder: number): Promise<Application> {
	return fetch(`/api/applications/${id}`, {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ status, statusOrder }),
	}).then((r) => json<Application>(r));
}

export async function apiDelete(id: string): Promise<void> {
	const res = await fetch(`/api/applications/${id}`, { method: "DELETE" });
	if (!res.ok) throw new Error("Delete failed");
}
