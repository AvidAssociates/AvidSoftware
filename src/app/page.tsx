"use client";

import { Fragment, useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import type { ChangeEvent, CSSProperties, ReactNode } from "react";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Ban,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Settings,
  Tv,
  LogOut,
} from "lucide-react";
import { Billing, BillingCollectionStage, CandidateStage, DeclineReason, Entry, EntryMutationResult, MeetingLogEntry, RetainedSearch, RosterMember, SearchCandidate, SearchStage, Stage } from "@/lib/types";
import {
  ADMIN,
  BILLING_COLLECTION,
  DEFAULT_TEAM,
  FONT,
  INTERVIEW_TYPES,
  PIPELINE,
  SEARCH_PIPELINE,
  SEARCH_STAGE_COLOR,
  STAGE_COLOR,
  Theme,
  fmtDate,
  getTheme,
  makeStyles,
  money,
  todayISO,
  uid,
} from "@/lib/ui";
import TVMode from "@/components/TVMode";
import ReportView from "@/components/ReportView";
import { BillingsGoalStats, BillingsTable } from "@/components/BillingsSummary";
import LeaderboardView from "@/components/LeaderboardView";
import SettingsModal from "@/components/SettingsModal";
import SearchesView from "@/components/SearchesView";
import { buildYearReport } from "@/lib/report-metrics";

type Styles = ReturnType<typeof makeStyles>;

// ---------- local (per-device) prefs ----------
function getLocal(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function setLocal(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

// Phone-sized screens get stacked card layouts instead of the wide
// multi-column grids (which physically can't fit 390px). SSR renders the
// desktop layout; the first client paint corrects it.
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return isMobile;
}

// ---------- API ----------
async function getJSON<T>(url: string, fallback: T): Promise<T> {
  try {
    const r = await fetch(url);
    if (!r.ok) return fallback;
    return (await r.json()) as T;
  } catch {
    return fallback;
  }
}
const send = (url: string, method: string, body?: unknown) =>
  fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

function normalizeEntryMutation(data: Entry | EntryMutationResult): EntryMutationResult {
  if (data && typeof data === "object" && "entry" in data) return data;
  return { entry: data };
}

const TABLE_SLIDE_MS = 320;

function TableSlidePanels({
  view,
  sendouts,
  billings,
}: {
  view: "sendouts" | "billings";
  sendouts: ReactNode;
  billings: ReactNode;
}) {
  const [display, setDisplay] = useState(view);
  const [leaving, setLeaving] = useState<"sendouts" | "billings" | null>(null);
  const [direction, setDirection] = useState<"forward" | "back" | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (view === display) return;

    const isPair =
      (display === "sendouts" && view === "billings") || (display === "billings" && view === "sendouts");
    if (!isPair) {
      setDisplay(view);
      setLeaving(null);
      setDirection(null);
      return;
    }

    const forward = display === "sendouts" && view === "billings";
    setLeaving(display);
    setDirection(forward ? "forward" : "back");
    setDisplay(view);

    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setLeaving(null);
      setDirection(null);
      timerRef.current = null;
    }, TABLE_SLIDE_MS);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [view, display]);

  const animating = leaving !== null && direction !== null;
  const leaveClass =
    direction === "forward"
      ? "avid-table-panel--leave-left"
      : direction === "back"
        ? "avid-table-panel--leave-right"
        : "";
  const enterClass =
    direction === "forward"
      ? "avid-table-panel--enter-right"
      : direction === "back"
        ? "avid-table-panel--enter-left"
        : "";

  return (
    <div className="avid-table-stage">
      {animating ? (
        <div className={`avid-table-panel ${leaveClass}`}>{leaving === "sendouts" ? sendouts : billings}</div>
      ) : null}
      <div className={`avid-table-panel${animating ? ` ${enterClass}` : ""}`}>
        {display === "sendouts" ? sendouts : billings}
      </div>
    </div>
  );
}

// ============================================================
export default function App() {
  const [isDark, setIsDark] = useState(true);
  const [booting, setBooting] = useState(true);
  const [roster, setRoster] = useState<RosterMember[]>([]);
  const [authUser, setAuthUser] = useState<{ displayName: string; email: string } | null>(null);

  const reloadRoster = async () => {
    const list = await getJSON<RosterMember[]>("/api/roster", []);
    if (list.length) setRoster(list);
  };

  useEffect(() => {
    // Browser-only prefs + auth + initial roster fetch.
    /* eslint-disable react-hooks/set-state-in-effect */
    const storedTheme = getLocal("theme-dark");
    if (storedTheme !== null) setIsDark(storedTheme === "1");
    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) {
          window.location.href = "/login";
          return;
        }
        const data = (await res.json()) as { user: { displayName: string; email: string } };
        setAuthUser(data.user);
        await reloadRoster();
      } finally {
        setBooting(false);
      }
    })();
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      setLocal("theme-dark", next ? "1" : "0");
      return next;
    });
  };

  const t = getTheme(isDark);
  const teamNames = roster.length ? roster.map((r) => r.name) : DEFAULT_TEAM;

  useEffect(() => {
    // Keeps the actual <html>/<body> background in sync with the current
    // theme, so mobile pull-to-refresh / overscroll bounce shows the
    // theme color instead of flashing white behind the app.
    document.documentElement.style.backgroundColor = t.bg;
    document.body.style.backgroundColor = t.bg;
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
  }, [t.bg, isDark]);

  if (booting || !authUser) {
    return <div style={{ height: "100vh", background: t.bg }} />;
  }

  return (
    <Dashboard
      user={authUser.displayName}
      t={t}
      isDark={isDark}
      roster={roster}
      teamNames={teamNames}
      reloadRoster={reloadRoster}
      onToggleTheme={toggleTheme}
      onLogout={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        window.location.href = "/login";
      }}
    />
  );
}

