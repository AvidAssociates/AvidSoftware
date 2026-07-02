"use client";

import { useState, useEffect, useMemo } from "react";
import type { ChangeEvent, ReactNode } from "react";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  LogOut,
  Ban,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Settings,
  Tv,
} from "lucide-react";
import { LOGO_ICON_SRC, LOGO_FULL_SRC } from "@/lib/logos";
import { Billing, DeclineReason, Entry, RosterMember, Stage } from "@/lib/types";
import {
  ADMIN,
  DEFAULT_TEAM,
  INTERVIEW_TYPES,
  PIPELINE,
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

// ============================================================
export default function App() {
  const [user, setUser] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(true);
  const [booting, setBooting] = useState(true);
  const [roster, setRoster] = useState<RosterMember[]>([]);

  const reloadRoster = async () => {
    const list = await getJSON<RosterMember[]>("/api/roster", []);
    if (list.length) setRoster(list);
  };

  useEffect(() => {
    // Browser-only prefs + initial roster fetch. An effect is required here.
    /* eslint-disable react-hooks/set-state-in-effect */
    const storedUser = getLocal("current-user");
    const storedTheme = getLocal("theme-dark");
    if (storedUser) setUser(storedUser);
    if (storedTheme !== null) setIsDark(storedTheme === "1");
    reloadRoster().finally(() => setBooting(false));
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

  if (booting) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: t.bg }}>
        <div
          style={{
            width: 26,
            height: 26,
            border: `3px solid ${t.border}`,
            borderTopColor: t.accent,
            borderRadius: "50%",
            animation: "spin .8s linear infinite",
          }}
        />
      </div>
    );
  }

  return user ? (
    <Dashboard
      user={user}
      t={t}
      isDark={isDark}
      roster={roster}
      teamNames={teamNames}
      reloadRoster={reloadRoster}
      onToggleTheme={toggleTheme}
      onSwitchUser={() => {
        setLocal("current-user", "");
        setUser(null);
      }}
    />
  ) : (
    <Login
      t={t}
      teamNames={teamNames}
      onLogin={(name) => {
        setLocal("current-user", name);
        setUser(name);
      }}
    />
  );
}

