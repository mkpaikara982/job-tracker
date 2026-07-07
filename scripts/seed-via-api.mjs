// Seeds the tracker with the real regional-NSW starter matches (captured 2026-07-07)
// by POSTing to the running dev server, so the regional-tagging pipeline runs for each.
// Usage: node scripts/seed-via-api.mjs   (dev server must be running on :3000)

const BASE = process.env.BASE_URL ?? "http://localhost:3000";

const jobs = [
	{ title: "Software Engineer", company: "Objective Corporation", location: "Wollongong NSW 2500", platform: "SEEK", status: "Applied", salaryText: "Hybrid, 2 days office" },
	{ title: "Data Insights & Analytics Specialist", company: "University of Wollongong", location: "Wollongong NSW 2500", platform: "SEEK", status: "Applied", notes: "Alma mater. 2 positions." },
	{ title: "Graduate Software Developer | ERP", company: "Pulse Mining Systems", location: "Newcastle NSW 2300", platform: "SEEK", status: "Interview", notes: "Matches PulseERP resume variant." },
	{ title: "Web Developer", company: "The Disability Trust", location: "Wollongong NSW 2500", platform: "SEEK", status: "Saved", salaryText: "Salary packaging" },
	{ title: "Senior Data Analyst", company: "IRT Group", location: "Wollongong NSW 2500", platform: "SEEK", status: "Saved" },
	{ title: "IT Systems Administrator", company: "360HR", location: "Wollongong NSW 2500", platform: "SEEK", status: "Saved" },
	{ title: "IT Support - Traineeship", company: "Illawarra employer", location: "Wollongong NSW 2500", platform: "SEEK", status: "Saved" },
	{ title: "IT Operations Support Lead", company: "Hampshire Property Group", location: "Wollongong NSW 2500", platform: "SEEK", status: "Saved" },
	{ title: "Senior Managed Services Engineer", company: "Hays Recruitment", location: "Wollongong NSW 2500", platform: "SEEK", status: "Saved" },
	{ title: "Systems Engineer", company: "New Era Technology", location: "Gosford NSW 2250", platform: "SEEK", status: "Saved" },
	// A Sydney example to demonstrate non-regional tagging + the "Regional only" filter.
	{ title: "Graduate Developer", company: "Example Sydney Co", location: "Sydney NSW 2000", platform: "LinkedIn", status: "Saved" },
];

let ok = 0;
for (const job of jobs) {
	const res = await fetch(`${BASE}/api/applications`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(job),
	});
	if (res.ok) {
		const a = await res.json();
		ok++;
		console.log(`✓ ${a.title} @ ${a.company} — ${a.isRegionalNSW ? "REGIONAL" : "non-regional"} (${a.regionMatchType}, ${a.state ?? "?"})`);
	} else {
		console.error(`✗ ${job.title}: ${res.status} ${await res.text()}`);
	}
}
console.log(`\nSeeded ${ok}/${jobs.length} applications.`);
