"use client";

import {
	closestCorners,
	DndContext,
	type DragEndEvent,
	PointerSensor,
	useDroppable,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { type Application, STATUSES, type Status } from "@/lib/types";
import { ApplicationCard } from "@/components/ApplicationCard";

const COLUMN_META: Record<Status, { dot: string; header: string }> = {
	Saved: { dot: "bg-slate-400", header: "text-slate-600" },
	Applied: { dot: "bg-blue-500", header: "text-blue-700" },
	Interview: { dot: "bg-amber-500", header: "text-amber-700" },
	Offer: { dot: "bg-green-500", header: "text-green-700" },
	Rejected: { dot: "bg-rose-500", header: "text-rose-700" },
};

export function Board({
	columns,
	draggable,
	onEdit,
	onDelete,
	onMove,
}: {
	columns: Record<Status, Application[]>;
	draggable: boolean;
	onEdit: (app: Application) => void;
	onDelete: (app: Application) => void;
	onMove: (activeId: string, toStatus: Status, overCardId: string | null) => void;
}) {
	const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

	function findColumn(id: string): Status | null {
		return STATUSES.find((s) => columns[s].some((a) => a.id === id)) ?? null;
	}

	function handleDragEnd(e: DragEndEvent) {
		const { active, over } = e;
		if (!over) return;
		const activeId = String(active.id);
		const overId = String(over.id);
		const isColumn = (STATUSES as readonly string[]).includes(overId);
		const to = isColumn ? (overId as Status) : findColumn(overId);
		if (!to) return;
		onMove(activeId, to, isColumn ? null : overId);
	}

	return (
		<DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
			<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
				{STATUSES.map((status) => (
					<Column
						key={status}
						status={status}
						items={columns[status]}
						draggable={draggable}
						onEdit={onEdit}
						onDelete={onDelete}
					/>
				))}
			</div>
		</DndContext>
	);
}

function Column({
	status,
	items,
	draggable,
	onEdit,
	onDelete,
}: {
	status: Status;
	items: Application[];
	draggable: boolean;
	onEdit: (app: Application) => void;
	onDelete: (app: Application) => void;
}) {
	const { setNodeRef, isOver } = useDroppable({ id: status });
	const meta = COLUMN_META[status];

	return (
		<div className="flex flex-col rounded-xl bg-slate-100/70 p-2">
			<header className="flex items-center justify-between px-1 py-1.5">
				<span className={`flex items-center gap-2 text-sm font-semibold ${meta.header}`}>
					<span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} />
					{status}
				</span>
				<span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-500">
					{items.length}
				</span>
			</header>
			<SortableContext items={items.map((a) => a.id)} strategy={verticalListSortingStrategy}>
				<div
					ref={setNodeRef}
					className={`flex min-h-[80px] flex-1 flex-col gap-2 rounded-lg p-1 transition ${
						isOver ? "bg-slate-200/70" : ""
					}`}
				>
					{items.map((app) => (
						<ApplicationCard
							key={app.id}
							app={app}
							onEdit={onEdit}
							onDelete={onDelete}
							draggable={draggable}
						/>
					))}
					{items.length === 0 && (
						<p className="px-2 py-6 text-center text-xs text-slate-400">Drop jobs here</p>
					)}
				</div>
			</SortableContext>
		</div>
	);
}
