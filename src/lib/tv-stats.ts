import type { Billing, Entry } from "./types";
import { money } from "./ui";

export function monthKeyOf(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function todayIso(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Monday-start week containing `d`. */
export function weekRange(d: Date) {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const start = new Date(d);
  start.setHours(12, 0, 0, 0);
  start.setDate(start.getDate() + diff);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { start: todayIso(start), end: todayIso(end) };
}

export function isDateInRange(iso: string, start: string, end: string) {
  return iso >= start && iso <= end;
}

export function fmtShortDate(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export function fmtDayLabel(iso: string) {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

export type BillingLeaderRow = {
  name: string;
  amount: number;
  placements: number;
};

export function billingLeaderboard(billings: Billing[], roster: string[], monthKey: string): BillingLeaderRow[] {
  const monthBillings = billings.filter((b) => b.date?.startsWith(monthKey));
  return roster
    .map((name) => ({
      name,
      amount: monthBillings.filter((b) => b.team.includes(name)).reduce((s, b) => s + b.amount, 0),
      placements: monthBillings.filter((b) => b.team.includes(name)).length,
    }))
    .sort((a, b) => b.amount - a.amount || b.placements - a.placements);
}

export type SendoutLeaderRow = {
  name: string;
  count: number;
  placed: number;
};

export function sendoutLeaderboard(entries: Entry[], roster: string[], monthKey: string): SendoutLeaderRow[] {
  const monthEntries = entries.filter((e) => e.date?.startsWith(monthKey));
  return roster
    .map((name) => ({
      name,
      count: monthEntries.filter((e) => (e.team || []).includes(name)).length,
      placed: monthEntries.filter((e) => (e.team || []).includes(name) && e.stage === "placed" && !e.declined).length,
    }))
    .sort((a, b) => b.count - a.count || b.placed - a.placed);
}

export type InterviewItem = {
  id: string;
  entryId: string;
  date: string;
  candidate: string;
  company: string;
  role: string | null;
  type: string;
  round: number;
  team: string[];
};

export function gatherInterviews(entries: Entry[], start: string, end: string): InterviewItem[] {
  const items: InterviewItem[] = [];
  for (const e of entries) {
    if (e.declined) continue;
    for (const m of e.meetingLog ?? []) {
      if (!isDateInRange(m.date, start, end)) continue;
      items.push({
        id: m.id,
        entryId: e.id,
        date: m.date,
        candidate: e.candidate,
        company: e.company,
        role: e.role,
        type: m.type,
        round: m.round,
        team: e.team ?? [],
      });
    }
  }
  return items.sort((a, b) => b.date.localeCompare(a.date) || a.candidate.localeCompare(b.candidate));
}

export type PlacementItem = {
  id: string;
  candidate: string;
  company: string;
  role: string | null;
  date: string;
  team: string[];
  amount: number | null;
};

export function placedDate(entry: Entry): string | null {
  for (let i = entry.stageHistory.length - 1; i >= 0; i--) {
    if (entry.stageHistory[i]?.stage === "placed") return entry.stageHistory[i].date;
  }
  return entry.stage === "placed" ? entry.date : null;
}

export function placementsInRange(
  entries: Entry[],
  billings: Billing[],
  start: string,
  end: string
): PlacementItem[] {
  const billingByEntry = new Map<string, Billing>();
  for (const b of billings) {
    if (b.entryId) billingByEntry.set(b.entryId, b);
  }

  const items: PlacementItem[] = [];
  for (const e of entries) {
    if (e.declined || e.stage !== "placed") continue;
    const date = placedDate(e);
    if (!date || !isDateInRange(date, start, end)) continue;
    const linked = billingByEntry.get(e.id);
    items.push({
      id: e.id,
      candidate: e.candidate,
      company: e.company,
      role: e.role,
      date,
      team: e.team ?? [],
      amount: linked?.amount ?? null,
    });
  }
  return items.sort((a, b) => b.date.localeCompare(a.date));
}

export type PipelineBreakdown = {
  sent: number;
  interview: number;
  offer: number;
  placed: number;
  declined: number;
};

export function activePipeline(entries: Entry[], monthKey: string): PipelineBreakdown {
  const monthEntries = entries.filter((e) => e.date?.startsWith(monthKey));
  return {
    sent: monthEntries.filter((e) => !e.declined && e.stage === "sent").length,
    interview: monthEntries.filter((e) => !e.declined && e.stage === "interview").length,
    offer: monthEntries.filter((e) => !e.declined && e.stage === "offer").length,
    placed: monthEntries.filter((e) => !e.declined && e.stage === "placed").length,
    declined: monthEntries.filter((e) => e.declined).length,
  };
}

export type PulseStats = {
  sendoutsMtd: number;
  billingsMtd: number;
  placementsMtd: number;
  firstTimeMtd: number;
  interviewsToday: number;
  interviewsWeek: number;
  activePipeline: number;
  ytdBillings: number;
  monthlyGoal: number | null;
  goalPct: number | null;
  goalDiff: number | null;
};

export function computePulseStats(
  entries: Entry[],
  billings: Billing[],
  now: Date,
  goals: { monthlyGoal: number | null; yearlyGoal: number | null }
): PulseStats {
  const monthKey = monthKeyOf(now);
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const today = todayIso(now);
  const { start, end } = weekRange(now);

  const monthEntries = entries.filter((e) => e.date?.startsWith(monthKey));
  const monthBillings = billings.filter((b) => b.date?.startsWith(monthKey));
  const ytdBillings = billings.filter(
    (b) => b.date?.startsWith(String(year)) && Number(b.date.slice(5, 7)) <= month
  );

  const billingsMtd = monthBillings.reduce((s, b) => s + b.amount, 0);
  const placementsMtd = monthEntries.filter((e) => e.stage === "placed" && !e.declined).length;
  const interviewsWeek = gatherInterviews(entries, start, end);
  const interviewsToday = interviewsWeek.filter((i) => i.date === today);

  const monthlyGoal = goals.monthlyGoal && goals.monthlyGoal > 0 ? goals.monthlyGoal : null;
  const goalPct = monthlyGoal ? billingsMtd / monthlyGoal : null;
  const goalDiff = monthlyGoal ? billingsMtd - monthlyGoal : null;

  return {
    sendoutsMtd: monthEntries.length,
    billingsMtd,
    placementsMtd,
    firstTimeMtd: monthEntries.filter((e) => e.firstTime).length,
    interviewsToday: interviewsToday.length,
    interviewsWeek: interviewsWeek.length,
    activePipeline: monthEntries.filter((e) => !e.declined && e.stage !== "placed").length,
    ytdBillings: ytdBillings.reduce((s, b) => s + b.amount, 0),
    monthlyGoal,
    goalPct,
    goalDiff,
  };
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function avatarHue(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i) * 31) % 360;
  return h;
}

export { money };
