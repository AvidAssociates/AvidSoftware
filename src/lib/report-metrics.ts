import type { Billing, Entry, RetainedSearch, SearchCandidate, Stage } from "./types";

export type ReportGoals = { yearlyGoal: number | null; monthlyGoal: number | null };

export type RecruiterScorecard = {
  name: string;
  billed: number;
  deals: number;
  sendOuts: number;
  offers: number;
  placements: number;
  meetings: number;
  searchCount: number;
};

export type YearReport = {
  year: number;
  visibleMonths: number;
  kpis: {
    billed: number;
    collected: number;
    invoiced: number;
    deals: number;
    avgDeal: number;
    sendOuts: number;
    offers: number;
    placements: number;
    declined: number;
    firstTime: number;
    pipelineValue: number;
    activeSearches: number;
    goalPct: number | null;
  };
  firmByMonth: number[];
  collectedByMonth: number[];
  invoicedByMonth: number[];
  sendOutsByMonth: number[];
  offersByMonth: number[];
  placementsByMonth: number[];
  meetingsByMonth: number[];
  people: string[];
  byPersonByMonth: Record<string, number[]>;
  funnel: { sent: number; interview: number; offer: number; placed: number; declined: number };
  searchStages: { sourcing: number; interviewing: number; placed: number; stale: number };
  candidateStages: { presented: number; interview: number; offer: number; placed: number };
  recruiters: RecruiterScorecard[];
  avgDaysToOffer: number | null;
  avgDaysToPlace: number | null;
};

function monthIndex(iso: string) {
  return Number(iso.slice(5, 7)) - 1;
}

function inYear(iso: string | null | undefined, year: number) {
  return !!iso && iso.startsWith(String(year));
}

function emptyMonths() {
  return new Array(12).fill(0);
}

function stageDate(entry: Entry, stage: Stage): string | null {
  const hits = entry.stageHistory.filter((h) => h.stage === stage);
  return hits.length ? hits[hits.length - 1].date : null;
}

function offerDate(entry: Entry): string | null {
  const fromLog = entry.meetingLog.find((m) => m.type === "Offer")?.date;
  return fromLog ?? stageDate(entry, "offer");
}

function placedDate(entry: Entry): string | null {
  const fromLog = entry.meetingLog.find((m) => m.type === "Placed")?.date;
  return fromLog ?? stageDate(entry, "placed");
}

function daysBetween(a: string, b: string) {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.max(0, Math.round(ms / 86_400_000));
}

function creditTeam<T>(items: T[], team: string[], fn: (name: string) => void) {
  const credited = team.length ? team : ["Unassigned"];
  for (const name of credited) fn(name);
}

