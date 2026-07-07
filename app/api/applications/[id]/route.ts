import { NextResponse } from "next/server";
import { deleteApplication, moveApplication, updateApplication } from "@/lib/dataClient";
import { type ApplicationInput, isStatus } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

// PATCH handles both field edits and kanban moves.
// A move sends { status, statusOrder }; a field edit sends any ApplicationInput fields.
export async function PATCH(req: Request, { params }: Params) {
	const { id } = await params;
	const body = (await req.json()) as Partial<ApplicationInput> & { statusOrder?: number };

	try {
		if (typeof body.statusOrder === "number" && isStatus(body.status)) {
			const app = await moveApplication(id, body.status, body.statusOrder);
			return NextResponse.json(app);
		}
		const app = await updateApplication(id, body);
		return NextResponse.json(app);
	} catch {
		return NextResponse.json({ error: "Application not found" }, { status: 404 });
	}
}

export async function DELETE(_req: Request, { params }: Params) {
	const { id } = await params;
	try {
		await deleteApplication(id);
		return new NextResponse(null, { status: 204 });
	} catch {
		return NextResponse.json({ error: "Application not found" }, { status: 404 });
	}
}
