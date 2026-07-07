import type { RetainedSearch, SearchCandidate, SearchStage } from "./types";

export const SEARCH_STALE_DAYS = 30;

const LEGACY_STAGE: Record<string, SearchStage> = {
  signed: "sourcing",
  filled: "placed",
};

export function normalizeSearchStage(stage: string): SearchStage {
  return LEGACY_STAGE[stage] ?? (stage as SearchStage);
}

/** Latest date any candidate entered the Interview stage on this search. */
export function lastCandidateInterviewDate(candidates: SearchCandidate[], fallbackDate: string): string {
  let latest = "";
  for (const c of candidates) {
    for (const ev of c.stageHistory) {
      if (ev.stage === "interview" && ev.date > latest) latest = ev.date;
    }
  }
  return latest || fallbackDate;
}

export function daysSince(isoDate: string, todayIso: string): number {
  const from = new Date(isoDate + "T12:00:00").getTime();
  const to = new Date(todayIso + "T12:00:00").getTime();
  return Math.floor((to - from) / 86_400_000);
}

export function isSearchStale(candidates: SearchCandidate[], searchStartDate: string, todayIso: string): boolean {
  const lastInterview = lastCandidateInterviewDate(candidates, searchStartDate);
  return daysSince(lastInterview, todayIso) > SEARCH_STALE_DAYS;
}

/**
 * Auto stage rules (manual drag still wins except stale refresh on read):
 * - Placed searches never auto-move.
 * - No candidate hit Interview in 30+ days → Stale.
 * - Fresh interview activity wakes a Stale search → Interviewing.
 */
export function resolveAutoSearchStage(
  search: RetainedSearch,
  candidates: SearchCandidate[],
  todayIso: string
): SearchStage {
  const stage = normalizeSearchStage(search.stage);
  if (stage === "placed") return "placed";

  const stale = isSearchStale(candidates, search.date, todayIso);
  if (stale) return "stale";
  if (stage === "stale") return "interviewing";
  return stage;
}