// ============================================================
function Login({
  t,
  teamNames,
  onLogin,
}: {
  t: Theme;
  teamNames: string[];
  onLogin: (name: string) => void;
}) {
  const [custom, setCustom] = useState("");
  const S = makeStyles(t);

  return (
    <div style={S.loginWrap}>
      <div style={S.loginCard}>
        {LOGO_FULL_SRC ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={LOGO_FULL_SRC} alt="Avid Associates" style={S.loginLogo} />
        ) : (
          <>
            {LOGO_ICON_SRC && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={LOGO_ICON_SRC} alt="" style={S.loginMark} />
            )}
            <div style={S.wordmark}>AVID ASSOCIATES</div>
          </>
        )}
        <div style={S.wordmarkSub}>Send-Out Tracker</div>

        <div style={S.loginGrid}>
          {teamNames.map((name) => (
            <button key={name} style={S.loginBtn} onClick={() => onLogin(name)}>
              {name}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (custom.trim()) onLogin(custom.trim());
          }}
          style={{ display: "flex", gap: 8, marginTop: 14 }}
        >
          <input style={S.loginInput} placeholder="Or type a name" value={custom} onChange={(e) => setCustom(e.target.value)} />
          <button type="submit" style={S.loginGoBtn}>
            Go
          </button>
        </form>

        <div style={S.loginFoot}>Stays signed in on this device</div>
      </div>
    </div>
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
  onSwitchUser,
}: {
  user: string;
  t: Theme;
  isDark: boolean;
  roster: RosterMember[];
  teamNames: string[];
  reloadRoster: () => Promise<void>;
  onToggleTheme: () => void;
  onSwitchUser: () => void;
}) {
  const S = makeStyles(t);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [billings, setBillings] = useState<Billing[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"sendouts" | "billings">("sendouts");
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [showBillingForm, setShowBillingForm] = useState(false);
  const [editingBilling, setEditingBilling] = useState<Billing | null>(null);
  const [showUserMgr, setShowUserMgr] = useState(false);
  const [tvOpen, setTvOpen] = useState(false);
  const [filterTeam, setFilterTeam] = useState("All");
  const [filterStage, setFilterStage] = useState("All");
  const [query, setQuery] = useState("");
  const [monthCursor, setMonthCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const isAdmin = user === ADMIN;
  const monthKey = `${monthCursor.getFullYear()}-${String(monthCursor.getMonth() + 1).padStart(2, "0")}`;
  const monthLabel = monthCursor.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const goPrevMonth = () => setMonthCursor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const goNextMonth = () => setMonthCursor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  // Loads in the background without ever blanking the current view — only
  // the very first mount shows the loading state.
  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    const [e, b] = await Promise.all([
      getJSON<Entry[]>("/api/entries", []),
      getJSON<Billing[]>("/api/billings", []),
    ]);
    setEntries(e);
    setBillings(b);
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
  const saveEntry = async (entry: Entry, isNew: boolean) => {
    applyEntry(entry);
    const res = await send(isNew ? "/api/entries" : `/api/entries/${entry.id}`, isNew ? "POST" : "PUT", entry);
    if (res.ok) applyEntry(await res.json());
  };
  const setDeclined = async (entry: Entry, declined: boolean, reason: DeclineReason | null = null) => {
    const optimistic = { ...entry, declined, declinedReason: declined ? reason : null };
    applyEntry(optimistic);
    const res = await send(`/api/entries/${entry.id}`, "PUT", optimistic);
    if (res.ok) applyEntry(await res.json());
  };
  const advanceStage = async (entry: Entry, stage: Stage) => {
    const optimistic = { ...entry, stage, declined: false };
    applyEntry(optimistic);
    const res = await send(`/api/entries/${entry.id}`, "PUT", optimistic);
    if (res.ok) applyEntry(await res.json());
  };
  const deleteEntry = async (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    await send(`/api/entries/${id}`, "DELETE");
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

  const monthEntries = useMemo(() => entries.filter((e) => e.date?.startsWith(monthKey)), [entries, monthKey]);
  const monthBillings = useMemo(() => billings.filter((b) => b.date?.startsWith(monthKey)), [billings, monthKey]);

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
    if (filterTeam !== "All") list = list.filter((b) => b.recruiter === filterTeam);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (b) =>
          b.recruiter?.toLowerCase().includes(q) ||
          b.company?.toLowerCase().includes(q) ||
          b.candidate?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [monthBillings, filterTeam, query]);

  const sendoutStats = useMemo(() => {
    const active = monthEntries.filter((e) => !e.declined && e.stage !== "placed");
    return {
      total: monthEntries.length,
      active: active.length,
      placed: monthEntries.filter((e) => e.stage === "placed" && !e.declined).length,
      declined: monthEntries.filter((e) => e.declined).length,
    };
  }, [monthEntries]);

  const billingStats = useMemo(() => {
    const total = monthBillings.reduce((s, b) => s + b.amount, 0);
    return {
      total,
      deals: monthBillings.length,
      avg: monthBillings.length ? Math.round(total / monthBillings.length) : 0,
    };
  }, [monthBillings]);

  if (tvOpen) {
    return <TVMode entries={entries} billings={billings} roster={teamNames} onExit={() => setTvOpen(false)} />;
  }

  return (
    <div style={S.page}>
      <header style={S.header}>
        <div style={S.headerLeft}>
          {LOGO_ICON_SRC ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={LOGO_ICON_SRC} alt="Avid Associates" style={S.headerLogo} />
          ) : null}
          <span style={S.wordmarkSmall}>Avid</span>
        </div>
        <div style={S.monthSwitcher}>
          <button className="avid-btn" style={S.iconGhost} onClick={goPrevMonth} title="Previous month">
            <ChevronLeft size={16} />
          </button>
          <span style={S.monthLabel}>{monthLabel}</span>
          <button className="avid-btn" style={S.iconGhost} onClick={goNextMonth} title="Next month">
            <ChevronRight size={16} />
          </button>
        </div>
        <div style={S.headerRight}>
          <button className="avid-btn" style={S.iconGhost} onClick={() => setTvOpen(true)} title="TV mode">
            <Tv size={17} />
          </button>
          <button className="avid-btn" style={S.iconGhost} onClick={onToggleTheme} title={isDark ? "Light mode" : "Dark mode"}>
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          {isAdmin && (
            <button className="avid-btn" style={S.iconGhost} onClick={() => setShowUserMgr(true)} title="Manage users">
              <Settings size={16} />
            </button>
          )}
          <button className="avid-btn" style={S.iconGhost} onClick={onSwitchUser} title="Switch user">
            <LogOut size={15} />
          </button>
        </div>
      </header>

      <section style={S.hero}>
        <div style={S.heroEyebrow}>AVID ASSOCIATES</div>
        <h1 style={S.heroTitle}>{view === "sendouts" ? "Send-Outs" : "Billings"}</h1>
        <div style={S.heroStatsRow}>
          {view === "sendouts" ? (
            <>
              <HeroStat S={S} label="Total" value={String(sendoutStats.total)} />
              <HeroStat S={S} label="Active" value={String(sendoutStats.active)} color={t.accent} />
              <HeroStat S={S} label="Placed" value={String(sendoutStats.placed)} color={STAGE_COLOR.placed} />
              <HeroStat S={S} label="Declined" value={String(sendoutStats.declined)} color={t.danger} />
            </>
          ) : (
            <>
              <HeroStat S={S} label="Billed" value={money(billingStats.total)} color={STAGE_COLOR.placed} />
              <HeroStat S={S} label="Deals" value={String(billingStats.deals)} />
              <HeroStat S={S} label="Avg Deal" value={money(billingStats.avg)} color={STAGE_COLOR.interview} />
            </>
          )}
        </div>
      </section>

      <div style={S.toolbar}>
        <div style={S.segWrap}>
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
        </div>
        <div style={S.searchWrap}>
          <Search size={15} color={t.mutedSoft} />
          <input
            style={S.search}
            placeholder={view === "sendouts" ? "Search candidate, company, role…" : "Search recruiter, company, candidate…"}
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
            if (view === "sendouts") {
              setEditingEntry(null);
              setShowEntryForm(true);
            } else {
              setEditingBilling(null);
              setShowBillingForm(true);
            }
          }}
        >
          <Plus size={15} /> New
        </button>
      </div>

      <div style={S.tableWrap}>
        {loading ? (
          <div style={S.empty}>Loading…</div>
        ) : view === "sendouts" ? (
          filteredEntries.length === 0 ? (
            <div style={S.empty}>
              {entries.length === 0 ? "No send-outs yet — add the first one." : "Nothing matches these filters."}
            </div>
          ) : (
            <div>
              <div style={S.cardHeaderRow}>
                <div style={S.colCandidate}>Candidate</div>
                <div style={S.colRole}>Role</div>
                <div style={S.colProgress}>Progress</div>
                <div style={S.colTeam}>Team</div>
                <div style={S.colActions} />
              </div>
              {filteredEntries.map((e) => (
                <EntryRow
                  key={e.id}
                  S={S}
                  t={t}
                  entry={e}
                  onEdit={() => {
                    setEditingEntry(e);
                    setShowEntryForm(true);
                  }}
                  onDelete={() => deleteEntry(e.id)}
                  onSetStage={(stage) => advanceStage(e, stage)}
                  onRestore={() => setDeclined(e, false)}
                  onDecline={(reason) => setDeclined(e, true, reason)}
                />
              ))}
            </div>
          )
        ) : filteredBillings.length === 0 ? (
          <div style={S.empty}>
            {billings.length === 0 ? "No billings yet — log the first one." : "Nothing matches these filters."}
          </div>
        ) : (
          <div>
            <div style={S.cardHeaderRow}>
              <div style={S.colRecruiter}>Recruiter</div>
              <div style={S.colClient}>Client</div>
              <div style={S.colAmount}>Amount</div>
              <div style={S.colDate}>Date</div>
              <div style={S.colActions} />
            </div>
            {filteredBillings.map((b) => (
              <BillingRow
                key={b.id}
                S={S}
                t={t}
                billing={b}
                onEdit={() => {
                  setEditingBilling(b);
                  setShowBillingForm(true);
                }}
                onDelete={() => deleteBilling(b.id)}
              />
            ))}
          </div>
        )}
      </div>

      {showEntryForm && (
        <EntryForm
          S={S}
          t={t}
          initial={editingEntry}
          user={user}
          teamNames={teamNames}
          onClose={() => setShowEntryForm(false)}
          onSave={async (entry, isNew) => {
            await saveEntry(entry, isNew);
            setShowEntryForm(false);
          }}
        />
      )}

      {showBillingForm && (
        <BillingForm
          S={S}
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

      {showUserMgr && (
        <UserManager
          S={S}
          t={t}
          roster={roster}
          reloadRoster={reloadRoster}
          onClose={() => setShowUserMgr(false)}
        />
      )}
    </div>
  );
}

function HeroStat({ S, label, value, color }: { S: Styles; label: string; value: string; color?: string }) {
  return (
    <div style={S.heroStat}>
      <div style={{ ...S.heroStatValue, color: color || S._t.ink }}>{value}</div>
      <div style={S.heroStatLabel}>{label}</div>
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
    <div style={S.selectPillWrap}>
      <select style={S.selectPill} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o} value={o}>
            {labels?.[o] || o}
          </option>
        ))}
      </select>
      <ChevronDown size={13} color={S._t.mutedSoft} style={S.selectPillChevron} />
    </div>
  );
}