// ============================================================
function Dashboard({
  user,
  t,
  isDark,
  roster,
  teamNames,
  reloadRoster,
  onToggleTheme,
  onLogout,
}: {
  user: string;
  t: Theme;
  isDark: boolean;
  roster: RosterMember[];
  teamNames: string[];
  reloadRoster: () => Promise<void>;
  onToggleTheme: () => void;
  onLogout: () => void;
}) {
  const S = makeStyles(t);
  const isMobile = useIsMobile();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [billings, setBillings] = useState<Billing[]>([]);
  const [searches, setSearches] = useState<RetainedSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"searches" | "sendouts" | "billings" | "report" | "leaderboard">("sendouts");
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [showBillingForm, setShowBillingForm] = useState(false);
  const [focusSearchId, setFocusSearchId] = useState<string | null>(null);
  const [editingBilling, setEditingBilling] = useState<Billing | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [tvOpen, setTvOpen] = useState(false);
  const [filterTeam, setFilterTeam] = useState("All");
  const [filterStage, setFilterStage] = useState("All");
  const [query, setQuery] = useState("");
  const [monthCursor, setMonthCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [reportYear, setReportYear] = useState(() => new Date().getFullYear());
  const [billingsGoals, setBillingsGoals] = useState<{ yearlyGoal: number | null; monthlyGoal: number | null }>({
    yearlyGoal: null,
    monthlyGoal: null,
  });
  const [reportGoals, setReportGoals] = useState<{ yearlyGoal: number | null; monthlyGoal: number | null }>({
    yearlyGoal: null,
    monthlyGoal: null,
  });

  const isAdmin = user === ADMIN;
  const monthKey = `${monthCursor.getFullYear()}-${String(monthCursor.getMonth() + 1).padStart(2, "0")}`;
  const monthLabel = monthCursor.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const goPrevMonth = () => setMonthCursor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const goNextMonth = () => setMonthCursor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  const monthCursorYear = monthCursor.getFullYear();

  // Fetched as soon as the app loads (not when the Report tab is opened) so
  // the goal-line coloring is already correct the first time it's shown —
  // no flash of the wrong bar color while the fetch is in flight.
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/goals?year=${reportYear}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data) setReportGoals({ yearlyGoal: data.yearlyGoal ?? null, monthlyGoal: data.monthlyGoal ?? null });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [reportYear]);

  // The same production_goals row the Report tab charts read — editing it
  // here (next to Billings) carries straight over to Report.
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/goals?year=${monthCursorYear}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data) setBillingsGoals({ yearlyGoal: data.yearlyGoal ?? null, monthlyGoal: data.monthlyGoal ?? null });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [monthCursorYear]);

  const handleGoalsSaved = (goals: { yearlyGoal: number | null; monthlyGoal: number | null }) => {
    setBillingsGoals(goals);
    if (reportYear === monthCursorYear) setReportGoals(goals);
  };

  // Loads in the background without ever blanking the current view — only
  // the very first mount shows the loading state.
  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    const [e, b, s] = await Promise.all([
      getJSON<Entry[]>("/api/entries", []),
      getJSON<Billing[]>("/api/billings", []),
      getJSON<RetainedSearch[]>("/api/searches", []),
    ]);
    setEntries((prev) => (silent ? mergeEntries(prev, e) : e));
    setBillings(b);
    setSearches(s);
    if (!silent) setLoading(false);
  };

  useEffect(() => {
    // Initial fetch on mount — an effect is required here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
    const poll = setInterval(() => loadData(true), 30000);
    return () => clearInterval(poll);
  }, []);

  const applyEntry = (entry: Entry) =>
    setEntries((prev) => {
      const idx = prev.findIndex((e) => e.id === entry.id);
      if (idx === -1) return [entry, ...prev];
      const next = [...prev];
      next[idx] = entry;
      return next;
    });
  const applyBilling = (billing: Billing) =>
    setBillings((prev) => {
      const idx = prev.findIndex((b) => b.id === billing.id);
      if (idx === -1) return [billing, ...prev];
      const next = [...prev];
      next[idx] = billing;
      return next;
    });

  // Every mutation updates local state immediately (no reload, no flicker),
  // then reconciles with the server's response in the background.
  const applyEntryMutation = (data: Entry | EntryMutationResult) => {
    const { entry, billing, billingDeletedId } = normalizeEntryMutation(data);
    applyEntry(entry);
    if (billing) applyBilling(billing);
    if (billingDeletedId) setBillings((prev) => prev.filter((b) => b.id !== billingDeletedId));
  };
  const saveEntry = async (entry: Entry, isNew: boolean) => {
    applyEntry(entry);
    const res = await send(isNew ? "/api/entries" : `/api/entries/${entry.id}`, isNew ? "POST" : "PUT", entry);
    if (res.ok) applyEntryMutation(await res.json());
  };
  const setDeclined = async (entry: Entry, declined: boolean, reason: DeclineReason | null = null) => {
    const optimistic = { ...entry, declined, declinedReason: declined ? reason : null };
    applyEntry(optimistic);
    const res = await send(`/api/entries/${entry.id}`, "PUT", optimistic);
    if (res.ok) applyEntryMutation(await res.json());
  };
  const advanceStage = async (entry: Entry, stage: Stage) => {
    const stageDate = todayISO();
    let meetingLog = entry.meetingLog;
    let stageLogId: string | undefined;
    if (stage === "offer" && entry.stage !== "offer") {
      stageLogId = uid();
      meetingLog = [...meetingLog, { id: stageLogId, type: "Offer", round: 0, date: stageDate }];
    }
    if (stage === "placed" && entry.stage !== "placed") {
      stageLogId = uid();
      meetingLog = [...meetingLog, { id: stageLogId, type: "Placed", round: 0, date: stageDate }];
    }
    const optimistic = { ...entry, stage, declined: false, meetingLog };
    applyEntry(optimistic);
    const res = await send(`/api/entries/${entry.id}`, "PUT", { ...optimistic, stageDate, stageLogId });
    if (res.ok) applyEntryMutation(await res.json());
  };
  const deleteEntry = async (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    const res = await send(`/api/entries/${id}`, "DELETE");
    if (res.ok) {
      const data = (await res.json()) as { billingDeletedId?: string };
      if (data.billingDeletedId) setBillings((prev) => prev.filter((b) => b.id !== data.billingDeletedId));
    }
  };
  // Appends a meeting (Phone R1 -> Phone R2 -> Face-to-Face R1, ...) instead
  // of writing a whole new send-out entry — the fixed 4-stage tracker never
  // changes, only the log inside the Interview stage grows.
  const logMeeting = async (entry: Entry, type: string, round: number, date: string) => {
    const clientId = uid();
    const optimistic = {
      ...entry,
      interviewType: type,
      round,
      meetingLog: [...entry.meetingLog, { id: clientId, type, round, date }],
    };
    applyEntry(optimistic);
    const res = await send(`/api/entries/${entry.id}/meeting-log`, "PATCH", { id: clientId, type, round, date });
    if (!res.ok) return;

    const saved = (await res.json()) as Entry;
    setEntries((prev) => {
      const current = prev.find((e) => e.id === entry.id);
      if (!current?.meetingLog.some((m) => m.id === clientId)) {
        void send(`/api/entries/${entry.id}/meeting-log/${clientId}`, "DELETE");
        return prev;
      }
      const idx = prev.findIndex((e) => e.id === entry.id);
      if (idx === -1) return prev;
      const next = [...prev];
      next[idx] = saved;
      return next;
    });
  };
  const deleteMeeting = async (entry: Entry, meetingId: string) => {
    const deleted = entry.meetingLog.find((m) => m.id === meetingId);
    if (!deleted) return;

    const meetingLog = entry.meetingLog.filter((m) => m.id !== meetingId);
    const lastMeeting = [...meetingLog].reverse().find((m) => m.type !== "Offer" && m.type !== "Placed");
    let stage = entry.stage;
    if (deleted.type === "Offer" && entry.stage === "offer") stage = "interview";
    if (deleted.type === "Placed" && entry.stage === "placed") stage = "offer";
    const optimistic = {
      ...entry,
      meetingLog,
      stage,
      interviewType: lastMeeting?.type ?? entry.interviewType,
      round: lastMeeting?.round ?? entry.round,
    };
    applyEntry(optimistic);
    const res = await send(`/api/entries/${entry.id}/meeting-log/${meetingId}`, "DELETE");
    if (!res.ok) return;
    const saved = (await res.json()) as Entry;
    if (saved.meetingLog.some((m) => m.id === meetingId)) return;
    applyEntry(saved);
  };
  const updateMeetingDate = async (entry: Entry, meetingId: string, date: string) => {
    const meetingLog = entry.meetingLog.map((m) => (m.id === meetingId ? { ...m, date } : m));
    applyEntry({ ...entry, meetingLog });
    const res = await send(`/api/entries/${entry.id}/meeting-log/${meetingId}`, "PATCH", { date });
    if (res.ok) applyEntry(await res.json());
  };
  const saveBilling = async (billing: Billing, isNew: boolean) => {
    applyBilling(billing);
    const res = await send(isNew ? "/api/billings" : `/api/billings/${billing.id}`, isNew ? "POST" : "PUT", billing);
    if (res.ok) applyBilling(await res.json());
  };
  const deleteBilling = async (id: string) => {
    setBillings((prev) => prev.filter((b) => b.id !== id));
    await send(`/api/billings/${id}`, "DELETE");
  };
  const advanceBillingCollection = async (billing: Billing, stage: BillingCollectionStage) => {
    const res = await send(`/api/billings/${billing.id}/collection`, "PATCH", { stage, stageDate: todayISO() });
    if (res.ok) applyBilling(await res.json());
  };
  const updateBillingCollectionDate = async (billing: Billing, logId: string, date: string) => {
    const collectionLog = billing.collectionLog.map((e) => (e.id === logId ? { ...e, date } : e));
    applyBilling({ ...billing, collectionLog });
    const res = await send(`/api/billings/${billing.id}/collection-log/${logId}`, "PATCH", { date });
    if (res.ok) applyBilling(await res.json());
  };

  const applySearch = (search: RetainedSearch) =>
    setSearches((prev) => {
      const idx = prev.findIndex((s) => s.id === search.id);
      if (idx === -1) return [search, ...prev];
      const next = [...prev];
      next[idx] = search;
      return next;
    });
  const saveSearch = async (search: RetainedSearch, isNew: boolean) => {
    applySearch(search);
    const res = await send(isNew ? "/api/searches" : `/api/searches/${search.id}`, isNew ? "POST" : "PUT", search);
    if (res.ok) applySearch(await res.json());
  };
  const createEmptySearch = async () => {
    const date = todayISO();
    const search: RetainedSearch = {
      id: uid(),
      date,
      client: "New client",
      role: null,
      team: [user],
      stage: "sourcing",
      stageHistory: [{ stage: "sourcing", date }],
      retainerAmount: null,
      notes: null,
      addedBy: user,
      createdAt: new Date().toISOString(),
      candidates: [],
    };
    setFocusSearchId(search.id);
    await saveSearch(search, true);
  };
  const moveSearch = async (search: RetainedSearch, stage: SearchStage) => {
    const optimistic = { ...search, stage };
    applySearch(optimistic);
    const res = await send(`/api/searches/${search.id}`, "PUT", { ...optimistic, stageDate: todayISO() });
    if (res.ok) applySearch(await res.json());
  };
  const deleteSearch = async (id: string) => {
    setSearches((prev) => prev.filter((s) => s.id !== id));
    await send(`/api/searches/${id}`, "DELETE");
  };
  const saveSearchCandidate = async (searchId: string, candidate: SearchCandidate, isNew: boolean) => {
    setSearches((prev) =>
      prev.map((s) => {
        if (s.id !== searchId) return s;
        const candidates = s.candidates ?? [];
        const idx = candidates.findIndex((c) => c.id === candidate.id);
        const nextCandidates = idx === -1 ? [candidate, ...candidates] : candidates.map((c, i) => (i === idx ? candidate : c));
        return { ...s, candidates: nextCandidates };
      })
    );
    const res = await send(
      isNew ? `/api/searches/${searchId}/candidates` : `/api/searches/${searchId}/candidates/${candidate.id}`,
      isNew ? "POST" : "PUT",
      candidate
    );
    if (res.ok) {
      const saved = (await res.json()) as SearchCandidate;
      setSearches((prev) =>
        prev.map((s) => {
          if (s.id !== searchId) return s;
          const candidates = s.candidates ?? [];
          const idx = candidates.findIndex((c) => c.id === saved.id);
          const nextCandidates = idx === -1 ? [saved, ...candidates] : candidates.map((c, i) => (i === idx ? saved : c));
          return { ...s, candidates: nextCandidates };
        })
      );
    }
  };
  const moveSearchCandidate = async (searchId: string, candidate: SearchCandidate, stage: CandidateStage) => {
    const optimistic = { ...candidate, stage };
    setSearches((prev) =>
      prev.map((s) => {
        if (s.id !== searchId) return s;
        return {
          ...s,
          candidates: (s.candidates ?? []).map((c) => (c.id === candidate.id ? optimistic : c)),
        };
      })
    );
    const res = await send(`/api/searches/${searchId}/candidates/${candidate.id}`, "PUT", {
      ...optimistic,
      stageDate: todayISO(),
    });
    if (res.ok) {
      const saved = (await res.json()) as SearchCandidate;
      setSearches((prev) =>
        prev.map((s) => {
          if (s.id !== searchId) return s;
          return {
            ...s,
            candidates: (s.candidates ?? []).map((c) => (c.id === saved.id ? saved : c)),
          };
        })
      );
    }
  };
  const deleteSearchCandidate = async (searchId: string, candidateId: string) => {
    setSearches((prev) =>
      prev.map((s) => {
        if (s.id !== searchId) return s;
        return { ...s, candidates: (s.candidates ?? []).filter((c) => c.id !== candidateId) };
      })
    );
    await send(`/api/searches/${searchId}/candidates/${candidateId}`, "DELETE");
  };

  const monthEntries = useMemo(() => entries.filter((e) => e.date?.startsWith(monthKey)), [entries, monthKey]);
  const monthBillings = useMemo(() => billings.filter((b) => b.date?.startsWith(monthKey)), [billings, monthKey]);
  const monthSearches = useMemo(() => searches.filter((s) => s.date?.startsWith(monthKey)), [searches, monthKey]);

  const filteredSearches = useMemo(() => {
    let list = [...monthSearches];
    if (filterTeam !== "All") list = list.filter((s) => s.team.includes(filterTeam));
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (s) =>
          s.client.toLowerCase().includes(q) ||
          s.role?.toLowerCase().includes(q) ||
          s.team.some((n) => n.toLowerCase().includes(q))
      );
    }
    return list;
  }, [monthSearches, filterTeam, query]);

  const filteredEntries = useMemo(() => {
    let list = [...monthEntries];
    if (filterTeam !== "All") list = list.filter((e) => (e.team || []).includes(filterTeam));
    if (filterStage === "declined") list = list.filter((e) => e.declined);
    else if (filterStage !== "All") list = list.filter((e) => e.stage === filterStage && !e.declined);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (e) =>
          e.candidate?.toLowerCase().includes(q) ||
          e.company?.toLowerCase().includes(q) ||
          e.role?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [monthEntries, filterTeam, filterStage, query]);

  const filteredBillings = useMemo(() => {
    let list = [...monthBillings];
    if (filterTeam !== "All") list = list.filter((b) => b.team.includes(filterTeam));
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (b) =>
          b.team.some((name) => name.toLowerCase().includes(q)) ||
          b.company?.toLowerCase().includes(q) ||
          b.candidate?.toLowerCase().includes(q) ||
          b.role?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [monthBillings, filterTeam, query]);

  const sendoutStats = useMemo(() => {
    const active = monthEntries.filter((e) => !e.declined && e.stage !== "placed");
    return {
      total: monthEntries.length,
      firstTimeCount: monthEntries.filter((e) => e.firstTime).length,
      active: active.length,
      placed: monthEntries.filter((e) => e.stage === "placed" && !e.declined).length,
      declined: monthEntries.filter((e) => e.declined).length,
    };
  }, [monthEntries]);

  const searchStats = useMemo(() => {
    const active = monthSearches.filter((s) => s.stage !== "placed" && s.stage !== "stale");
    return {
      total: monthSearches.length,
      active: active.length,
      placed: monthSearches.filter((s) => s.stage === "placed").length,
      stale: monthSearches.filter((s) => s.stage === "stale").length,
      candidates: monthSearches.reduce((sum, s) => sum + (s.candidates?.length ?? 0), 0),
    };
  }, [monthSearches]);

  const yearBillings = useMemo(
    () => billings.filter((b) => b.date?.startsWith(String(reportYear))),
    [billings, reportYear]
  );
  const reportStats = useMemo(() => {
    const report = buildYearReport({
      billings,
      entries,
      searches,
      teamNames,
      year: reportYear,
      goals: reportGoals,
    });
    const byPerson: Record<string, number> = {};
    for (const b of yearBillings) for (const name of b.team) byPerson[name] = (byPerson[name] || 0) + b.amount;
    let topName = "—";
    let topAmount = 0;
    for (const [name, amount] of Object.entries(byPerson)) {
      if (amount > topAmount) {
        topName = name;
        topAmount = amount;
      }
    }
    return {
      total: report.kpis.billed,
      deals: report.kpis.deals,
      sendOuts: report.kpis.sendOuts,
      offers: report.kpis.offers,
      placements: report.kpis.placements,
      topName,
    };
  }, [billings, entries, searches, teamNames, reportYear, reportGoals, yearBillings]);

  const leaderboardStats = useMemo(() => {
    const firstTimeCount = monthEntries.filter((e) => e.firstTime).length;
    const tally: Record<string, number> = {};
    for (const e of monthEntries) {
      const credited = e.team.length ? e.team : ["Unassigned"];
      for (const name of credited) tally[name] = (tally[name] || 0) + 1;
    }
    let topName = "—";
    let topCount = 0;
    for (const [name, count] of Object.entries(tally)) {
      if (count > topCount) {
        topName = name;
        topCount = count;
      }
    }
    return { total: monthEntries.length, firstTimeCount, topName };
  }, [monthEntries]);

  if (tvOpen) {
    return <TVMode entries={entries} billings={billings} roster={teamNames} onExit={() => setTvOpen(false)} />;
  }

  return (
    <div style={S.page} className="app-shell">
      <header style={S.header} className="no-print avid-header">
        <div style={S.headerLeft}>
          <span className="avid-brand" style={{ ...S.heroEyebrow, marginBottom: 0 }}>AVID ASSOCIATES</span>
        </div>
        <div style={S.monthSwitcher}>
          {view === "report" ? (
            <>
              <button className="avid-btn" style={S.iconGhost} onClick={() => setReportYear((y) => y - 1)} title="Previous year">
                <ChevronLeft size={16} />
              </button>
              <span style={S.monthLabel}>{reportYear}</span>
              <button className="avid-btn" style={S.iconGhost} onClick={() => setReportYear((y) => y + 1)} title="Next year">
                <ChevronRight size={16} />
              </button>
            </>
          ) : (
            <>
              <button className="avid-btn" style={S.iconGhost} onClick={goPrevMonth} title="Previous month">
                <ChevronLeft size={16} />
              </button>
              <span style={S.monthLabel}>{monthLabel}</span>
              <button className="avid-btn" style={S.iconGhost} onClick={goNextMonth} title="Next month">
                <ChevronRight size={16} />
              </button>
            </>
          )}
        </div>
        <div style={S.headerRight}>
          <button className="avid-btn avid-tv-btn" style={S.iconGhost} onClick={() => setTvOpen(true)} title="TV mode">
            <Tv size={17} />
          </button>
          <button className="avid-btn" style={S.iconGhost} onClick={onToggleTheme} title={isDark ? "Light mode" : "Dark mode"}>
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          {isAdmin && (
            <button className="avid-btn" style={S.iconGhost} onClick={() => setShowSettings(true)} title="Settings">
              <Settings size={16} />
            </button>
          )}
          <button className="avid-btn" style={S.iconGhost} onClick={onLogout} title="Sign out">
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <section style={S.hero} className="no-print avid-hero">
        {view === "report" ? (
          <div className="avid-hero-inline" style={S.heroInlineRow}>
            <h1 className="avid-hero-title" style={S.heroInlineTitle}>Production Reports</h1>
            <div className="avid-hero-stats" style={S.heroStatsRow}>
              <HeroStat S={S} label="Billed YTD" value={money(reportStats.total)} color={STAGE_COLOR.placed} />
              <HeroStat S={S} label="Send-Outs" value={String(reportStats.sendOuts)} color={STAGE_COLOR.sent} />
              <HeroStat S={S} label="Offers" value={String(reportStats.offers)} color={STAGE_COLOR.offer} />
              <HeroStat S={S} label="Placed" value={String(reportStats.placements)} color={STAGE_COLOR.placed} />
              <HeroStat S={S} label="Top Producer" value={reportStats.topName} color={t.accent} />
            </div>
            <div />
          </div>
        ) : view === "leaderboard" ? (
          <>
            <h1 className="avid-hero-title" style={S.heroTitle}>Leaderboard</h1>
            <div className="avid-hero-stats" style={S.heroStatsRow}>
              <HeroStat S={S} label="Send-Outs" value={String(leaderboardStats.total)} />
              <HeroStat S={S} label="First-Time" value={String(leaderboardStats.firstTimeCount)} color={t.accent} />
              <HeroStat S={S} label="Top This Month" value={leaderboardStats.topName} color={STAGE_COLOR.placed} />
            </div>
          </>
        ) : view === "searches" ? (
          <div className="avid-hero-inline" style={S.heroInlineRow}>
            <h1 className="avid-hero-title" style={S.heroInlineTitle}>Searches</h1>
            <div className="avid-hero-stats" style={S.heroStatsRow}>
              <HeroStat S={S} label="Total" value={String(searchStats.total)} />
              <HeroStat S={S} label="Active" value={String(searchStats.active)} color={SEARCH_STAGE_COLOR.interviewing} />
              <HeroStat S={S} label="Placed" value={String(searchStats.placed)} color={SEARCH_STAGE_COLOR.placed} />
              <HeroStat S={S} label="Stale" value={String(searchStats.stale)} color={SEARCH_STAGE_COLOR.stale} />
              <HeroStat S={S} label="Candidates" value={String(searchStats.candidates)} color={t.accent} />
            </div>
            <div />
          </div>
        ) : (
          <TableSlidePanels
            view={view}
            sendouts={
              <div className="avid-hero-inline" style={S.heroInlineRow}>
                <h1 className="avid-hero-title" style={S.heroInlineTitle}>Send-Outs</h1>
                <div className="avid-hero-stats" style={S.heroStatsRow}>
                  <HeroStat S={S} label="Total" value={String(sendoutStats.total)} />
                  <HeroStat S={S} label="First-Time" value={String(sendoutStats.firstTimeCount)} color={t.accent} />
                  <HeroStat S={S} label="Active" value={String(sendoutStats.active)} color={STAGE_COLOR.interview} />
                  <HeroStat S={S} label="Placed" value={String(sendoutStats.placed)} color={STAGE_COLOR.placed} />
                  <HeroStat S={S} label="Declined" value={String(sendoutStats.declined)} color={t.danger} />
                </div>
                <div />
              </div>
            }
            billings={
              <div className="avid-hero-inline" style={S.heroInlineRow}>
                <h1 className="avid-hero-title" style={S.heroInlineTitle}>Billings</h1>
                <BillingsGoalStats billings={billings} monthKey={monthKey} year={monthCursorYear} goals={billingsGoals} t={t} />
                <div />
              </div>
            }
          />
        )}
      </section>

      <div style={S.toolbar} className="no-print avid-toolbar">
        <div style={S.segWrap}>
          <button
            className="avid-btn"
            style={view === "searches" ? S.segBtnActive : S.segBtn}
            onClick={() => setView("searches")}
          >
            Searches
          </button>
          <button
            className="avid-btn"
            style={view === "sendouts" ? S.segBtnActive : S.segBtn}
            onClick={() => setView("sendouts")}
          >
            Send-Outs
          </button>
          <button
            className="avid-btn"
            style={view === "billings" ? S.segBtnActive : S.segBtn}
            onClick={() => setView("billings")}
          >
            Billings
          </button>
          <button
            className="avid-btn"
            style={view === "report" ? S.segBtnActive : S.segBtn}
            onClick={() => setView("report")}
          >
            Reports
          </button>
          <button
            className="avid-btn"
            style={view === "leaderboard" ? S.segBtnActive : S.segBtn}
            onClick={() => setView("leaderboard")}
          >
            Leaderboard
          </button>
        </div>
        {view !== "report" && view !== "leaderboard" && (
          <>
            <div style={S.searchWrap}>
              <Search size={15} color={t.mutedSoft} />
              <input
                style={S.search}
                placeholder={
                  view === "searches"
                    ? "Search client, role, recruiter…"
                    : view === "sendouts"
                      ? "Search candidate, company, role…"
                      : "Search recruiter, company, candidate…"
                }
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <SelectPill S={S} value={filterTeam} onChange={setFilterTeam} options={["All", ...teamNames]} />
            {view === "sendouts" && (
              <SelectPill
                S={S}
                value={filterStage}
                onChange={setFilterStage}
                options={["All", ...PIPELINE.map((s) => s.key), "declined"]}
                labels={{ All: "All stages", declined: "Declined", ...Object.fromEntries(PIPELINE.map((s) => [s.key, s.label])) }}
              />
            )}
            <button
              className="avid-btn" style={S.primaryBtn}
              onClick={() => {
                if (view === "searches") {
                  void createEmptySearch();
                } else if (view === "sendouts") {
                  // Toggles the inline new-send-out row at the top of the
                  // table -- clicking again slides it back away (cancel).
                  setShowEntryForm((v) => !v);
                } else {
                  setEditingBilling(null);
                  setShowBillingForm(true);
                }
              }}
            >
              <Plus size={15} /> New
            </button>
          </>
        )}
      </div>

      <div style={S.tableWrap} className="report-card">
        {loading ? (
          <div style={S.empty}>Loading…</div>
        ) : view === "report" ? (
          <div style={S.reportPad}>
            <ReportView
              billings={billings}
              entries={entries}
              searches={searches}
              teamNames={teamNames}
              year={reportYear}
              goals={reportGoals}
              t={t}
              isDark={isDark}
            />
          </div>
        ) : view === "leaderboard" ? (
          <div style={S.reportPad}>
            <LeaderboardView entries={monthEntries} teamNames={teamNames} t={t} />
            <div style={S.reportSection}>
              <h3 style={S.chartTitle}>Billings — MTD &amp; YTD</h3>
              <p style={S.chartSubtitle}>Per-recruiter billings for {monthLabel}, personal and shared searches.</p>
              <div className="avid-billings-scroll">
                <BillingsTable billings={billings} teamNames={teamNames} monthKey={monthKey} year={monthCursorYear} t={t} />
              </div>
            </div>
          </div>
        ) : view === "searches" ? (
          <SearchesView
            searches={filteredSearches}
            totalCount={monthSearches.length}
            t={t}
            teamNames={teamNames}
            user={user}
            focusSearchId={focusSearchId}
            onFocusSearchDone={() => setFocusSearchId(null)}
            onSaveSearch={(search, isNew) => saveSearch(search, isNew)}
            onDeleteSearch={deleteSearch}
            onMoveSearch={moveSearch}
            onSaveCandidate={saveSearchCandidate}
            onDeleteCandidate={deleteSearchCandidate}
            onMoveCandidate={moveSearchCandidate}
          />
        ) : (
          <TableSlidePanels
            view={view}
            sendouts={
              <div>
                {!isMobile && (filteredEntries.length > 0 || showEntryForm) && (
                  <div style={{ ...S.cardHeaderRow, ...S.soGrid }}>
                    <div style={S.soCol}>Date</div>
                    <div style={S.soCol}>Candidate</div>
                    <div style={S.soCol}>Company</div>
                    <div style={S.soStatusCol}>Status</div>
                    <div style={S.soCol}>Role</div>
                    <div style={S.soCol}>Team</div>
                    <div style={S.soActionsCol}>Actions</div>
                  </div>
                )}
                <NewEntryRow
                  S={S}
                  t={t}
                  mobile={isMobile}
                  teamNames={teamNames}
                  user={user}
                  open={showEntryForm}
                  onSave={async (entry) => {
                    await saveEntry(entry, true);
                    setShowEntryForm(false);
                  }}
                  onCancel={() => setShowEntryForm(false)}
                />
                {filteredEntries.length === 0 && !showEntryForm ? (
                  <div style={S.empty}>
                    {entries.length === 0 ? "No send-outs yet — add the first one." : "Nothing matches these filters."}
                  </div>
                ) : (
                  filteredEntries.map((e) => (
                    <EntryRow
                      key={e.id}
                      S={S}
                      t={t}
                      entry={e}
                      mobile={isMobile}
                      teamNames={teamNames}
                      onSaveEntry={(updated) => saveEntry(updated, false)}
                      onDelete={() => deleteEntry(e.id)}
                      onSetStage={(stage) => advanceStage(e, stage)}
                      onRestore={() => setDeclined(e, false)}
                      onDecline={(reason) => setDeclined(e, true, reason)}
                      onLogMeeting={(type, round, date) => logMeeting(e, type, round, date)}
                      onDeleteMeeting={(meetingId) => deleteMeeting(e, meetingId)}
                      onUpdateMeetingDate={(meetingId, date) => updateMeetingDate(e, meetingId, date)}
                    />
                  ))
                )}
              </div>
            }
            billings={
              <div>
                {filteredBillings.length === 0 ? (
                  <div style={S.empty}>
                    {billings.length === 0 ? "No billings yet — log the first one." : "Nothing matches these filters."}
                  </div>
                ) : (
                  <div>
                    {!isMobile && (
                      <div style={{ ...S.cardHeaderRow, ...S.soGrid }}>
                        <div style={S.soCol}>Date</div>
                        <div style={S.soCol}>Candidate</div>
                        <div style={S.soCol}>Company</div>
                        <div style={S.soStatusCol}>Amount</div>
                        <div style={S.soCol}>Role</div>
                        <div style={S.soCol}>Team</div>
                        <div style={S.soActionsCol}>Actions</div>
                      </div>
                    )}
                    {filteredBillings.map((b) => (
                      <BillingRow
                        key={b.id}
                        S={S}
                        t={t}
                        billing={b}
                        mobile={isMobile}
                        teamNames={teamNames}
                        onSave={(updated) => saveBilling(updated, false)}
                        onDelete={() => deleteBilling(b.id)}
                        onSetCollectionStage={(stage) => advanceBillingCollection(b, stage)}
                        onUpdateCollectionDate={(logId, date) => updateBillingCollectionDate(b, logId, date)}
                      />
                    ))}
                  </div>
                )}
              </div>
            }
          />
        )}
      </div>

      {showBillingForm && (
        <BillingForm
          S={S}
          t={t}
          initial={editingBilling}
          user={user}
          teamNames={teamNames}
          onClose={() => setShowBillingForm(false)}
          onSave={async (billing, isNew) => {
            await saveBilling(billing, isNew);
            setShowBillingForm(false);
          }}
        />
      )}

      {showSettings && (
        <SettingsModal
          S={S}
          t={t}
          roster={roster}
          reloadRoster={reloadRoster}
          year={monthCursorYear}
          initialYearly={billingsGoals.yearlyGoal}
          initialMonthly={billingsGoals.monthlyGoal}
          onSavedGoals={handleGoalsSaved}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

function HeroStat({ S, label, value, color }: { S: Styles; label: string; value: string; color?: string }) {
  return (
    <div style={S.heroStat}>
      <div className="avid-hero-stat-value" style={{ ...S.heroStatValue, color: color || S._t.ink }}>{value}</div>
      <div className="avid-hero-stat-label" style={S.heroStatLabel}>{label}</div>
    </div>
  );
}

function SelectPill({
  S,
  value,
  onChange,
  options,
  labels,
}: {
  S: Styles;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  labels?: Record<string, string>;
}) {
  return (
    <GlassSelect
      value={value}
      options={options}
      labels={labels}
      onChange={onChange}
      triggerStyle={S.selectPill}
    />
  );
}

// A blocking confirmation before any destructive delete -- same modal
// material as the Billing form, reused by every trash-icon Delete button.
function ConfirmDeleteDialog({
  S,
  open,
  itemLabel,
  onConfirm,
  onCancel,
}: {
  S: Styles;
  open: boolean;
  itemLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="avid-overlay" style={S.modalOverlay} onClick={onCancel}>
      <div className="avid-modal" style={{ ...S.modal, maxWidth: 380 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: "22px 22px 4px" }}>
          <div style={S.modalTitle}>Delete {itemLabel}?</div>
          <p style={{ fontSize: 13, color: S._t.muted, marginTop: 8, lineHeight: 1.5 }}>This cannot be undone.</p>
        </div>
        <div style={S.modalFooter}>
          <button type="button" className="avid-btn" style={S.ghostBtn} onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="avid-btn" style={S.primaryBtn} onClick={onConfirm}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function EntryRow({
  S,
  t,
  entry,
  mobile,
  teamNames,
  onSaveEntry,
  onDelete,
  onSetStage,
  onRestore,
  onDecline,
  onLogMeeting,
  onDeleteMeeting,
  onUpdateMeetingDate,
}: {
  S: Styles;
  t: Theme;
  mobile?: boolean;
  entry: Entry;
  teamNames: string[];
  onSaveEntry: (entry: Entry) => void;
  onDelete: () => void;
  onSetStage: (stage: Stage) => void;
  onRestore: () => void;
  onDecline: (reason: DeclineReason) => void;
  onLogMeeting: (type: string, round: number, date: string) => void;
  onDeleteMeeting: (meetingId: string) => void;
  onUpdateMeetingDate: (meetingId: string, date: string) => void;
}) {
  // Status and Edit are two separate things: Status expands the pipeline
  // tracker + activity log (view only, nothing editable). Edit turns the
  // row's own cells into editable fields in place and shows a Save bar --
  // it does not show the tracker. Only one can be open at a time.
  const [mode, setMode] = useState<"status" | "edit" | null>(null);
  const statusOpen = mode === "status";
  const editOpen = mode === "edit";
  const toggleStatus = () => setMode((m) => (m === "status" ? null : "status"));
  const toggleEdit = () => setMode((m) => (m === "edit" ? null : "edit"));
  const [confirmDelete, setConfirmDelete] = useState(false);

  const makeDraft = () => ({
    date: entry.date,
    candidate: entry.candidate,
    company: entry.company,
    role: entry.role || "",
    team: entry.team,
    firstTime: entry.firstTime,
  });
  const [draft, setDraft] = useState(makeDraft);
  // Every time edit mode opens, start from the entry's current values --
  // adjusted during render (not an effect), same pattern StageProgress uses
  // for its pop animation below.
  const [prevEditOpen, setPrevEditOpen] = useState(editOpen);
  if (editOpen !== prevEditOpen) {
    setPrevEditOpen(editOpen);
    if (editOpen) setDraft(makeDraft());
  }
  const toggleTeam = (name: string) =>
    setDraft((d) => ({ ...d, team: d.team.includes(name) ? d.team.filter((n) => n !== name) : [...d.team, name] }));
  const canSave = Boolean(draft.candidate.trim() && draft.company.trim() && draft.date);
  const handleSave = () => {
    onSaveEntry({ ...entry, ...draft, role: draft.role || null });
    setMode(null);
  };

  const dateField = (
    <GlassDatePicker
      value={draft.date}
      onChange={(iso) => setDraft((d) => ({ ...d, date: iso }))}
      triggerStyle={{ ...S.input, width: "100%", padding: "5px 7px", fontSize: 12.5, textAlign: "center" }}
    />
  );
  const candidateField = (
    <input
      style={{ ...S.input, width: "100%", padding: "5px 7px", fontSize: 13.5, fontWeight: 600, textAlign: "center" }}
      value={draft.candidate}
      placeholder="Full name"
      onChange={(e) => setDraft((d) => ({ ...d, candidate: e.target.value }))}
    />
  );
  const companyField = (
    <input
      style={{ ...S.input, width: "100%", padding: "5px 7px", fontSize: 12.5, textAlign: "center" }}
      value={draft.company}
      placeholder="Client company"
      onChange={(e) => setDraft((d) => ({ ...d, company: e.target.value }))}
    />
  );
  const roleField = (
    <input
      style={{ ...S.input, width: "100%", padding: "5px 7px", fontSize: 12.5, textAlign: "center" }}
      value={draft.role}
      placeholder="e.g. Account Manager"
      onChange={(e) => setDraft((d) => ({ ...d, role: e.target.value }))}
    />
  );
  const teamField = (
    <TeamMultiSelect S={S} teamNames={teamNames} selected={draft.team} onToggle={toggleTeam} />
  );

  if (mobile) {
    // Phone layout: a stacked card — the 7-column grid can't fit a phone.
    return (
      <div>
        <div
          className="avid-row avid-row-enter"
          style={{
            padding: "16px 16px 14px",
            borderBottom: mode ? "none" : `1px solid ${t.border}`,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {editOpen ? (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {candidateField}
                {dateField}
              </div>
              {companyField}
              {roleField}
              {teamField}
            </>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
                <div style={S.cardPrimary}>{entry.candidate}</div>
                <div style={{ ...S.cardSub, marginTop: 0, whiteSpace: "nowrap" }}>{fmtDate(entry.date)}</div>
              </div>
              <div style={{ ...S.cardSub, marginTop: 0 }}>
                {[entry.company, entry.role, (entry.team || []).join("/")].filter(Boolean).join(" · ")}
              </div>
            </>
          )}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <ProcessStatusControl t={t} entry={entry} expanded={statusOpen} onToggle={toggleStatus} />
            <div style={{ display: "flex", gap: 2 }}>
              <button className="avid-btn" style={S.iconGhost} onClick={toggleEdit} title="Edit">
                <Pencil size={14} />
              </button>
              <button
                className="avid-btn"
                style={{ ...S.iconGhost, color: t.danger }}
                onClick={() => setConfirmDelete(true)}
                title="Delete"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>
        <RowExpandedPanel
          S={S}
          t={t}
          mobile={mobile}
          entry={entry}
          statusOpen={statusOpen}
          editOpen={editOpen}
          firstTime={draft.firstTime}
          onToggleFirstTime={(firstTime) => setDraft((d) => ({ ...d, firstTime }))}
          canSave={canSave}
          onSave={handleSave}
          onCloseStatus={() => setMode(null)}
          onSetStage={onSetStage}
          onRestore={onRestore}
          onDecline={onDecline}
          onLogMeeting={onLogMeeting}
          onDeleteMeeting={onDeleteMeeting}
          onUpdateMeetingDate={onUpdateMeetingDate}
        />
        <ConfirmDeleteDialog
          S={S}
          open={confirmDelete}
          itemLabel={`the send-out for ${entry.candidate}`}
          onConfirm={() => {
            setConfirmDelete(false);
            onDelete();
          }}
          onCancel={() => setConfirmDelete(false)}
        />
      </div>
    );
  }

  return (
    <div>
      <div
        className="avid-row avid-row-enter"
        style={mode ? { ...S.cardRow, ...S.soGrid, borderBottom: "none" } : { ...S.cardRow, ...S.soGrid }}
      >
        <div style={S.soCol}>{editOpen ? dateField : <div style={S.cardSub}>{fmtDate(entry.date)}</div>}</div>
        <div style={S.soCol}>{editOpen ? candidateField : <div style={S.cardPrimary}>{entry.candidate}</div>}</div>
        <div style={S.soCol}>{editOpen ? companyField : <div style={S.cardSub}>{entry.company}</div>}</div>
        <div style={S.soStatusCol}>
          <ProcessStatusControl t={t} entry={entry} expanded={statusOpen} onToggle={toggleStatus} />
        </div>
        <div style={S.soCol}>{editOpen ? roleField : <div style={S.cardSub}>{entry.role || "—"}</div>}</div>
        <div style={S.soCol}>
          {editOpen ? teamField : <div style={S.cardSub}>{(entry.team || []).join("/") || "—"}</div>}
        </div>
        <div style={S.soActionsCol}>
          <button className="avid-btn" style={S.iconGhost} onClick={toggleEdit} title="Edit">
            <Pencil size={14} />
          </button>
          <button
            className="avid-btn"
            style={{ ...S.iconGhost, color: t.danger }}
            onClick={() => setConfirmDelete(true)}
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      <RowExpandedPanel
        S={S}
        t={t}
        mobile={mobile}
        entry={entry}
        statusOpen={statusOpen}
        editOpen={editOpen}
        firstTime={draft.firstTime}
        onToggleFirstTime={(firstTime) => setDraft((d) => ({ ...d, firstTime }))}
        canSave={canSave}
        onSave={handleSave}
        onCloseStatus={() => setMode(null)}
        onSetStage={onSetStage}
        onRestore={onRestore}
        onDecline={onDecline}
        onLogMeeting={onLogMeeting}
        onDeleteMeeting={onDeleteMeeting}
        onUpdateMeetingDate={onUpdateMeetingDate}
      />
      <ConfirmDeleteDialog
        S={S}
        open={confirmDelete}
        itemLabel={`the send-out for ${entry.candidate}`}
        onConfirm={() => {
          setConfirmDelete(false);
          onDelete();
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}

// The inline replacement for the old New Send-Out dialog: "+ New" slides
// this row in at the top of the table (pushing the current top send-out
// down), looking exactly like an existing row in edit mode -- the same
// per-column fields with prompt placeholders, Status pre-set to Sent, and
// the same bottom bar (First-time/Repeat tab, Save). Always mounted; the
// 0fr/1fr grid-rows trick animates the slide both ways.
function NewEntryRow({
  S,
  t,
  mobile,
  teamNames,
  user,
  open,
  onSave,
  onCancel,
}: {
  S: Styles;
  t: Theme;
  mobile?: boolean;
  teamNames: string[];
  user: string;
  open: boolean;
  onSave: (entry: Entry) => void;
  onCancel: () => void;
}) {
  const emptyDraft = { date: "", candidate: "", company: "", role: "", team: [] as string[], firstTime: true };
  const [draft, setDraft] = useState(emptyDraft);
  // Fresh blank fields every time the row slides open -- adjusted during
  // render (not an effect), same pattern as EntryRow's edit draft.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setDraft(emptyDraft);
  }
  const toggleTeam = (name: string) =>
    setDraft((d) => ({ ...d, team: d.team.includes(name) ? d.team.filter((n) => n !== name) : [...d.team, name] }));
  const canSave = Boolean(draft.candidate.trim() && draft.company.trim() && draft.date);
  const handleSave = () =>
    onSave({
      id: uid(),
      date: draft.date,
      candidate: draft.candidate.trim(),
      company: draft.company.trim(),
      role: draft.role.trim() || null,
      interviewType: "Phone",
      round: 1,
      team: draft.team,
      stage: "sent",
      stageHistory: [],
      meetingLog: [],
      declined: false,
      declinedReason: null,
      notes: "",
      addedBy: user,
      createdAt: "",
      firstTime: draft.firstTime,
    });

  const dateField = (
    <GlassDatePicker
      value={draft.date}
      onChange={(iso) => setDraft((d) => ({ ...d, date: iso }))}
      placeholder="Select Date"
      triggerStyle={{ ...S.input, width: "100%", padding: "5px 7px", fontSize: 12.5, textAlign: "center" }}
    />
  );
  const candidateField = (
    <input
      style={{ ...S.input, width: "100%", padding: "5px 7px", fontSize: 13.5, fontWeight: 600, textAlign: "center" }}
      value={draft.candidate}
      placeholder="Candidate Name"
      onChange={(e) => setDraft((d) => ({ ...d, candidate: e.target.value }))}
    />
  );
  const companyField = (
    <input
      style={{ ...S.input, width: "100%", padding: "5px 7px", fontSize: 12.5, textAlign: "center" }}
      value={draft.company}
      placeholder="Company Name"
      onChange={(e) => setDraft((d) => ({ ...d, company: e.target.value }))}
    />
  );
  const roleField = (
    <input
      style={{ ...S.input, width: "100%", padding: "5px 7px", fontSize: 12.5, textAlign: "center" }}
      value={draft.role}
      placeholder="Role Name"
      onChange={(e) => setDraft((d) => ({ ...d, role: e.target.value }))}
    />
  );
  const teamField = <TeamMultiSelect S={S} teamNames={teamNames} selected={draft.team} onToggle={toggleTeam} />;
  // Every new send-out starts at Sent, same as the pipeline itself.
  const sentStatus = (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <span style={{ width: 10, height: 10, borderRadius: "50%", background: STAGE_COLOR.sent, flexShrink: 0 }} />
      <span style={{ fontSize: 12.5, fontWeight: 700, color: STAGE_COLOR.sent }}>Sent</span>
    </span>
  );
  const firstTimeTabs = (
    <div style={S.segWrap}>
      <button
        type="button"
        className="avid-btn"
        style={draft.firstTime ? S.segBtnActive : S.segBtn}
        onClick={() => setDraft((d) => ({ ...d, firstTime: true }))}
      >
        First-time
      </button>
      <button
        type="button"
        className="avid-btn"
        style={!draft.firstTime ? S.segBtnActive : S.segBtn}
        onClick={() => setDraft((d) => ({ ...d, firstTime: false }))}
      >
        Repeat
      </button>
    </div>
  );
  // Cancel/Save grouped in the same segmented-tab look as the First-time/
  // Repeat toggle -- Save wears the active tab style, Cancel the muted one.
  const cancelSaveTabs = (
    <div style={S.segWrap}>
      <button type="button" className="avid-btn" style={S.segBtn} onClick={onCancel}>
        Cancel
      </button>
      <button
        type="button"
        className="avid-btn"
        style={{ ...S.segBtnActive, opacity: canSave ? 1 : 0.5 }}
        disabled={!canSave}
        onClick={handleSave}
      >
        Save
      </button>
    </div>
  );
  const bottomBar = mobile ? (
    <div
      style={{
        padding: "0 16px 14px",
        borderBottom: `1px solid ${t.border}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      {firstTimeTabs}
      {cancelSaveTabs}
    </div>
  ) : (
    // Mirrors the row's own 7-column soGrid above so Cancel/Save lands
    // centered under the Actions column, same as a normal row's icons.
    <div
      style={{
        padding: "0 22px 20px",
        borderBottom: `1px solid ${t.border}`,
        display: "grid",
        gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
        columnGap: 20,
        alignItems: "center",
      }}
    >
      <div style={{ gridColumn: "1 / 7", display: "flex" }}>{firstTimeTabs}</div>
      <div style={{ gridColumn: "7 / 8", display: "flex", justifyContent: "center" }}>{cancelSaveTabs}</div>
    </div>
  );

  return (
    <div className="avid-expand" style={{ gridTemplateRows: open ? "1fr" : "0fr" }}>
      <div>
        {mobile ? (
          <div
            style={{
              padding: "16px 16px 14px",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {candidateField}
              {dateField}
            </div>
            {companyField}
            {roleField}
            {teamField}
            {sentStatus}
          </div>
        ) : (
          <div style={{ ...S.cardRow, ...S.soGrid, borderBottom: "none" }}>
            <div style={S.soCol}>{dateField}</div>
            <div style={S.soCol}>{candidateField}</div>
            <div style={S.soCol}>{companyField}</div>
            <div style={S.soStatusCol}>{sentStatus}</div>
            <div style={S.soCol}>{roleField}</div>
            <div style={S.soCol}>{teamField}</div>
            <div style={S.soActionsCol} />
          </div>
        )}
        {bottomBar}
      </div>
    </div>
  );
}

// Compact activity-log labels matching the office shorthand: T = Telephone,
// F = Face-to-Face, V = Video, each with its round in parens. The Offer and
// Placed markers (auto-logged when those stages are reached) just read
// "Offer" / "Placed", same as a meeting entry's round is irrelevant to them.
const MEETING_TYPE_CODE: Record<string, string> = { Phone: "T", "Face-to-Face": "F", Video: "V" };
function activityLabel(type: string, round: number) {
  if (type === "Offer" || type === "Placed") return type;
  return `${MEETING_TYPE_CODE[type] ?? type[0]}(${round})`;
}

// round) should suggest round 1 for that type, not continue Phone's count.
function maxRoundForType(entry: Entry, type: string) {
  const rounds = entry.meetingLog
    .filter((m) => m.type === type && m.type !== "Offer" && m.type !== "Placed")
    .map((m) => m.round);
  return rounds.length ? Math.max(...rounds) : 0;
}

function nextRoundForType(entry: Entry, type: string) {
  return maxRoundForType(entry, type) + 1;
}

function statusTrackLayout(large: boolean | undefined, isMobile: boolean) {
  const trackWidth = large ? (isMobile ? 240 : 340) : 220;
  const dotSize = large ? 22 : 13;
  const edgePad = large ? dotSize / 2 + 6 : 0;
  const declineReserve = large ? 108 : 0;
  return {
    trackWidth,
    edgePad,
    declineReserve,
    dotSize,
    columnWidth: edgePad + trackWidth + declineReserve,
  };
}

function activityLogRowKey(m: MeetingLogEntry) {
  if (m.type === "Offer" || m.type === "Placed") return `stage-${m.type}-${m.id}`;
  return `mtg-${m.id}`;
}

// Background polls must not resurrect meeting-log rows the user just deleted
// while the DELETE is still in flight.
function mergeEntries(local: Entry[], remote: Entry[]): Entry[] {
  const remoteById = new Map(remote.map((e) => [e.id, e]));
  const merged = local.map((le) => {
    const re = remoteById.get(le.id);
    if (!re) return le;
    remoteById.delete(le.id);

    const localIsSubset = le.meetingLog.every((m) => re.meetingLog.some((r) => r.id === m.id));
    const hasPendingDeletes = localIsSubset && le.meetingLog.length < re.meetingLog.length;

    if (hasPendingDeletes) {
      return {
        ...re,
        meetingLog: le.meetingLog,
        stage: le.stage,
        interviewType: le.interviewType,
        round: le.round,
      };
    }
    return re;
  });

  for (const re of remoteById.values()) merged.push(re);
  return merged;
}

// A compact status icon standing in for the whole process — click it to
// expand the row into the full timeline (Sent date, Interview's activity
// log, Offer, Placed) instead of opening a floating popover. While in
// Interview, it also shows the latest logged meeting (e.g. "Interview
// T(2)") so the most recent update is visible without expanding.
function ProcessStatusControl({
  t,
  entry,
  expanded,
  onToggle,
}: {
  t: Theme;
  entry: Entry;
  expanded: boolean;
  onToggle: () => void;
}) {
  const idx = Math.max(0, PIPELINE.findIndex((s) => s.key === entry.stage));
  const color = entry.declined ? t.danger : STAGE_COLOR[entry.stage];
  const last = entry.meetingLog[entry.meetingLog.length - 1];
  const label = entry.declined ? "Declined" : PIPELINE[idx].label;
  const suffix = !entry.declined && entry.stage === "interview" && last ? ` ${activityLabel(last.type, last.round)}` : "";
  return (
    <button
      type="button"
      className="avid-btn"
      onClick={onToggle}
      title={expanded ? "Hide process" : "View process"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        border: "none",
        background: "none",
        padding: 0,
        cursor: "pointer",
        font: "inherit",
      }}
    >
      <span style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0 }} />
      <span style={{ fontSize: 12.5, fontWeight: 700 }}>
        <span style={{ color }}>{label}</span>
        {suffix ? <span style={{ color: t.ink }}>{suffix}</span> : null}
      </span>
    </button>
  );
}

// Status and Edit each get their own content in this shared expand slot,
// never both at once. Status: the unchanged Sent/Interview/Offer/Placed
// tracker + activity log, with a Done button (view only, nothing saved).
// Edit: just the bottom bar (First-time/Repeat tab + Save) -- the actual
// editable fields live up in the row's own columns, not here. Always
// mounted regardless of open/closed state — the 0fr/1fr grid-rows trick
// (see .avid-expand) animates height smoothly both ways, and never resizes
// the row above.
function RowExpandedPanel({
  S,
  t,
  mobile,
  entry,
  statusOpen,
  editOpen,
  firstTime,
  onToggleFirstTime,
  canSave,
  onSave,
  onCloseStatus,
  onSetStage,
  onRestore,
  onDecline,
  onLogMeeting,
  onDeleteMeeting,
  onUpdateMeetingDate,
}: {
  S: Styles;
  t: Theme;
  mobile?: boolean;
  entry: Entry;
  statusOpen: boolean;
  editOpen: boolean;
  firstTime: boolean;
  onToggleFirstTime: (firstTime: boolean) => void;
  canSave: boolean;
  onSave: () => void;
  onCloseStatus: () => void;
  onSetStage: (stage: Stage) => void;
  onRestore: () => void;
  onDecline: (reason: DeclineReason) => void;
  onLogMeeting: (type: string, round: number, date: string) => void;
  onDeleteMeeting: (meetingId: string) => void;
  onUpdateMeetingDate: (meetingId: string, date: string) => void;
}) {
  const prevStageRef = useRef(entry.stage);
  const prevEntryIdRef = useRef(entry.id);
  const [placedConfetti, setPlacedConfetti] = useState(false);

  useEffect(() => {
    if (prevEntryIdRef.current !== entry.id) {
      prevEntryIdRef.current = entry.id;
      prevStageRef.current = entry.stage;
      setPlacedConfetti(false);
      return;
    }
    if (statusOpen && prevStageRef.current !== "placed" && entry.stage === "placed") {
      setPlacedConfetti(true);
      const timer = window.setTimeout(() => setPlacedConfetti(false), 2800);
      prevStageRef.current = entry.stage;
      return () => window.clearTimeout(timer);
    }
    prevStageRef.current = entry.stage;
  }, [entry.id, entry.stage, statusOpen]);

  const showActivityLog =
    entry.meetingLog.length > 0 ||
    entry.stage === "interview" ||
    entry.stage === "offer" ||
    entry.stage === "placed";

  const isMobile = useIsMobile();
  const { trackWidth, edgePad, columnWidth } = statusTrackLayout(true, isMobile);
  const trackMidpoint = edgePad + trackWidth / 2;

  return (
    <div className="avid-expand" style={{ gridTemplateRows: statusOpen || editOpen ? "1fr" : "0fr" }}>
      <div>
        <div
          className="avid-expand-panel"
          style={{
            // Headroom so hover-grown stage dots and edge labels are not clipped.
            padding: "16px 30px 20px",
            borderBottom: `1px solid ${t.border}`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 18,
          }}
        >
          {editOpen ? (
            mobile ? (
              <div style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={S.segWrap}>
                  <button
                    type="button"
                    className="avid-btn"
                    style={firstTime ? S.segBtnActive : S.segBtn}
                    onClick={() => onToggleFirstTime(true)}
                  >
                    First-time
                  </button>
                  <button
                    type="button"
                    className="avid-btn"
                    style={!firstTime ? S.segBtnActive : S.segBtn}
                    onClick={() => onToggleFirstTime(false)}
                  >
                    Repeat
                  </button>
                </div>
                <button
                  type="button"
                  className="avid-btn"
                  style={{ ...S.ghostBtn, opacity: canSave ? 1 : 0.5 }}
                  disabled={!canSave}
                  onClick={onSave}
                >
                  Save
                </button>
              </div>
            ) : (
              // Mirrors the row's own 7-column soGrid above so Save lands
              // centered under the Actions column, same as the Edit/Delete
              // icons on the collapsed row.
              <div style={{ width: "100%", display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", columnGap: 20, alignItems: "center" }}>
                <div style={{ gridColumn: "1 / 7", display: "flex" }}>
                  <div style={S.segWrap}>
                    <button
                      type="button"
                      className="avid-btn"
                      style={firstTime ? S.segBtnActive : S.segBtn}
                      onClick={() => onToggleFirstTime(true)}
                    >
                      First-time
                    </button>
                    <button
                      type="button"
                      className="avid-btn"
                      style={!firstTime ? S.segBtnActive : S.segBtn}
                      onClick={() => onToggleFirstTime(false)}
                    >
                      Repeat
                    </button>
                  </div>
                </div>
                <div style={{ gridColumn: "7 / 8", display: "flex", justifyContent: "center" }}>
                  <button
                    type="button"
                    className="avid-btn"
                    style={{ ...S.ghostBtn, opacity: canSave ? 1 : 0.5 }}
                    disabled={!canSave}
                    onClick={onSave}
                  >
                    Save
                  </button>
                </div>
              </div>
            )
          ) : (
            <>
              <div className="avid-status-stack">
                {placedConfetti ? <PlacedConfettiRain /> : null}
                <div
                  className="avid-status-align-column"
                  style={{ width: columnWidth, marginLeft: `calc(50% - ${trackMidpoint}px)` }}
                >
                  <StageProgress
                    t={t}
                    stage={entry.stage}
                    declined={entry.declined}
                    declinedReason={entry.declinedReason}
                    onSetStage={onSetStage}
                    onRestore={onRestore}
                    onDecline={onDecline}
                    large
                  />
                  {showActivityLog ? (
                    <div className="avid-status-activity-log" style={{ width: trackWidth, marginLeft: edgePad }}>
                      <ActivityLogPanel
                        S={S}
                        t={t}
                        entry={entry}
                        onLog={onLogMeeting}
                        onDelete={onDeleteMeeting}
                        onUpdateDate={onUpdateMeetingDate}
                      />
                    </div>
                  ) : null}
                </div>
              </div>
              <button type="button" className="avid-btn" style={{ ...S.ghostBtn, alignSelf: "flex-end" }} onClick={onCloseStatus}>
                Done
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// The activity log: every logged meeting (T(1), then T(2), then F(1), ...)
// plus the Offer marker once that stage is reached, and a way to log the
// next meeting while still in Interview. Each entry can be deleted (logged
// by mistake); the date defaults to today and only opens a picker if
// clicked.
const PLACED_CONFETTI_COLORS = ["#FFFFFF", "#F5D547", "#FF8FA3", "#7DD3FC", "#C4B5FD", "#FDE68A", "#86EFAC", "#FCA5A5"];

function PlacedConfettiRain() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 52 }, (_, i) => {
        const streamer = i % 5 === 0;
        const wave = Math.floor(i / 13);
        return {
          id: i,
          left: 1 + ((i * 17.9 + wave * 7) % 98),
          delay: wave * 0.22 + (i % 13) * 0.045,
          duration: 1.35 + (i % 8) * 0.16,
          sway: -26 + (i % 17) * 3.2,
          spin: (i % 2 === 0 ? 1 : -1) * (240 + (i % 9) * 70),
          fall: 150 + wave * 38 + (i % 5) * 14,
          color: PLACED_CONFETTI_COLORS[i % PLACED_CONFETTI_COLORS.length],
          w: streamer ? 2 : 4 + (i % 3),
          h: streamer ? 11 + (i % 3) * 2 : 3 + (i % 2),
          streamer,
        };
      }),
    []
  );

  return (
    <div className="avid-placed-confetti" aria-hidden>
      {pieces.map((p) => (
        <span
          key={p.id}
          className={[
            "avid-placed-confetti-piece",
            p.streamer ? "avid-placed-confetti-piece--streamer" : "",
            !p.streamer && p.id % 4 === 0 ? "avid-placed-confetti-piece--round" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          style={
            {
              "--left": `${p.left}%`,
              "--delay": `${p.delay}s`,
              "--duration": `${p.duration}s`,
              "--sway": `${p.sway}px`,
              "--spin": `${p.spin}deg`,
              "--fall": `${p.fall}px`,
              "--color": p.color,
              "--w": `${p.w}px`,
              "--h": `${p.h}px`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

const ACTIVITY_COMPOSE_DELAY_MS = 520;

function ActivityLogPanel({
  S,
  t,
  entry,
  onLog,
  onDelete,
  onUpdateDate,
}: {
  S: Styles;
  t: Theme;
  entry: Entry;
  onLog: (type: string, round: number, date: string) => void;
  onDelete: (meetingId: string) => void;
  onUpdateDate: (meetingId: string, date: string) => void;
}) {
  const lastMeeting = [...entry.meetingLog].reverse().find((m) => m.type !== "Offer" && m.type !== "Placed");
  const defaultType = lastMeeting?.type || "Phone";
  const [draftType, setDraftType] = useState(defaultType);
  const [draftRound, setDraftRound] = useState(() => nextRoundForType(entry, defaultType));
  const [draftDate, setDraftDate] = useState(todayISO());
  const canCompose = entry.stage === "interview" && !entry.declined;
  const [composeEverShown, setComposeEverShown] = useState(canCompose);
  const [composeExiting, setComposeExiting] = useState(false);
  const panelEntryIdRef = useRef(entry.id);
  const prevLogLenRef = useRef(entry.meetingLog.length);
  const prevStageRef = useRef(entry.stage);
  const [enteringLogIds, setEnteringLogIds] = useState<Set<string>>(() => new Set());
  const [exitingLogIds, setExitingLogIds] = useState<Set<string>>(() => new Set());

  const handleLog = () => {
    const type = draftType;
    const round = draftRound;
    const date = draftDate;
    onLog(type, round, date);
    const peek: MeetingLogEntry = { id: "_peek", type, round, date };
    setDraftType(type);
    setDraftRound(nextRoundForType({ ...entry, meetingLog: [...entry.meetingLog, peek] }, type));
  };

  const clearEntering = (id: string) => {
    setEnteringLogIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const requestDelete = (id: string) => {
    if (exitingLogIds.has(id)) return;
    setExitingLogIds((prev) => new Set(prev).add(id));
  };

  const finishDelete = (id: string) => {
    setExitingLogIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    onDelete(id);
  };

  useEffect(() => {
    if (panelEntryIdRef.current !== entry.id) {
      panelEntryIdRef.current = entry.id;
      prevLogLenRef.current = entry.meetingLog.length;
      prevStageRef.current = entry.stage;
      setEnteringLogIds(new Set());
      setExitingLogIds(new Set());
      const last = [...entry.meetingLog].reverse().find((m) => m.type !== "Offer" && m.type !== "Placed");
      const type = last?.type || "Phone";
      setDraftType(type);
      setDraftRound(nextRoundForType(entry, type));
      setComposeEverShown(entry.stage === "interview" && !entry.declined);
      setComposeExiting(false);
      return;
    }

    const len = entry.meetingLog.length;
    if (len > prevLogLenRef.current) {
      const added = entry.meetingLog.slice(prevLogLenRef.current);
      setEnteringLogIds((prev) => new Set([...prev, ...added.map((m) => m.id)]));
      prevLogLenRef.current = len;
      prevStageRef.current = entry.stage;
      return;
    }

    if (entry.stage !== prevStageRef.current && (entry.stage === "offer" || entry.stage === "placed")) {
      const markerType = entry.stage === "offer" ? "Offer" : "Placed";
      const marker = [...entry.meetingLog].reverse().find((m) => m.type === markerType);
      if (marker) {
        setEnteringLogIds((prev) => new Set(prev).add(marker.id));
      }
    }

    prevLogLenRef.current = len;
    prevStageRef.current = entry.stage;
  }, [entry.id, entry.meetingLog, entry.stage, entry.declined]);

  useEffect(() => {
    if (canCompose) {
      setComposeEverShown(true);
      setComposeExiting(false);
      return;
    }
    if (!composeEverShown || composeExiting) return;

    const delayTimer = window.setTimeout(() => {
      setComposeExiting(true);
    }, ACTIVITY_COMPOSE_DELAY_MS);

    return () => window.clearTimeout(delayTimer);
  }, [canCompose, composeEverShown, composeExiting]);

  return (
    <div className="avid-activity-log">
      <div
        style={{
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: 0.4,
          textTransform: "uppercase",
          color: t.mutedSoft,
          marginBottom: 8,
        }}
      >
        Activity log
      </div>
      {entry.meetingLog.length === 0 ? (
        <div style={{ fontSize: 12, color: t.mutedSoft, marginBottom: 10 }}>Nothing logged yet.</div>
      ) : (
        <div className="avid-activity-log-list">
          {entry.meetingLog.map((m) => {
            const rowKey = activityLogRowKey(m);
            const isEntering = enteringLogIds.has(m.id);
            const isExiting = exitingLogIds.has(m.id);
            return (
              <div
                key={rowKey}
                className={[
                  "avid-activity-log-row",
                  isEntering ? "avid-activity-log-row--enter" : "",
                  isExiting ? "avid-activity-log-row--exit" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onAnimationEnd={(e) => {
                  if (e.target !== e.currentTarget) return;
                  if (e.animationName === "avidActivityRowIn") clearEntering(m.id);
                  if (e.animationName === "avidActivityRowOut") finishDelete(m.id);
                }}
              >
                <span className="avid-activity-log-label" style={{ color: t.ink, fontWeight: 600 }}>
                  {activityLabel(m.type, m.round)}
                </span>
                <div className="avid-activity-log-actions">
                  <GlassDatePicker
                    value={m.date}
                    onChange={(iso) => onUpdateDate(m.id, iso)}
                    triggerStyle={{
                      ...S.input,
                      padding: "2px 7px",
                      fontSize: 12,
                      color: t.muted,
                      fontVariantNumeric: "tabular-nums",
                      minWidth: 0,
                    }}
                  />
                  <button
                    type="button"
                    className="avid-btn"
                    onClick={() => requestDelete(m.id)}
                    title="Remove this entry"
                    style={{ border: "none", background: "none", padding: 2, cursor: "pointer", color: t.mutedSoft, display: "flex" }}
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {composeEverShown ? (
        <div
          className={`avid-activity-compose-wrap${composeExiting ? " avid-activity-compose-wrap--exit" : ""}`}
          style={{ borderTopColor: t.border }}
        >
          <div>
            <div className="avid-activity-compose" style={{ borderTopColor: t.border }}>
              <div style={{ display: "flex", gap: 10 }}>
                <GlassSelect
                  value={draftType}
                  options={INTERVIEW_TYPES}
                  onChange={(type) => {
                    setDraftType(type);
                    setDraftRound(nextRoundForType(entry, type));
                  }}
                  triggerStyle={{ ...S.input, flex: "1 1 0", minWidth: 0, padding: "7px 9px", fontSize: 12.5, textAlign: "center" }}
                />
                <input
                  type="number"
                  min="1"
                  value={draftRound}
                  onChange={(e) => setDraftRound(Number(e.target.value))}
                  style={{ ...S.input, width: 64, padding: "7px 9px", fontSize: 12.5, textAlign: "center" }}
                />
                <GlassDatePicker
                  value={draftDate}
                  onChange={setDraftDate}
                  triggerStyle={{ ...S.input, flex: "1 1 0", minWidth: 0, padding: "7px 9px", fontSize: 12.5, textAlign: "center" }}
                />
              </div>
              <button
                type="button"
                className="avid-btn"
                style={{ ...S.ghostBtn, textAlign: "center" as const, padding: "8px 10px", fontSize: 12.5 }}
                onClick={handleLog}
              >
                + Log meeting
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ---------- Liquid Glass pickers (iOS 27 beta) ----------
// One shared anchor-and-dismiss brain for every glass popover: outside
// click (scoped by data attribute) and Escape close it; placement keeps it
// centered under its trigger and inside the viewport, re-measured on
// scroll/resize.
function useGlassPopover(attr: string, width: number, estHeight: number) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!(e.target instanceof Element) || !e.target.closest(`[${attr}]`)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, attr]);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- measures real DOM
       layout (getBoundingClientRect), which is only available in an effect */
    if (!open) {
      setPos(null);
      return;
    }
    const place = () => {
      const el = btnRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const left = Math.min(Math.max(rect.left + rect.width / 2, width / 2 + 8), window.innerWidth - width / 2 - 8);
      const top = Math.min(rect.bottom + 6, Math.max(8, window.innerHeight - estHeight - 8));
      setPos({ top, left });
    };
    place();
    /* eslint-enable react-hooks/set-state-in-effect */
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, width, estHeight]);

  return { open, setOpen, pos, btnRef };
}

// Portals the glass popover shell so every menu/calendar shares one z-index stack.
function GlassPopoverPortal({
  attr,
  pos,
  children,
  transform = "translateX(-50%)",
}: {
  attr: string;
  pos: { top: number; left: number };
  children: ReactNode;
  transform?: string;
}) {
  if (typeof document === "undefined") return null;
  const attrMark = { [attr]: "" } as Record<string, string>;
  return createPortal(
    <div {...attrMark} style={{ position: "fixed", top: pos.top, left: pos.left, transform, zIndex: 1000 }}>
      {children}
    </div>,
    document.body
  );
}

// One shared row treatment for every glass menu: full-bleed (the pane's
// big radius does the clipping), regular weight, with a leading checkmark
// slot reserved so labels never shift as selection changes -- iOS menus.
function glassMenuRow(withCheckSlot: boolean): React.CSSProperties {
  return {
    border: "none",
    color: GLASS_FG,
    textAlign: "left",
    padding: withCheckSlot ? "11px 16px 11px 11px" : "11px 16px",
    fontSize: 14.5,
    fontWeight: 400,
    fontFamily: FONT,
    cursor: "pointer",
    whiteSpace: "nowrap",
    display: "flex",
    alignItems: "center",
    gap: 7,
  };
}

function GlassCheckSlot({ checked }: { checked: boolean }) {
  return (
    <span style={{ width: 20, display: "flex", justifyContent: "center", flexShrink: 0 }}>
      {checked && <Check size={15} color={GLASS_FG} strokeWidth={2.5} />}
    </span>
  );
}

// Single-select dropdown on the glass menu system -- the app-wide
// replacement for native <select>, so every dropdown matches (native
// selects render the OS's own menu, which isn't glass on any platform).
function GlassSelect({
  value,
  options,
  labels,
  onChange,
  triggerStyle,
}: {
  value: string;
  options: string[];
  labels?: Record<string, string>;
  onChange: (v: string) => void;
  triggerStyle: React.CSSProperties;
}) {
  const { open, setOpen, pos, btnRef } = useGlassPopover("data-glass-select", 210, options.length * 42 + 16);
  const display = labels?.[value] || value;
  return (
    <>
      <button
        ref={btnRef}
        type="button"
        data-glass-select
        className="avid-btn"
        onClick={() => setOpen((v) => !v)}
        style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontFamily: FONT, ...triggerStyle }}
      >
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "inherit" }}>
          {display}
        </span>
        <ChevronDown size={12} style={{ flexShrink: 0, opacity: 0.6 }} />
      </button>
      {open && pos && (
        <GlassPopoverPortal attr="data-glass-select" pos={pos}>
          <div
            className="avid-glass-pop avid-glass-popover"
            style={{ display: "flex", flexDirection: "column", minWidth: 210, maxHeight: 336, overflowY: "auto" }}
          >
            {options.map((opt, i) => (
              <Fragment key={opt}>
                {i > 0 && <div className="avid-glass-sep" />}
                <button
                  type="button"
                  onClick={() => {
                    onChange(opt);
                    setOpen(false);
                  }}
                  className="avid-glass-option"
                  style={glassMenuRow(true)}
                >
                  <GlassCheckSlot checked={opt === value} />
                  {labels?.[opt] || opt}
                </button>
              </Fragment>
            ))}
          </div>
        </GlassPopoverPortal>
      )}
    </>
  );
}

// Date field on the glass system: shows just the value until clicked, then
// opens the same glass calendar the stage tracker uses -- the app-wide
// replacement for native <input type="date">, so every calendar matches.
function GlassDatePicker({
  value,
  onChange,
  triggerStyle,
  placeholder = "Set date",
}: {
  value: string;
  onChange: (iso: string) => void;
  triggerStyle: React.CSSProperties;
  placeholder?: string;
}) {
  const { open, setOpen, pos, btnRef } = useGlassPopover("data-glass-date", 262, 330);
  return (
    <>
      <button
        ref={btnRef}
        type="button"
        data-glass-date
        className="avid-btn"
        title="Click to change date"
        onClick={() => setOpen((v) => !v)}
        style={{ cursor: "pointer", whiteSpace: "nowrap", fontFamily: FONT, ...triggerStyle }}
      >
        {value ? fmtDate(value) : placeholder}
      </button>
      {open && pos && (
        <GlassPopoverPortal attr="data-glass-date" pos={pos}>
          <div className="avid-glass-pop avid-glass-popover" style={{ padding: "12px 10px 10px" }}>
            <MiniCalendar
              value={value || null}
              onSelect={(iso) => {
                onChange(iso);
                setOpen(false);
              }}
            />
          </div>
        </GlassPopoverPortal>
      )}
    </>
  );
}

// A closed-by-default dropdown for picking any number of team members --
// same glass menu as GlassSelect, but toggling doesn't dismiss, so several
// names can be checked in one visit.
function TeamMultiSelect({
  S,
  teamNames,
  selected,
  onToggle,
}: {
  S: Styles;
  teamNames: string[];
  selected: string[];
  onToggle: (name: string) => void;
}) {
  const { open, setOpen, pos, btnRef } = useGlassPopover("data-team-popover", 210, teamNames.length * 42 + 16);
  const label = selected.length ? selected.join("/") : "Select Team";

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        data-team-popover
        className="avid-btn"
        onClick={() => setOpen((v) => !v)}
        style={{
          ...S.input,
          width: "100%",
          padding: "5px 7px",
          fontSize: 12.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 5,
          cursor: "pointer",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
        <ChevronDown size={12} style={{ flexShrink: 0, opacity: 0.6 }} />
      </button>
      {open && pos && (
        <GlassPopoverPortal attr="data-team-popover" pos={pos}>
          <div
            className="avid-glass-pop avid-glass-popover"
            style={{ display: "flex", flexDirection: "column", minWidth: 210 }}
          >
            {teamNames.map((name, i) => (
              <Fragment key={name}>
                {i > 0 && <div className="avid-glass-sep" />}
                <button
                  type="button"
                  onClick={() => onToggle(name)}
                  className="avid-glass-option"
                  style={glassMenuRow(true)}
                >
                  <GlassCheckSlot checked={selected.includes(name)} />
                  {name}
                </button>
              </Fragment>
            ))}
          </div>
        </GlassPopoverPortal>
      )}
    </>
  );
}

function BillingAmountControl({
  t,
  billing,
  expanded,
  onToggle,
}: {
  t: Theme;
  billing: Billing;
  expanded: boolean;
  onToggle: () => void;
}) {
  const meta = BILLING_COLLECTION.find((s) => s.key === billing.collectionStage) ?? BILLING_COLLECTION[0];
  return (
    <button
      type="button"
      className="avid-btn"
      onClick={onToggle}
      title={expanded ? "Hide collection status" : "View collection status"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        border: "none",
        background: "none",
        padding: 0,
        cursor: "pointer",
        font: "inherit",
      }}
    >
      <span style={{ width: 10, height: 10, borderRadius: "50%", background: meta.color, flexShrink: 0 }} />
      <span style={{ fontSize: 12.5, fontWeight: 700, color: t.ink, fontVariantNumeric: "tabular-nums" }}>{money(billing.amount)}</span>
    </button>
  );
}

function BillingCollectionLogPanel({
  S,
  t,
  billing,
  onUpdateDate,
}: {
  S: Styles;
  t: Theme;
  billing: Billing;
  onUpdateDate: (logId: string, date: string) => void;
}) {
  return (
    <div style={{ width: "100%", maxWidth: 380 }}>
      <div
        style={{
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: 0.4,
          textTransform: "uppercase",
          color: t.mutedSoft,
          marginBottom: 8,
        }}
      >
        Activity log
      </div>
      {billing.collectionLog.length === 0 ? (
        <div style={{ fontSize: 12, color: t.mutedSoft }}>Nothing logged yet.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {billing.collectionLog.map((entry) => (
            <div
              key={entry.id}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 0" }}
            >
              <span style={{ fontSize: 12.5, fontWeight: 600, color: t.ink }}>{entry.type}</span>
              <GlassDatePicker
                value={entry.date}
                onChange={(iso) => onUpdateDate(entry.id, iso)}
                triggerStyle={{
                  ...S.input,
                  padding: "2px 7px",
                  fontSize: 12,
                  color: t.muted,
                  fontVariantNumeric: "tabular-nums",
                  minWidth: 0,
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BillingCollectionProgress({
  t,
  stage,
  onSetStage,
  large,
}: {
  t: Theme;
  stage: BillingCollectionStage;
  onSetStage?: (stage: BillingCollectionStage) => void;
  large?: boolean;
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const idx = Math.max(0, BILLING_COLLECTION.findIndex((s) => s.key === stage));
  const color = BILLING_COLLECTION[idx]?.color ?? STAGE_COLOR.placed;
  const fillPct = idx <= 0 ? 0 : 100;
  const isMobile = useIsMobile();
  const trackWidth = large ? (isMobile ? 200 : 280) : 180;
  const dotSize = large ? 22 : 13;
  const lineH = large ? 5 : 3;
  const inset = dotSize / 2;

  const [poppedIdx, setPoppedIdx] = useState<number | null>(null);
  const [prevIdx, setPrevIdx] = useState(idx);
  if (prevIdx !== idx) {
    setPrevIdx(idx);
    setPoppedIdx(idx);
  }
  useEffect(() => {
    if (poppedIdx === null) return;
    const timer = setTimeout(() => setPoppedIdx(null), 400);
    return () => clearTimeout(timer);
  }, [poppedIdx]);

  return (
    <div style={large ? { position: "relative", width: trackWidth } : { display: "flex", alignItems: "flex-start", gap: 14 }}>
      <div style={{ width: trackWidth }}>
        <div style={{ position: "relative", height: dotSize + 4 }}>
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: inset,
              right: inset,
              height: lineH,
              background: t.trackBg,
              borderRadius: lineH,
              transform: "translateY(-50%)",
            }}
          />
          <div
            className="avid-stage-fill"
            style={{
              position: "absolute",
              top: "50%",
              left: inset,
              width: `${(fillPct * (trackWidth - inset * 2)) / 100}px`,
              maxWidth: trackWidth - inset * 2,
              height: lineH,
              borderRadius: lineH,
              background: color,
              transform: "translateY(-50%)",
            }}
          />
          <div style={{ position: "relative", display: "flex", justifyContent: "space-between" }}>
            {BILLING_COLLECTION.map((s, i) => (
              <div
                key={s.key}
                style={{ position: "relative" }}
                onMouseEnter={() => setHoverIdx(i)}
                onMouseLeave={() => setHoverIdx((cur) => (cur === i ? null : cur))}
              >
                <button
                  onClick={() => {
                    if (i === idx) return;
                    onSetStage?.(s.key);
                  }}
                  title={s.label}
                  className={`avid-stage-dot${poppedIdx === i ? " avid-stage-pop" : ""}`}
                  style={{
                    width: dotSize,
                    height: dotSize,
                    borderRadius: "50%",
                    border: `2px solid ${i <= idx ? s.color : t.trackBg}`,
                    background: i <= idx ? s.color : t.surface,
                    cursor: "pointer",
                    padding: 0,
                    transform: hoverIdx === i ? "scale(1.25)" : "scale(1)",
                  }}
                />
              </div>
            ))}
          </div>
        </div>
        {large && (
          <div style={{ position: "relative", display: "flex", justifyContent: "space-between", marginTop: 9 }}>
            {BILLING_COLLECTION.map((s, i) => (
              <span
                key={s.key}
                style={{
                  fontSize: 12.5,
                  fontWeight: i === idx ? 700 : 500,
                  color: i === idx ? s.color : t.mutedSoft,
                  width: dotSize + 34,
                  textAlign: i === 0 ? "left" : i === BILLING_COLLECTION.length - 1 ? "right" : "center",
                  marginLeft: i === 0 ? -dotSize / 2 : 0,
                  marginRight: i === BILLING_COLLECTION.length - 1 ? -dotSize / 2 : 0,
                }}
              >
                {s.label}
              </span>
            ))}
          </div>
        )}
      </div>
      {!large && (
        <span style={{ fontSize: 12.5, fontWeight: 600, color, minWidth: 64 }}>{BILLING_COLLECTION[idx].label}</span>
      )}
    </div>
  );
}

function BillingExpandedPanel({
  S,
  t,
  billing,
  statusOpen,
  onCloseStatus,
  onSetStage,
  onUpdateDate,
}: {
  S: Styles;
  t: Theme;
  billing: Billing;
  statusOpen: boolean;
  onCloseStatus: () => void;
  onSetStage: (stage: BillingCollectionStage) => void;
  onUpdateDate: (logId: string, date: string) => void;
}) {
  return (
    <div className="avid-expand" style={{ gridTemplateRows: statusOpen ? "1fr" : "0fr" }}>
      <div>
        <div
          style={{
            padding: "12px 22px 20px",
            borderBottom: `1px solid ${t.border}`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 18,
          }}
        >
          <BillingCollectionProgress t={t} stage={billing.collectionStage} onSetStage={onSetStage} large />
          <BillingCollectionLogPanel S={S} t={t} billing={billing} onUpdateDate={onUpdateDate} />
          <button type="button" className="avid-btn" style={{ ...S.ghostBtn, alignSelf: "flex-end" }} onClick={onCloseStatus}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function BillingRow({
  S,
  t,
  billing,
  mobile,
  teamNames,
  onSave,
  onDelete,
  onSetCollectionStage,
  onUpdateCollectionDate,
}: {
  S: Styles;
  t: Theme;
  billing: Billing;
  mobile?: boolean;
  teamNames: string[];
  onSave: (billing: Billing) => void;
  onDelete: () => void;
  onSetCollectionStage: (stage: BillingCollectionStage) => void;
  onUpdateCollectionDate: (logId: string, date: string) => void;
}) {
  const [mode, setMode] = useState<"status" | "edit" | null>(null);
  const statusOpen = mode === "status";
  const editOpen = mode === "edit";
  const toggleStatus = () => setMode((m) => (m === "status" ? null : "status"));
  const toggleEdit = () => setMode((m) => (m === "edit" ? null : "edit"));
  const [confirmDelete, setConfirmDelete] = useState(false);

  const makeDraft = () => ({
    date: billing.date,
    candidate: billing.candidate || "",
    company: billing.company || "",
    role: billing.role || "",
    team: billing.team,
    amount: billing.amount,
  });
  const [draft, setDraft] = useState(makeDraft);
  const [prevEditOpen, setPrevEditOpen] = useState(editOpen);
  if (editOpen !== prevEditOpen) {
    setPrevEditOpen(editOpen);
    if (editOpen) setDraft(makeDraft());
  }

  const toggleTeam = (name: string) =>
    setDraft((d) => ({
      ...d,
      team: d.team.includes(name) ? d.team.filter((n) => n !== name) : [...d.team, name],
    }));
  const canSave = draft.team.length > 0 && draft.amount > 0 && Boolean(draft.date);
  const handleSave = () => {
    onSave({
      ...billing,
      date: draft.date,
      candidate: draft.candidate || null,
      company: draft.company || null,
      role: draft.role || null,
      team: draft.team,
      amount: draft.amount,
    });
    setMode(null);
  };

  const fieldStyle = { ...S.input, width: "100%", padding: "5px 7px", fontSize: 12.5, textAlign: "center" as const };
  const dateField = (
    <GlassDatePicker
      value={draft.date}
      onChange={(iso) => setDraft((d) => ({ ...d, date: iso }))}
      triggerStyle={fieldStyle}
    />
  );
  const candidateField = (
    <input
      style={{ ...fieldStyle, fontSize: 13.5, fontWeight: 600 }}
      value={draft.candidate}
      placeholder="Candidate"
      onChange={(e) => setDraft((d) => ({ ...d, candidate: e.target.value }))}
    />
  );
  const companyField = (
    <input
      style={fieldStyle}
      value={draft.company}
      placeholder="Company"
      onChange={(e) => setDraft((d) => ({ ...d, company: e.target.value }))}
    />
  );
  const amountField = (
    <input
      type="number"
      min="0"
      step="500"
      style={{ ...fieldStyle, fontWeight: 700 }}
      value={draft.amount || ""}
      onChange={(e) => setDraft((d) => ({ ...d, amount: Number(e.target.value) }))}
    />
  );
  const roleField = (
    <input
      style={fieldStyle}
      value={draft.role}
      placeholder="Role"
      onChange={(e) => setDraft((d) => ({ ...d, role: e.target.value }))}
    />
  );
  const teamField = <TeamMultiSelect S={S} teamNames={teamNames} selected={draft.team} onToggle={toggleTeam} />;

  const confirmDialog = (
    <ConfirmDeleteDialog
      S={S}
      open={confirmDelete}
      itemLabel={`the ${money(billing.amount)} billing${billing.company ? ` for ${billing.company}` : ""}`}
      onConfirm={() => {
        setConfirmDelete(false);
        onDelete();
      }}
      onCancel={() => setConfirmDelete(false)}
    />
  );

  const saveBar = (
    <div className="avid-expand" style={{ gridTemplateRows: editOpen ? "1fr" : "0fr" }}>
      <div>
        <div
          style={{
            padding: "12px 22px 20px",
            borderBottom: `1px solid ${t.border}`,
            display: "flex",
            justifyContent: mobile ? "flex-end" : undefined,
          }}
        >
          {mobile ? (
            <button
              type="button"
              className="avid-btn"
              style={{ ...S.ghostBtn, opacity: canSave ? 1 : 0.5 }}
              disabled={!canSave}
              onClick={handleSave}
            >
              Save
            </button>
          ) : (
            <div
              style={{
                width: "100%",
                display: "grid",
                gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
                columnGap: 20,
                alignItems: "center",
              }}
            >
              <div style={{ gridColumn: "7 / 8", display: "flex", justifyContent: "center" }}>
                <button
                  type="button"
                  className="avid-btn"
                  style={{ ...S.ghostBtn, opacity: canSave ? 1 : 0.5 }}
                  disabled={!canSave}
                  onClick={handleSave}
                >
                  Save
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (mobile) {
    return (
      <div>
        <div
          className="avid-row avid-row-enter"
          style={{
            padding: "14px 16px",
            borderBottom: statusOpen || editOpen ? "none" : `1px solid ${S._t.border}`,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {editOpen ? (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {candidateField}
                {dateField}
              </div>
              {companyField}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {amountField}
                {roleField}
              </div>
              {teamField}
            </>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
                <div style={S.cardPrimary}>{billing.candidate || "—"}</div>
                <BillingAmountControl t={t} billing={billing} expanded={statusOpen} onToggle={toggleStatus} />
              </div>
              <div style={{ ...S.cardSub, marginTop: 0 }}>
                {[billing.company, billing.role, billing.team.join("/"), fmtDate(billing.date)].filter(Boolean).join(" · ")}
              </div>
            </>
          )}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 2 }}>
            <button className="avid-btn" style={S.iconGhost} onClick={toggleEdit} title="Edit">
              <Pencil size={14} />
            </button>
            <button
              className="avid-btn"
              style={{ ...S.iconGhost, color: t.danger }}
              onClick={() => setConfirmDelete(true)}
              title="Delete"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
        <BillingExpandedPanel
          S={S}
          t={t}
          billing={billing}
          statusOpen={statusOpen}
          onCloseStatus={() => setMode(null)}
          onSetStage={onSetCollectionStage}
          onUpdateDate={onUpdateCollectionDate}
        />
        {saveBar}
        {confirmDialog}
      </div>
    );
  }

  return (
    <div>
      <div
        className="avid-row avid-row-enter"
        style={{ ...S.cardRow, ...S.soGrid, borderBottom: statusOpen || editOpen ? "none" : `1px solid ${S._t.border}` }}
      >
        <div style={S.soCol}>{editOpen ? dateField : <div style={S.cardSub}>{fmtDate(billing.date)}</div>}</div>
        <div style={S.soCol}>{editOpen ? candidateField : <div style={S.cardPrimary}>{billing.candidate || "—"}</div>}</div>
        <div style={S.soCol}>{editOpen ? companyField : <div style={S.cardSub}>{billing.company || "—"}</div>}</div>
        <div style={S.soStatusCol}>
          {editOpen ? (
            amountField
          ) : (
            <BillingAmountControl t={t} billing={billing} expanded={statusOpen} onToggle={toggleStatus} />
          )}
        </div>
        <div style={S.soCol}>{editOpen ? roleField : <div style={S.cardSub}>{billing.role || "—"}</div>}</div>
        <div style={S.soCol}>{editOpen ? teamField : <div style={S.cardSub}>{billing.team.join("/") || "—"}</div>}</div>
        <div style={S.soActionsCol}>
          <button className="avid-btn" style={S.iconGhost} onClick={toggleEdit} title="Edit">
            <Pencil size={14} />
          </button>
          <button
            className="avid-btn"
            style={{ ...S.iconGhost, color: t.danger }}
            onClick={() => setConfirmDelete(true)}
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      <BillingExpandedPanel
        S={S}
        t={t}
        billing={billing}
        statusOpen={statusOpen}
        onCloseStatus={() => setMode(null)}
        onSetStage={onSetCollectionStage}
        onUpdateDate={onUpdateCollectionDate}
      />
      {saveBar}
      {confirmDialog}
    </div>
  );
}

// ---------- stage progress indicator ----------

// Liquid Glass popover text — iOS 27 beta dark-menu label colors (fixed
// regardless of app theme; menus don't flip light/dark).
const GLASS_FG = "#F5F5F7";
const GLASS_FG_SECONDARY = "rgba(235, 235, 245, 0.55)";
const GLASS_FG_TERTIARY = "rgba(235, 235, 245, 0.28)";

const DECLINE_REASONS: { key: DeclineReason; label: string }[] = [
  { key: "candidate", label: "Rejected by candidate" },
  { key: "client", label: "Rejected by client" },
];

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

// iOS 27 beta inline date picker: month header, weekday caps, circular cells.
function MiniCalendar({ value, onSelect }: { value: string | null; onSelect: (iso: string) => void }) {
  const initial = value ? new Date(`${value}T00:00:00`) : new Date();
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());

  const first = new Date(viewYear, viewMonth, 1);
  const startWeekday = first.getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const monthLabel = first.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const today = todayISO();
  const isoFor = (day: number) => `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const goPrev = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };
  const goNext = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const cells: (number | null)[] = [
    ...Array(startWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div style={{ width: 238, color: GLASS_FG }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "2px 4px 10px 8px" }}>
        <span style={{ fontSize: 14.5, fontWeight: 600, letterSpacing: -0.2 }}>{monthLabel}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button onClick={goPrev} className="avid-cal-nav" style={{ border: "none", color: GLASS_FG, cursor: "pointer", display: "flex", padding: 5, borderRadius: 7 }}>
            <ChevronLeft size={16} strokeWidth={2.5} />
          </button>
          <button onClick={goNext} className="avid-cal-nav" style={{ border: "none", color: GLASS_FG, cursor: "pointer", display: "flex", padding: 5, borderRadius: 7 }}>
            <ChevronRight size={16} strokeWidth={2.5} />
          </button>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>
        {WEEKDAY_LABELS.map((d, i) => (
          <div key={i} style={{ fontSize: 10.5, fontWeight: 600, textAlign: "center", color: GLASS_FG_TERTIARY }}>
            {d}
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
        {cells.map((day, i) => {
          if (day === null) return <div key={i} />;
          const iso = isoFor(day);
          const isSelected = value === iso;
          const isToday = today === iso;
          return (
            <button
              key={i}
              onClick={() => onSelect(iso)}
              className="avid-cal-day"
              style={{
                width: 31,
                height: 31,
                borderRadius: "50%",
                border: "none",
                background: isSelected ? "rgba(255, 255, 255, 0.2)" : undefined,
                color: isSelected || isToday ? GLASS_FG : GLASS_FG_SECONDARY,
                fontSize: 13,
                fontWeight: isSelected || isToday ? 600 : 400,
                cursor: "pointer",
                fontVariantNumeric: "tabular-nums",
                boxShadow: isToday && !isSelected ? "inset 0 0 0 1.5px rgba(245, 245, 247, 0.32)" : "none",
              }}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StageProgress({
  t,
  stage,
  declined,
  declinedReason,
  onSetStage,
  onToggleDeclined,
  onRestore,
  onDecline,
  large,
}: {
  t: Theme;
  stage: Stage;
  declined: boolean;
  declinedReason?: DeclineReason | null;
  onSetStage?: (stage: Stage) => void;
  onToggleDeclined?: () => void;
  onRestore?: () => void;
  onDecline?: (reason: DeclineReason) => void;
  large?: boolean;
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [declineMenuOpen, setDeclineMenuOpen] = useState(false);
  const declineBtnRef = useRef<HTMLButtonElement | null>(null);
  const [declinePos, setDeclinePos] = useState<{ top: number; left: number } | null>(null);
  const idx = Math.max(0, PIPELINE.findIndex((s) => s.key === stage));
  const color = declined ? t.danger : STAGE_COLOR[stage];
  const fillPct = (idx / (PIPELINE.length - 1)) * 100;
  const isMobile = useIsMobile();
  // 340px + the absolutely-positioned decline button would overflow a
  // 390px phone; 240px leaves room for it inside the panel padding.
  const { trackWidth, edgePad, declineReserve, dotSize } = statusTrackLayout(large, isMobile);
  const lineH = large ? 5 : 3;
  const inset = dotSize / 2;

  // Replays the "pop" bounce on whichever dot just became active, without
  // ever remounting a dot — remounting skipped the color/border transition
  // on the dot losing active status, which looked like it never faded.
  const [poppedIdx, setPoppedIdx] = useState<number | null>(null);
  const [prevIdx, setPrevIdx] = useState(idx);
  if (prevIdx !== idx) {
    setPrevIdx(idx);
    setPoppedIdx(idx);
  }
  useEffect(() => {
    if (poppedIdx === null) return;
    const timer = setTimeout(() => setPoppedIdx(null), 400);
    return () => clearTimeout(timer);
  }, [poppedIdx]);

  // Decline-reason menu: opens to the right of the button, portaled to
  // <body> so it isn't clipped, and stays open until an outside click,
  // Escape, or picking an option.
  useEffect(() => {
    if (!declineMenuOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!(e.target instanceof Element) || !e.target.closest("[data-decline-popover]")) {
        setDeclineMenuOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDeclineMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [declineMenuOpen]);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- measures real DOM
       layout (getBoundingClientRect), which is only available in an effect */
    if (!declineMenuOpen) {
      setDeclinePos(null);
      return;
    }
    const place = () => {
      const el = declineBtnRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const width = 190;
      const left = Math.min(rect.right + 10, window.innerWidth - width - 8);
      const top = Math.min(Math.max(rect.top + rect.height / 2, 50), window.innerHeight - 90);
      setDeclinePos({ top, left });
    };
    place();
    /* eslint-enable react-hooks/set-state-in-effect */
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [declineMenuOpen]);

  // In large mode the decline control is pulled out of normal flow (absolute,
  // anchored off the track's own box) so it never adds width the outer
  // centering has to account for — the dots stay dead center regardless of
  // whether "Declined" is showing.
  return (
    <div
      className={large ? "avid-stage-progress-shell" : undefined}
      style={
        large
          ? {
              position: "relative",
              width: trackWidth + declineReserve,
              maxWidth: "100%",
              paddingLeft: edgePad,
              paddingTop: 8,
              paddingBottom: 4,
              boxSizing: "content-box",
            }
          : { display: "flex", alignItems: "flex-start", gap: 14 }
      }
    >
      <div style={{ width: trackWidth }}>
        <div style={{ position: "relative", height: dotSize + 4 }}>
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: inset,
              right: inset,
              height: lineH,
              background: t.trackBg,
              borderRadius: lineH,
              transform: "translateY(-50%)",
            }}
          />
          <div
            className="avid-stage-fill"
            style={{
              position: "absolute",
              top: "50%",
              left: inset,
              width: `${(fillPct * (trackWidth - inset * 2)) / 100}px`,
              maxWidth: trackWidth - inset * 2,
              height: lineH,
              borderRadius: lineH,
              background: declined ? t.trackBg : color,
              transform: "translateY(-50%)",
            }}
          />
          <div style={{ position: "relative", display: "flex", justifyContent: "space-between" }}>
            {PIPELINE.map((s, i) => {
              return (
                <div
                  key={`dot-${i}`}
                  style={{ position: "relative" }}
                  onMouseEnter={() => setHoverIdx(i)}
                  onMouseLeave={() => setHoverIdx((cur) => (cur === i ? null : cur))}
                >
                  <button
                    onClick={() => {
                      if (i === idx) return;
                      onSetStage?.(s.key);
                    }}
                    title={s.label}
                    className={`avid-stage-dot${poppedIdx === i ? " avid-stage-pop" : ""}`}
                    style={{
                      width: dotSize,
                      height: dotSize,
                      borderRadius: "50%",
                      border: `2px solid ${declined ? t.trackBg : i <= idx ? color : t.trackBg}`,
                      background: declined ? t.surface : i <= idx ? color : t.surface,
                      cursor: "pointer",
                      padding: 0,
                      transform: hoverIdx === i ? "scale(1.25)" : "scale(1)",
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
        {large && (
          <div style={{ position: "relative", display: "flex", justifyContent: "space-between", marginTop: 9 }}>
            {PIPELINE.map((s, i) => (
              <span
                key={s.key}
                style={{
                  fontSize: 12.5,
                  fontWeight: i === idx && !declined ? 700 : 500,
                  color: i === idx && !declined ? color : t.mutedSoft,
                  width: dotSize + 34,
                  textAlign: i === 0 ? "left" : i === PIPELINE.length - 1 ? "right" : "center",
                }}
              >
                {s.label}
              </span>
            ))}
          </div>
        )}
      </div>
      <div
        style={
          large
            ? { position: "absolute", left: "100%", top: 0, marginLeft: 22, display: "flex", alignItems: "center", gap: 10, height: dotSize + 4, whiteSpace: "nowrap" }
            : { display: "flex", alignItems: "center", gap: 8, height: dotSize + 4 }
        }
      >
        {!large && (
          <span style={{ fontSize: 12.5, fontWeight: 600, color, minWidth: 64 }}>
            {declined ? "Declined" : PIPELINE[idx].label}
          </span>
        )}
        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
          {declineMenuOpen && declinePos && (
            <GlassPopoverPortal attr="data-decline-popover" pos={declinePos} transform="translateY(-50%)">
              <div className="avid-glass-pop avid-glass-popover" style={{ display: "flex", flexDirection: "column", minWidth: 210 }}>
                {DECLINE_REASONS.map((r, i) => (
                  <Fragment key={r.key}>
                    {i > 0 && <div className="avid-glass-sep" />}
                    <button
                      onClick={() => {
                        onDecline?.(r.key);
                        setDeclineMenuOpen(false);
                      }}
                      className="avid-glass-option"
                      style={{
                        border: "none",
                        color: GLASS_FG,
                        textAlign: "left",
                        padding: "11px 16px",
                        fontSize: 14.5,
                        fontWeight: 400,
                        fontFamily: FONT,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {r.label}
                    </button>
                  </Fragment>
                ))}
              </div>
            </GlassPopoverPortal>
          )}
          <button
            ref={declineBtnRef}
            className="avid-btn"
            onClick={() => {
              if (declined) {
                if (onRestore) onRestore();
                else onToggleDeclined?.();
                return;
              }
              if (onDecline) {
                setDeclineMenuOpen((v) => !v);
                return;
              }
              onToggleDeclined?.();
            }}
            title={
              declined
                ? `Restore to pipeline${declinedReason ? ` (${DECLINE_REASONS.find((r) => r.key === declinedReason)?.label})` : ""}`
                : "Mark declined / dead"
            }
            style={{ border: "none", background: "none", cursor: "pointer", color: declined ? t.danger : t.trackBg, display: "flex", padding: 0 }}
          >
            <Ban size={large ? 18 : 14} />
          </button>
        </div>
        {large && declined && (
          <span style={{ fontSize: 13.5, fontWeight: 700, color: t.danger, flexShrink: 0, whiteSpace: "nowrap" }}>
            Declined
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================================
function BillingForm({
  S,
  t,
  initial,
  user,
  teamNames,
  onClose,
  onSave,
}: {
  S: Styles;
  t: Theme;
  initial: Billing | null;
  user: string;
  teamNames: string[];
  onClose: () => void;
  onSave: (billing: Billing, isNew: boolean) => void;
}) {
  const [form, setForm] = useState<Billing>(
    initial || {
      id: uid(),
      date: todayISO(),
      team: teamNames.includes(user) ? [user] : teamNames.slice(0, 1),
      amount: 0,
      company: "",
      candidate: "",
      role: "",
      notes: "",
      addedBy: user,
      createdAt: "",
      entryId: null,
      salary: null,
      feePercent: null,
      collectionStage: "invoiced",
      collectionHistory: [{ stage: "invoiced", date: todayISO() }],
      collectionLog: [{ id: uid(), type: "Invoiced", date: todayISO() }],
    }
  );
  const toggleTeam = (name: string) => {
    setForm((f) => {
      const has = f.team.includes(name);
      return { ...f, team: has ? f.team.filter((n) => n !== name) : [...f.team, name] };
    });
  };
  const set =
    (k: "date" | "company" | "candidate" | "role" | "notes") =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));
  const valid = form.team.length > 0 && form.amount > 0 && form.date;

  return (
    <div className="avid-overlay" style={S.modalOverlay} onClick={onClose}>
      <div className="avid-modal" style={S.modal} onClick={(e) => e.stopPropagation()}>
        <div style={S.modalHeader}>
          <div style={S.modalTitle}>{initial ? "Edit billing" : "Log billing"}</div>
          <button className="avid-btn" style={S.iconGhost} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="avid-form-grid" style={S.formGrid}>
          <Field S={S} label="Date">
            <GlassDatePicker
              value={form.date}
              onChange={(iso) => setForm((f) => ({ ...f, date: iso }))}
              triggerStyle={{ ...S.input, textAlign: "left" }}
            />
          </Field>
          <Field S={S} label="Amount ($)">
            <input
              type="number"
              min="0"
              step="500"
              style={S.input}
              placeholder="0"
              value={form.amount || ""}
              onChange={(e) => setForm((f) => ({ ...f, amount: Number(e.target.value) }))}
            />
          </Field>
          <Field S={S} label="Team" full>
            <TeamMultiSelect S={S} teamNames={teamNames} selected={form.team} onToggle={toggleTeam} />
            <div style={{ fontSize: 11.5, color: t.mutedSoft, marginTop: 8 }}>
              One person = solo deal (counts toward their Personal total). Two or more = team deal — the full amount
              credits everyone listed, toward Total only.
            </div>
          </Field>
          <Field S={S} label="Company">
            <input style={S.input} placeholder="Client company" value={form.company || ""} onChange={set("company")} />
          </Field>
          <Field S={S} label="Role">
            <input style={S.input} placeholder="e.g. Account Manager" value={form.role || ""} onChange={set("role")} />
          </Field>
          <Field S={S} label="Candidate placed">
            <input style={S.input} placeholder="Optional" value={form.candidate || ""} onChange={set("candidate")} />
          </Field>
          <Field S={S} label="Notes" full>
            <textarea
              style={{ ...S.input, minHeight: 60, fontFamily: "inherit", resize: "vertical" }}
              placeholder="Optional context…"
              value={form.notes || ""}
              onChange={set("notes")}
            />
          </Field>
        </div>

        <div style={S.modalFooter}>
          <button className="avid-btn" style={S.ghostBtn} onClick={onClose}>
            Cancel
          </button>
          <button className="avid-btn" style={{ ...S.primaryBtn, opacity: valid ? 1 : 0.5 }} disabled={!valid} onClick={() => onSave(form, !initial)}>
            {initial ? "Save changes" : "Log billing"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ S, label, children, full }: { S: Styles; label: string; children: ReactNode; full?: boolean }) {
  return (
    <div style={{ gridColumn: full ? "1 / -1" : "auto", display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={S.fieldLabel}>{label}</label>
      {children}
    </div>
  );
}