export function buildYearReport({
  billings,
  entries,
  searches,
  teamNames,
  year,
  goals,
}: {
  billings: Billing[];
  entries: Entry[];
  searches: RetainedSearch[];
  teamNames: string[];
  year: number;
  goals: ReportGoals;
}): YearReport {
  const now = new Date();
  const visibleMonths = year === now.getFullYear() ? now.getMonth() + 1 : 12;

  const yearBillings = billings.filter((b) => inYear(b.date, year));
  const yearEntries = entries.filter((e) => inYear(e.date, year));
  const yearSearches = searches.filter((s) => inYear(s.date, year));

  const firmByMonth = emptyMonths();
  const collectedByMonth = emptyMonths();
  const invoicedByMonth = emptyMonths();
  const sendOutsByMonth = emptyMonths();
  const offersByMonth = emptyMonths();
  const placementsByMonth = emptyMonths();
  const meetingsByMonth = emptyMonths();

  for (const b of yearBillings) {
    const m = monthIndex(b.date);
    if (m >= 0 && m < 12) firmByMonth[m] += b.amount;
    for (const log of b.collectionLog ?? []) {
      if (!inYear(log.date, year)) continue;
      const mi = monthIndex(log.date);
      if (mi < 0 || mi >= 12) continue;
      if (log.type === "Collected") collectedByMonth[mi] += b.amount;
      if (log.type === "Invoiced") invoicedByMonth[mi] += b.amount;
    }
    if (!b.collectionLog?.length) {
      const mi = monthIndex(b.date);
      if (b.collectionStage === "collected" && mi >= 0 && mi < 12) collectedByMonth[mi] += b.amount;
      if (b.collectionStage === "invoiced" && mi >= 0 && mi < 12) invoicedByMonth[mi] += b.amount;
    }
  }

  const funnel = { sent: 0, interview: 0, offer: 0, placed: 0, declined: 0 };
  let offerCount = 0;
  let placementCount = 0;
  let declined = 0;
  let firstTime = 0;
  const daysToOffer: number[] = [];
  const daysToPlace: number[] = [];

  for (const e of yearEntries) {
    const m = monthIndex(e.date);
    if (m >= 0 && m < 12) sendOutsByMonth[m] += 1;
    if (e.declined) declined += 1;
    if (e.firstTime) firstTime += 1;

    if (e.declined) funnel.declined += 1;
    else funnel[e.stage] += 1;

    const od = offerDate(e);
    if (od && inYear(od, year)) {
      offerCount += 1;
      const mi = monthIndex(od);
      if (mi >= 0 && mi < 12) offersByMonth[mi] += 1;
      daysToOffer.push(daysBetween(e.date, od));
    }

    const pd = placedDate(e);
    if (pd && inYear(pd, year)) {
      placementCount += 1;
      const mi = monthIndex(pd);
      if (mi >= 0 && mi < 12) placementsByMonth[mi] += 1;
      daysToPlace.push(daysBetween(e.date, pd));
    }

    for (const log of e.meetingLog ?? []) {
      if (log.type === "Offer" || log.type === "Placed") continue;
      if (!inYear(log.date, year)) continue;
      const mi = monthIndex(log.date);
      if (mi >= 0 && mi < 12) meetingsByMonth[mi] += 1;
    }
  }

  const historical = yearBillings.flatMap((b) => b.team);
  const people = Array.from(new Set([...teamNames, ...historical]));

  const byPersonByMonth: Record<string, number[]> = {};
  for (const name of people) byPersonByMonth[name] = emptyMonths();
  for (const b of yearBillings) {
    const m = monthIndex(b.date);
    if (m < 0 || m >= 12) continue;
    for (const name of b.team) {
      if (byPersonByMonth[name]) byPersonByMonth[name][m] += b.amount;
    }
  }

  const recruiterMap: Record<string, RecruiterScorecard> = {};
  const ensure = (name: string) => {
    if (!recruiterMap[name]) {
      recruiterMap[name] = { name, billed: 0, deals: 0, sendOuts: 0, offers: 0, placements: 0, meetings: 0, searchCount: 0 };
    }
    return recruiterMap[name];
  };
  for (const name of people) ensure(name);

  for (const b of yearBillings) {
    for (const name of b.team) {
      const r = ensure(name);
      r.billed += b.amount;
      r.deals += 1;
    }
  }

  for (const e of yearEntries) {
    creditTeam([e], e.team, (name) => {
      const r = ensure(name);
      r.sendOuts += 1;
      if (offerDate(e) && inYear(offerDate(e)!, year)) r.offers += 1;
      if (placedDate(e) && inYear(placedDate(e)!, year)) r.placements += 1;
      for (const log of e.meetingLog ?? []) {
        if (log.type !== "Offer" && log.type !== "Placed" && inYear(log.date, year)) r.meetings += 1;
      }
    });
  }

  for (const s of yearSearches) {
    creditTeam([s], s.team, (name) => {
      ensure(name).searchCount += 1;
    });
  }

  const searchStages = { sourcing: 0, interviewing: 0, placed: 0, stale: 0 };
  let pipelineValue = 0;
  let activeSearches = 0;
  const candidateStages = { presented: 0, interview: 0, offer: 0, placed: 0 };

  for (const s of searches) {
    if (s.stage !== "placed" && s.stage !== "stale") activeSearches += 1;
    searchStages[s.stage] += 1;
    if (s.retainerAmount) pipelineValue += s.retainerAmount;
    for (const c of s.candidates ?? []) {
      candidateStages[c.stage] += 1;
    }
  }

  const billed = firmByMonth.reduce((a, b) => a + b, 0);
  const collected = collectedByMonth.reduce((a, b) => a + b, 0);
  const invoiced = invoicedByMonth.reduce((a, b) => a + b, 0);
  const deals = yearBillings.length;
  const avgDeal = deals ? billed / deals : 0;
  const goalPct = goals.yearlyGoal ? billed / goals.yearlyGoal : null;

  const recruiters = Object.values(recruiterMap).sort((a, b) => b.billed - a.billed);

  const avg = (arr: number[]) => (arr.length ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length) : null);

  return {
    year,
    visibleMonths,
    kpis: {
      billed,
      collected,
      invoiced,
      deals,
      avgDeal,
      sendOuts: yearEntries.length,
      offers: offerCount,
      placements: placementCount,
      declined,
      firstTime,
      pipelineValue,
      activeSearches,
      goalPct,
    },
    firmByMonth,
    collectedByMonth,
    invoicedByMonth,
    sendOutsByMonth,
    offersByMonth,
    placementsByMonth,
    meetingsByMonth,
    people,
    byPersonByMonth,
    funnel,
    searchStages,
    candidateStages,
    recruiters,
    avgDaysToOffer: avg(daysToOffer),
    avgDaysToPlace: avg(daysToPlace),
  };
}
