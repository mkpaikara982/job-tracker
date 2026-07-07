// Tags a free-text job location as being in a designated regional area of NSW
// (all NSW except Greater Sydney — see data/regional-nsw.md). Pure + unit-testable;
// reused by the web app, API routes, and the future browser extension.

import data from "@/data/regional-nsw-postcodes.json";
import type { RegionMatchType } from "@/lib/types";

type Range = { from: number; to: number; category: number };
const NSW_RANGES = data.states.NSW.regionalRanges as Range[];

// Common suburb/city names for listings that omit a postcode. Lets us make a
// best-effort ("suburb") tag instead of giving up. Not exhaustive — postcode
// match is always preferred and more trustworthy.
const REGIONAL_NAMES = [
	"WOLLONGONG", "ILLAWARRA", "SHELLHARBOUR", "KIAMA", "NOWRA", "SHOALHAVEN",
	"BATEMANS BAY", "BEGA", "EDEN", "NEWCASTLE", "MAITLAND", "CESSNOCK",
	"LAKE MACQUARIE", "HUNTER", "GOSFORD", "CENTRAL COAST", "WYONG", "TERRIGAL",
	"WAGGA", "ALBURY", "GRIFFITH", "ORANGE", "BATHURST", "DUBBO", "MUDGEE",
	"COFFS HARBOUR", "PORT MACQUARIE", "TAMWORTH", "ARMIDALE", "LISMORE",
	"BALLINA", "BYRON", "TWEED HEADS", "GRAFTON", "BROKEN HILL", "GOULBURN",
	"QUEANBEYAN", "SOUTHERN HIGHLANDS", "BOWRAL", "MOSS VALE",
];
const NON_REGIONAL_NAMES = [
	"SYDNEY", "PARRAMATTA", "CHATSWOOD", "NORTH SYDNEY", "BONDI", "MANLY",
	"PENRITH", "BLACKTOWN", "LIVERPOOL", "BANKSTOWN", "HORNSBY", "RYDE",
	"SUTHERLAND", "CRONULLA", "CAMPBELLTOWN", "MACQUARIE PARK", "CBD",
];

export interface RegionTag {
	postcode: string | null;
	state: string | null;
	isRegionalNSW: boolean;
	regionMatchType: RegionMatchType;
}

// ACT postcode bands. The Home Affairs NSW range 2575-2739 numerically swallows the
// ACT block (2600-2620), so we must exclude ACT explicitly or Canberra jobs get
// mis-tagged as Regional NSW. 2620 is left OUT of this band because it's shared with
// Queanbeyan (NSW), which IS designated regional.
function isActPostcode(pc: number): boolean {
	return (pc >= 2600 && pc <= 2618) || (pc >= 2900 && pc <= 2920);
}

export function isRegionalNswPostcode(pc: number): boolean {
	if (isActPostcode(pc)) return false;
	return NSW_RANGES.some((r) => pc >= r.from && pc <= r.to);
}

export function tagLocation(location?: string | null): RegionTag {
	const empty: RegionTag = { postcode: null, state: null, isRegionalNSW: false, regionMatchType: "none" };
	if (!location) return empty;

	const text = location.toUpperCase();
	const pcMatch = location.match(/\b(2\d{3})\b/); // NSW/ACT postcodes are 2xxx
	const isACT = /\bACT\b|CANBERRA/.test(text); // ACT postcodes (2600-2620) overlap NSW ranges but are NOT regional

	// 1. Postcode match — most trustworthy.
	if (pcMatch) {
		const pc = parseInt(pcMatch[1], 10);
		// ACT — either the text says so, or the postcode is in an ACT-only band.
		if (isACT || isActPostcode(pc))
			return { postcode: pcMatch[1], state: "ACT", isRegionalNSW: false, regionMatchType: "postcode" };
		return {
			postcode: pcMatch[1],
			state: "NSW",
			isRegionalNSW: isRegionalNswPostcode(pc),
			regionMatchType: "postcode",
		};
	}

	// 2. Suburb/city-name heuristic — best effort when no postcode is present.
	if (isACT) return { postcode: null, state: "ACT", isRegionalNSW: false, regionMatchType: "suburb" };
	if (NON_REGIONAL_NAMES.some((n) => text.includes(n)))
		return { postcode: null, state: "NSW", isRegionalNSW: false, regionMatchType: "suburb" };
	if (REGIONAL_NAMES.some((n) => text.includes(n)))
		return { postcode: null, state: "NSW", isRegionalNSW: true, regionMatchType: "suburb" };

	// 3. Couldn't determine.
	const state = /\bNSW\b|NEW SOUTH WALES/.test(text) ? "NSW" : null;
	return { ...empty, state };
}
