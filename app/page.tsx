import { listApplications } from "@/lib/dataClient";
import { TrackerApp } from "@/components/TrackerApp";

// Always read fresh from the local DB (no static caching of the board).
export const dynamic = "force-dynamic";

export default async function Home() {
	const apps = await listApplications();
	return <TrackerApp initial={apps} />;
}