function EntryRow({
  S,
  t,
  entry,
  onEdit,
  onDelete,
  onSetStage,
  onRestore,
  onDecline,
}: {
  S: Styles;
  t: Theme;
  entry: Entry;
  onEdit: () => void;
  onDelete: () => void;
  onSetStage: (stage: Stage) => void;
  onRestore: () => void;
  onDecline: (reason: DeclineReason) => void;
}) {
  return (
    <div className="avid-row avid-row-enter" style={S.cardRow}>
      <div style={S.colCandidate}>
        <div style={S.cardPrimary}>{entry.candidate}</div>
        <div style={S.cardSub}>
          {entry.company} <span style={S.cardSubDim}>· {fmtDate(entry.date)}</span>
        </div>
      </div>
      <div style={S.colRole}>
        <div style={S.cardPrimary}>{entry.role || "—"}</div>
        <div style={S.cardSub}>
          {entry.interviewType}
          {entry.round ? ` · R${entry.round}` : ""}
        </div>
      </div>
      <div style={S.colProgress}>
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
      </div>
      <div style={S.colTeam}>
        <div style={S.cardSub}>{(entry.team || []).join(", ") || "—"}</div>
      </div>
      <div style={S.colActions}>
        <button className="avid-btn" style={S.iconGhost} onClick={onEdit} title="Edit">
          <Pencil size={14} />
        </button>
        <button className="avid-btn" style={{ ...S.iconGhost, color: t.danger }} onClick={onDelete} title="Delete">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

function BillingRow({
  S,
  t,
  billing,
  onEdit,
  onDelete,
}: {
  S: Styles;
  t: Theme;
  billing: Billing;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="avid-row avid-row-enter" style={S.billingRow}>
      <div style={S.colRecruiter}>
        <div style={S.cardPrimary}>{billing.recruiter}</div>
      </div>
      <div style={S.colClient}>
        <div style={S.cardPrimary}>{billing.company || "—"}</div>
        {billing.candidate ? <div style={S.cardSub}>{billing.candidate}</div> : null}
      </div>
      <div style={S.colAmount}>
        <span style={S.amountText}>{money(billing.amount)}</span>
      </div>
      <div style={S.colDate}>
        <div style={S.cardSub}>{fmtDate(billing.date)}</div>
      </div>
      <div style={S.colActions}>
        <button className="avid-btn" style={S.iconGhost} onClick={onEdit} title="Edit">
          <Pencil size={14} />
        </button>
        <button className="avid-btn" style={{ ...S.iconGhost, color: t.danger }} onClick={onDelete} title="Delete">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

// ---------- stage progress indicator ----------
// Fixed dark-gray pill for the decline-reason popover — same look in both
// light and dark theme, not tied to the app's theme colors.
const STAGE_POPOVER_BG = "#2A2A28";
const STAGE_POPOVER_FG = "#F0EDE7";

const DECLINE_REASONS: { key: DeclineReason; label: string }[] = [
  { key: "candidate", label: "Rejected by candidate" },
  { key: "client", label: "Rejected by client" },
];

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
  const idx = Math.max(0, PIPELINE.findIndex((s) => s.key === stage));
  const color = declined ? t.danger : STAGE_COLOR[stage];
  const fillPct = (idx / (PIPELINE.length - 1)) * 100;
  const trackWidth = large ? 340 : 220;
  const dotSize = large ? 22 : 13;
  const lineH = large ? 5 : 3;
  const inset = dotSize / 2;

  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: large ? 22 : 14 }}>
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
              const isActive = i === idx && !declined;
              return (
                <div
                  key={isActive ? `dot-${i}-active-${idx}` : `dot-${i}`}
                  style={{ position: "relative" }}
                  onMouseEnter={() => setHoverIdx(i)}
                  onMouseLeave={() => setHoverIdx((cur) => (cur === i ? null : cur))}
                >
                  <button
                    onClick={() => onSetStage?.(s.key)}
                    title={s.label}
                    className={`avid-stage-dot avid-stage-pop${large && isActive ? " avid-stage-active" : ""}`}
                    style={
                      {
                        width: dotSize,
                        height: dotSize,
                        borderRadius: "50%",
                        border: `2px solid ${declined ? t.trackBg : i <= idx ? color : t.trackBg}`,
                        background: declined ? t.surface : i <= idx ? color : t.surface,
                        cursor: "pointer",
                        padding: 0,
                        boxShadow: large && isActive ? `0 0 0 5px ${color}22` : "none",
                        transform: hoverIdx === i ? "scale(1.15)" : "scale(1)",
                        "--pulse-color": `${color}40`,
                      } as React.CSSProperties
                    }
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
                  marginLeft: i === 0 ? -dotSize / 2 : 0,
                  marginRight: i === PIPELINE.length - 1 ? -dotSize / 2 : 0,
                }}
              >
                {s.label}
              </span>
            ))}
          </div>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: large ? 10 : 8, height: dotSize + 4 }}>
        {!large && (
          <span style={{ fontSize: 12.5, fontWeight: 600, color, minWidth: 64 }}>
            {declined ? "Declined" : PIPELINE[idx].label}
          </span>
        )}
        {large && declined && <span style={{ fontSize: 13.5, fontWeight: 700, color: t.danger }}>Declined</span>}
        <div
          style={{ position: "relative", display: "flex", alignItems: "center" }}
          onMouseLeave={() => setDeclineMenuOpen(false)}
        >
          {declineMenuOpen && (
            <div
              style={{
                position: "absolute",
                bottom: "100%",
                right: 0,
                transform: "translateY(-8px)",
                background: STAGE_POPOVER_BG,
                borderRadius: 9,
                padding: 4,
                boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
                zIndex: 7,
                display: "flex",
                flexDirection: "column",
                minWidth: 176,
              }}
            >
              {DECLINE_REASONS.map((r) => (
                <button
                  key={r.key}
                  onClick={() => {
                    onDecline?.(r.key);
                    setDeclineMenuOpen(false);
                  }}
                  className="avid-decline-option"
                  style={{
                    background: "transparent",
                    border: "none",
                    color: STAGE_POPOVER_FG,
                    textAlign: "left",
                    padding: "8px 10px",
                    fontSize: 12.5,
                    fontWeight: 600,
                    borderRadius: 6,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {r.label}
                </button>
              ))}
            </div>
          )}
          <button
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
      </div>
    </div>
  );
}

// ============================================================
function EntryForm({
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
  initial: Entry | null;
  user: string;
  teamNames: string[];
  onClose: () => void;
  onSave: (entry: Entry, isNew: boolean) => void;
}) {
  const [form, setForm] = useState<Entry>(
    initial || {
      id: uid(),
      date: todayISO(),
      candidate: "",
      company: "",
      role: "",
      interviewType: "Phone",
      round: 1,
      team: [user],
      stage: "sent",
      stageHistory: [],
      declined: false,
      declinedReason: null,
      notes: "",
      addedBy: user,
      createdAt: "",
    }
  );

  const toggleTeam = (name: string) => {
    setForm((f) => {
      const has = f.team.includes(name);
      return { ...f, team: has ? f.team.filter((n) => n !== name) : [...f.team, name] };
    });
  };
  const set =
    (k: "date" | "candidate" | "company" | "role" | "interviewType" | "notes") =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));
  const valid = form.candidate.trim() && form.company.trim() && form.date;

  return (
    <div className="avid-overlay" style={S.modalOverlay} onClick={onClose}>
      <div className="avid-modal" style={S.modal} onClick={(e) => e.stopPropagation()}>
        <div style={S.modalHeader}>
          <div style={S.modalTitle}>{initial ? "Edit send-out" : "New send-out"}</div>
          <button className="avid-btn" style={S.iconGhost} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div style={S.formGrid}>
          <Field S={S} label="Date">
            <input type="date" style={S.input} value={form.date} onChange={set("date")} />
          </Field>
          <Field S={S} label="Candidate">
            <input style={S.input} placeholder="Full name" value={form.candidate} onChange={set("candidate")} />
          </Field>
          <Field S={S} label="Company">
            <input style={S.input} placeholder="Client company" value={form.company} onChange={set("company")} />
          </Field>
          <Field S={S} label="Role">
            <input style={S.input} placeholder="e.g. Account Manager" value={form.role || ""} onChange={set("role")} />
          </Field>
          <Field S={S} label="Interview type">
            <select style={S.input} value={form.interviewType} onChange={set("interviewType")}>
              {INTERVIEW_TYPES.map((tp) => (
                <option key={tp}>{tp}</option>
              ))}
            </select>
          </Field>
          <Field S={S} label="Round">
            <input
              type="number"
              min="1"
              style={S.input}
              value={form.round}
              onChange={(e) => setForm((f) => ({ ...f, round: Number(e.target.value) }))}
            />
          </Field>
          <Field S={S} label="Team" full>
            <div style={S.chipRow}>
              {teamNames.map((name) => (
                <button
                  type="button"
                  key={name}
                  className="avid-chip"
                  onClick={() => toggleTeam(name)}
                  style={{
                    ...S.chip,
                    borderColor: t.accent,
                    color: form.team.includes(name) ? "#fff" : t.accent,
                    background: form.team.includes(name) ? t.accent : "transparent",
                  }}
                >
                  {name}
                </button>
              ))}
            </div>
          </Field>
          <Field S={S} label="Progress" full>
            <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "4px 0" }}>
              <StageProgress
                t={t}
                stage={form.stage}
                declined={form.declined}
                onSetStage={(stage) => setForm((f) => ({ ...f, stage, declined: false }))}
                onToggleDeclined={() => setForm((f) => ({ ...f, declined: !f.declined }))}
              />
            </div>
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
            {initial ? "Save changes" : "Log send-out"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
function BillingForm({
  S,
  initial,
  user,
  teamNames,
  onClose,
  onSave,
}: {
  S: Styles;
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
      recruiter: teamNames.includes(user) ? user : teamNames[0] || user,
      amount: 0,
      company: "",
      candidate: "",
      notes: "",
      addedBy: user,
      createdAt: "",
    }
  );
  const set =
    (k: "date" | "recruiter" | "company" | "candidate" | "notes") =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));
  const valid = form.recruiter && form.amount > 0 && form.date;

  return (
    <div className="avid-overlay" style={S.modalOverlay} onClick={onClose}>
      <div className="avid-modal" style={S.modal} onClick={(e) => e.stopPropagation()}>
        <div style={S.modalHeader}>
          <div style={S.modalTitle}>{initial ? "Edit billing" : "Log billing"}</div>
          <button className="avid-btn" style={S.iconGhost} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div style={S.formGrid}>
          <Field S={S} label="Date">
            <input type="date" style={S.input} value={form.date} onChange={set("date")} />
          </Field>
          <Field S={S} label="Recruiter">
            <select style={S.input} value={form.recruiter} onChange={set("recruiter")}>
              {teamNames.map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
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
          <Field S={S} label="Company">
            <input style={S.input} placeholder="Client company" value={form.company || ""} onChange={set("company")} />
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

// ============================================================
function UserManager({
  S,
  t,
  roster,
  reloadRoster,
  onClose,
}: {
  S: Styles;
  t: Theme;
  roster: RosterMember[];
  reloadRoster: () => Promise<void>;
  onClose: () => void;
}) {
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);

  const nameOf = (m: RosterMember) => (drafts[m.id] ?? m.name);

  const rename = async (m: RosterMember) => {
    const name = (drafts[m.id] ?? m.name).trim();
    if (!name || name === m.name) return;
    setBusy(true);
    await send(`/api/roster/${m.id}`, "PUT", { name });
    await reloadRoster();
    setBusy(false);
  };
  const remove = async (m: RosterMember) => {
    setBusy(true);
    await send(`/api/roster/${m.id}`, "DELETE");
    await reloadRoster();
    setBusy(false);
  };
  const add = async () => {
    const name = newName.trim();
    if (!name) return;
    setBusy(true);
    await send("/api/roster", "POST", { name });
    setNewName("");
    await reloadRoster();
    setBusy(false);
  };

  return (
    <div className="avid-overlay" style={S.modalOverlay} onClick={onClose}>
      <div className="avid-modal" style={{ ...S.modal, maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
        <div style={S.modalHeader}>
          <div style={S.modalTitle}>Manage users</div>
          <button className="avid-btn" style={S.iconGhost} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: 22 }}>
          {roster.map((m) => (
            <div key={m.id} style={S.rosterRow}>
              <input
                style={{ ...S.input, flex: 1 }}
                value={nameOf(m)}
                onChange={(e) => setDrafts((d) => ({ ...d, [m.id]: e.target.value }))}
              />
              <button
                className="avid-btn" style={{ ...S.ghostBtn, opacity: nameOf(m).trim() && nameOf(m) !== m.name ? 1 : 0.4, padding: "8px 12px" }}
                disabled={busy || !(nameOf(m).trim() && nameOf(m) !== m.name)}
                onClick={() => rename(m)}
              >
                Save
              </button>
              <button className="avid-btn" style={{ ...S.iconGhost, color: t.danger }} disabled={busy} onClick={() => remove(m)} title="Remove">
                <Trash2 size={15} />
              </button>
            </div>
          ))}

          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <input
              style={{ ...S.input, flex: 1 }}
              placeholder="Add a person…"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") add();
              }}
            />
            <button className="avid-btn" style={{ ...S.primaryBtn, opacity: newName.trim() ? 1 : 0.5 }} disabled={busy || !newName.trim()} onClick={add}>
              <Plus size={15} /> Add
            </button>
          </div>
          <div style={{ fontSize: 11.5, color: t.mutedSoft, marginTop: 14 }}>
            Renaming updates that person across all existing send-outs and billings.
          </div>
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
