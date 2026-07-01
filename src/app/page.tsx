"use client";

import { useState, useEffect, useMemo } from "react";
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
} from "lucide-react";
import { LOGO_ICON_SRC, LOGO_FULL_SRC } from "@/lib/logos";
import { Entry, Stage } from "@/lib/types";

const TEAM = ["Brad", "Joe", "Reid", "Matt", "Justice"];

const PIPELINE: { key: Stage; label: string }[] = [
  { key: "sent", label: "Sent" },
  { key: "interview", label: "Interview" },
  { key: "offer", label: "Offer" },
  { key: "placed", label: "Placed" },
];
const STAGE_COLOR: Record<Stage, string> = {
  sent: "#A39E95",
  interview: "#E5A53B",
  offer: "#8C92F0",
  placed: "#4FBF82",
};
const BRAND_RED = "#ED1D24";
const INTERVIEW_TYPES = ["Phone", "Video", "Face-to-Face"];

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function fmtDate(iso: string) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${m}/${d}/${y.slice(2)}`;
}

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

// ---------- shared entries API ----------
async function apiListEntries(): Promise<Entry[]> {
  const r = await fetch("/api/entries");
  if (!r.ok) return [];
  return r.json();
}
async function apiCreateEntry(entry: Entry) {
  await fetch("/api/entries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entry),
  });
}
async function apiUpdateEntry(entry: Entry) {
  await fetch(`/api/entries/${entry.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entry),
  });
}
async function apiDeleteEntry(id: string) {
  await fetch(`/api/entries/${id}`, { method: "DELETE" });
}

// ---------- theme ----------
type Theme = ReturnType<typeof getTheme>;

function getTheme(isDark: boolean) {
  return isDark
    ? {
        bg: "#191918",
        surface: "#212120",
        surfaceAlt: "#262625",
        border: "#34332F",
        ink: "#ECEAE5",
        muted: "#9C978D",
        mutedSoft: "#6E6A62",
        accent: "#8C92F0",
        accentSoft: "rgba(140,146,240,0.14)",
        accentText: "#AFB3F5",
        danger: "#E8765F",
        overlay: "rgba(0,0,0,0.7)",
        trackBg: "#3A3934",
      }
    : {
        bg: "#F8FAFC",
        surface: "#FFFFFF",
        surfaceAlt: "#FAFBFC",
        border: "#E2E8F0",
        ink: "#0F172A",
        muted: "#64748B",
        mutedSoft: "#94A3B8",
        accent: "#4F46E5",
        accentSoft: "#EEF2FF",
        accentText: "#4F46E5",
        danger: "#E11D44",
        overlay: "rgba(15,23,42,0.45)",
        trackBg: "#E2E8F0",
      };
}

// ============================================================
export default function App() {
  const [user, setUser] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(true);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    // Reads browser-only storage to hydrate client state without an
    // SSR/client markup mismatch — an effect is required here.
    /* eslint-disable react-hooks/set-state-in-effect */
    const storedUser = getLocal("current-user");
    const storedTheme = getLocal("theme-dark");
    if (storedUser) setUser(storedUser);
    if (storedTheme !== null) setIsDark(storedTheme === "1");
    setBooting(false);
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

  if (booting) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: t.bg,
        }}
      >
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
      onToggleTheme={toggleTheme}
      onSwitchUser={() => {
        setLocal("current-user", "");
        setUser(null);
      }}
    />
  ) : (
    <Login
      t={t}
      onLogin={(name) => {
        setLocal("current-user", name);
        setUser(name);
      }}
    />
  );
}

// ============================================================
function Login({ t, onLogin }: { t: Theme; onLogin: (name: string) => void }) {
  const [custom, setCustom] = useState("");
  const S = makeStyles(t);

  return (
    <div style={S.loginWrap}>
      <div style={S.loginCard}>
        {LOGO_FULL_SRC ? (
          <img src={LOGO_FULL_SRC} alt="Avid Associates" style={S.loginLogo} />
        ) : (
          <div style={S.wordmark}>AVID ASSOCIATES</div>
        )}
        <div style={S.wordmarkSub}>Send-Out Tracker</div>

        <div style={S.loginGrid}>
          {TEAM.map((name) => (
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
          <input
            style={S.loginInput}
            placeholder="Or type a name"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
          />
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
  onToggleTheme,
  onSwitchUser,
}: {
  user: string;
  t: Theme;
  isDark: boolean;
  onToggleTheme: () => void;
  onSwitchUser: () => void;
}) {
  const S = makeStyles(t);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Entry | null>(null);
  const [filterTeam, setFilterTeam] = useState("All");
  const [filterStage, setFilterStage] = useState("All");
  const [query, setQuery] = useState("");
  const [monthCursor, setMonthCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const monthKey = `${monthCursor.getFullYear()}-${String(
    monthCursor.getMonth() + 1
  ).padStart(2, "0")}`;
  const monthLabel = monthCursor.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const goPrevMonth = () =>
    setMonthCursor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const goNextMonth = () =>
    setMonthCursor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  const loadEntries = async () => {
    setLoading(true);
    setEntries(await apiListEntries());
    setLoading(false);
  };

  useEffect(() => {
    // Initial fetch from the API on mount — an effect is required here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadEntries();
  }, []);

  const saveEntry = async (entry: Entry, isNew: boolean) => {
    if (isNew) await apiCreateEntry(entry);
    else await apiUpdateEntry(entry);
    await loadEntries();
  };
  const deleteEntry = async (id: string) => {
    await apiDeleteEntry(id);
    await loadEntries();
  };

  const monthEntries = useMemo(
    () => entries.filter((e) => e.date?.startsWith(monthKey)),
    [entries, monthKey]
  );

  const filtered = useMemo(() => {
    let list = [...monthEntries];
    if (filterTeam !== "All")
      list = list.filter((e) => (e.team || []).includes(filterTeam));
    if (filterStage === "declined") list = list.filter((e) => e.declined);
    else if (filterStage !== "All")
      list = list.filter((e) => e.stage === filterStage && !e.declined);
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

  const stats = useMemo(() => {
    const active = monthEntries.filter((e) => !e.declined && e.stage !== "placed");
    return {
      total: monthEntries.length,
      active: active.length,
      placed: monthEntries.filter((e) => e.stage === "placed" && !e.declined).length,
      declined: monthEntries.filter((e) => e.declined).length,
    };
  }, [monthEntries]);

  return (
    <div style={S.page}>
      <header style={S.header}>
        <div style={S.headerLeft}>
          {LOGO_ICON_SRC ? (
            <img src={LOGO_ICON_SRC} alt="Avid Associates" style={S.headerLogo} />
          ) : null}
          <span style={S.wordmarkSmall}>Avid</span>
        </div>
        <div style={S.monthSwitcher}>
          <button style={S.iconGhost} onClick={goPrevMonth} title="Previous month">
            <ChevronLeft size={16} />
          </button>
          <span style={S.monthLabel}>{monthLabel}</span>
          <button style={S.iconGhost} onClick={goNextMonth} title="Next month">
            <ChevronRight size={16} />
          </button>
        </div>
        <div style={S.headerRight}>
          <span style={S.userTag}>{user}</span>
          <button
            style={S.iconGhost}
            onClick={onToggleTheme}
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button style={S.iconGhost} onClick={onSwitchUser} title="Switch user">
            <LogOut size={15} />
          </button>
        </div>
      </header>

      <section style={S.hero}>
        <div style={S.heroEyebrow}>AVID ASSOCIATES</div>
        <h1 style={S.heroTitle}>Send-Outs</h1>
        <div style={S.heroStatsRow}>
          <HeroStat S={S} label="Total" value={stats.total} />
          <HeroStat S={S} label="Active" value={stats.active} color={t.accent} />
          <HeroStat S={S} label="Placed" value={stats.placed} color={STAGE_COLOR.placed} />
          <HeroStat S={S} label="Declined" value={stats.declined} color={t.danger} />
        </div>
      </section>

      <div style={S.toolbar}>
        <div style={S.searchWrap}>
          <Search size={15} color={t.mutedSoft} />
          <input
            style={S.search}
            placeholder="Search candidate, company, role…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <SelectPill S={S} value={filterTeam} onChange={setFilterTeam} options={["All", ...TEAM]} />
        <SelectPill
          S={S}
          value={filterStage}
          onChange={setFilterStage}
          options={["All", ...PIPELINE.map((s) => s.key), "declined"]}
          labels={{
            All: "All stages",
            declined: "Declined",
            ...Object.fromEntries(PIPELINE.map((s) => [s.key, s.label])),
          }}
        />
        <button
          style={S.primaryBtn}
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
        >
          <Plus size={15} /> New
        </button>
      </div>

      <div style={S.tableWrap}>
        {loading ? (
          <div style={S.empty}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={S.empty}>
            {entries.length === 0
              ? "No send-outs yet — add the first one."
              : "Nothing matches these filters."}
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
            {filtered.map((e) => (
              <Row
                key={e.id}
                S={S}
                t={t}
                entry={e}
                onEdit={() => {
                  setEditing(e);
                  setShowForm(true);
                }}
                onDelete={() => deleteEntry(e.id)}
                onSetStage={(stage) => saveEntry({ ...e, stage, declined: false }, false)}
                onToggleDeclined={() => saveEntry({ ...e, declined: !e.declined }, false)}
              />
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <EntryForm
          S={S}
          t={t}
          initial={editing}
          user={user}
          onClose={() => setShowForm(false)}
          onSave={async (entry, isNew) => {
            await saveEntry(entry, isNew);
            setShowForm(false);
          }}
        />
      )}
    </div>
  );
}

function HeroStat({
  S,
  label,
  value,
  color,
}: {
  S: ReturnType<typeof makeStyles>;
  label: string;
  value: number;
  color?: string;
}) {
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
  S: ReturnType<typeof makeStyles>;
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

function Row({
  S,
  t,
  entry,
  onEdit,
  onDelete,
  onSetStage,
  onToggleDeclined,
}: {
  S: ReturnType<typeof makeStyles>;
  t: Theme;
  entry: Entry;
  onEdit: () => void;
  onDelete: () => void;
  onSetStage: (stage: Stage) => void;
  onToggleDeclined: () => void;
}) {
  return (
    <div style={S.cardRow}>
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
          onSetStage={onSetStage}
          onToggleDeclined={onToggleDeclined}
          large
        />
      </div>

      <div style={S.colTeam}>
        <div style={S.cardSub}>{(entry.team || []).join(", ") || "—"}</div>
      </div>

      <div style={S.colActions}>
        <button style={S.iconGhost} onClick={onEdit} title="Edit">
          <Pencil size={14} />
        </button>
        <button style={{ ...S.iconGhost, color: t.danger }} onClick={onDelete} title="Delete">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

// ---------- stage progress indicator ----------
function StageProgress({
  t,
  stage,
  declined,
  onSetStage,
  onToggleDeclined,
  large,
}: {
  t: Theme;
  stage: Stage;
  declined: boolean;
  onSetStage: (stage: Stage) => void;
  onToggleDeclined: () => void;
  large?: boolean;
}) {
  const idx = Math.max(0, PIPELINE.findIndex((s) => s.key === stage));
  const color = declined ? t.danger : STAGE_COLOR[stage];
  const fillPct = (idx / (PIPELINE.length - 1)) * 100;
  const trackWidth = large ? 260 : 200;
  const dotSize = large ? 15 : 10;
  const lineH = large ? 3 : 2;
  const inset = dotSize / 2;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: large ? 18 : 12 }}>
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
              transition: "width .15s ease",
            }}
          />
          <div style={{ position: "relative", display: "flex", justifyContent: "space-between" }}>
            {PIPELINE.map((s, i) => (
              <button
                key={s.key}
                onClick={() => onSetStage(s.key)}
                title={s.label}
                style={{
                  width: dotSize,
                  height: dotSize,
                  borderRadius: "50%",
                  border: `2px solid ${declined ? t.trackBg : i <= idx ? color : t.trackBg}`,
                  background: declined ? t.surface : i <= idx ? color : t.surface,
                  cursor: "pointer",
                  padding: 0,
                  boxShadow:
                    large && i === idx && !declined ? `0 0 0 4px ${color}22` : "none",
                }}
              />
            ))}
          </div>
        </div>
        {large && (
          <div
            style={{
              position: "relative",
              display: "flex",
              justifyContent: "space-between",
              marginTop: 8,
            }}
          >
            {PIPELINE.map((s, i) => (
              <span
                key={s.key}
                style={{
                  fontSize: 10.5,
                  fontWeight: i === idx && !declined ? 700 : 500,
                  color: i === idx && !declined ? color : t.mutedSoft,
                  width: dotSize + 30,
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
      {!large && (
        <span style={{ fontSize: 12.5, fontWeight: 600, color, minWidth: 64 }}>
          {declined ? "Declined" : PIPELINE[idx].label}
        </span>
      )}
      {large && declined && (
        <span style={{ fontSize: 12.5, fontWeight: 700, color: t.danger }}>Declined</span>
      )}
      <button
        onClick={onToggleDeclined}
        title={declined ? "Restore to pipeline" : "Mark declined / dead"}
        style={{
          border: "none",
          background: "none",
          cursor: "pointer",
          color: declined ? t.danger : t.trackBg,
          display: "flex",
          padding: 0,
        }}
      >
        <Ban size={large ? 16 : 14} />
      </button>
    </div>
  );
}

// ============================================================
function EntryForm({
  S,
  t,
  initial,
  user,
  onClose,
  onSave,
}: {
  S: ReturnType<typeof makeStyles>;
  t: Theme;
  initial: Entry | null;
  user: string;
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
      declined: false,
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
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));
  const valid = form.candidate.trim() && form.company.trim() && form.date;

  return (
    <div style={S.modalOverlay} onClick={onClose}>
      <div style={S.modal} onClick={(e) => e.stopPropagation()}>
        <div style={S.modalHeader}>
          <div style={S.modalTitle}>{initial ? "Edit send-out" : "New send-out"}</div>
          <button style={S.iconGhost} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div style={S.formGrid}>
          <Field S={S} label="Date">
            <input type="date" style={S.input} value={form.date} onChange={set("date")} />
          </Field>
          <Field S={S} label="Candidate">
            <input
              style={S.input}
              placeholder="Full name"
              value={form.candidate}
              onChange={set("candidate")}
            />
          </Field>
          <Field S={S} label="Company">
            <input
              style={S.input}
              placeholder="Client company"
              value={form.company}
              onChange={set("company")}
            />
          </Field>
          <Field S={S} label="Role">
            <input
              style={S.input}
              placeholder="e.g. Account Manager"
              value={form.role || ""}
              onChange={set("role")}
            />
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
              {TEAM.map((name) => (
                <button
                  type="button"
                  key={name}
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
          <button style={S.ghostBtn} onClick={onClose}>
            Cancel
          </button>
          <button
            style={{ ...S.primaryBtn, opacity: valid ? 1 : 0.5 }}
            disabled={!valid}
            onClick={() => onSave(form, !initial)}
          >
            {initial ? "Save changes" : "Log send-out"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  S,
  label,
  children,
  full,
}: {
  S: ReturnType<typeof makeStyles>;
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div style={{ gridColumn: full ? "1 / -1" : "auto", display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={S.fieldLabel}>{label}</label>
      {children}
    </div>
  );
}

// ---------- styles (theme-aware) ----------
const FONT = `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;

function makeStyles(t: Theme) {
  return {
    _t: t,
    loginWrap: {
      minHeight: "100vh",
      background: t.bg,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: FONT,
      padding: 20,
    },
    loginCard: {
      width: "100%",
      maxWidth: 340,
      background: t.surface,
      border: `1px solid ${t.border}`,
      borderRadius: 14,
      padding: 32,
    },
    loginLogo: { width: 96, height: "auto", marginBottom: 22 },
    wordmark: { fontSize: 22, fontWeight: 800, color: t.ink, letterSpacing: -0.5, marginBottom: 22 },
    wordmarkSub: { fontSize: 13, color: t.muted, marginTop: 2, marginBottom: 24 },
    loginGrid: { display: "flex", flexDirection: "column" as const, gap: 8 },
    loginBtn: {
      padding: "11px 14px",
      border: `1px solid ${t.border}`,
      borderRadius: 9,
      background: t.surfaceAlt,
      fontSize: 14.5,
      fontWeight: 600,
      color: t.ink,
      cursor: "pointer",
      textAlign: "left" as const,
    },
    loginInput: {
      flex: 1,
      padding: "9px 12px",
      border: `1px solid ${t.border}`,
      borderRadius: 9,
      fontSize: 13.5,
      fontFamily: FONT,
      outline: "none",
      background: t.surfaceAlt,
      color: t.ink,
    },
    loginGoBtn: {
      padding: "9px 16px",
      border: "none",
      borderRadius: 9,
      background: BRAND_RED,
      color: "#fff",
      fontWeight: 600,
      fontSize: 13.5,
      cursor: "pointer",
    },
    loginFoot: { fontSize: 11.5, color: t.mutedSoft, marginTop: 18, textAlign: "center" as const },

    page: { minHeight: "100vh", background: t.bg, fontFamily: FONT, color: t.ink, paddingBottom: 60 },
    header: {
      display: "grid",
      gridTemplateColumns: "1fr auto 1fr",
      alignItems: "center",
      padding: "14px 24px",
      borderBottom: `1px solid ${t.border}`,
      background: t.surface,
    },
    headerLeft: { display: "flex", alignItems: "center", gap: 9, justifySelf: "start" as const },
    headerLogo: { width: 20, height: "auto" },
    wordmarkSmall: { fontWeight: 800, fontSize: 15, color: t.ink, letterSpacing: -0.3 },
    headerRight: { display: "flex", alignItems: "center", gap: 10, justifySelf: "end" as const },
    userTag: {
      fontSize: 12.5,
      fontWeight: 600,
      background: t.accentSoft,
      padding: "5px 11px",
      borderRadius: 20,
      color: t.accentText,
    },
    monthSwitcher: { display: "flex", alignItems: "center", gap: 4, justifySelf: "center" as const },
    monthLabel: { fontSize: 13.5, fontWeight: 700, color: t.ink, minWidth: 112, textAlign: "center" as const },

    hero: { padding: "36px 24px 28px", borderBottom: `1px solid ${t.border}` },
    heroEyebrow: { fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: t.mutedSoft, marginBottom: 8 },
    heroTitle: { fontSize: 34, fontWeight: 800, letterSpacing: -1, color: t.ink, margin: "0 0 24px" },
    heroStatsRow: { display: "flex", gap: 0, flexWrap: "wrap" as const },
    heroStat: { paddingRight: 36, marginRight: 36, borderRight: `1px solid ${t.border}` },
    heroStatValue: {
      fontSize: 42,
      fontWeight: 800,
      letterSpacing: -1.5,
      lineHeight: 1,
      fontVariantNumeric: "tabular-nums" as const,
    },
    heroStatLabel: { fontSize: 12, color: t.muted, marginTop: 8, fontWeight: 500 },

    toolbar: { display: "flex", gap: 8, padding: "20px 24px 16px", flexWrap: "wrap" as const, alignItems: "center" },
    searchWrap: {
      flex: "1 1 220px",
      display: "flex",
      alignItems: "center",
      gap: 7,
      padding: "8px 12px",
      border: `1px solid ${t.border}`,
      borderRadius: 9,
      background: t.surface,
    },
    search: {
      border: "none",
      outline: "none",
      fontSize: 13.5,
      fontFamily: FONT,
      flex: 1,
      background: "transparent",
      color: t.ink,
    },
    selectPillWrap: { position: "relative" as const, display: "flex", alignItems: "center" },
    selectPill: {
      appearance: "none" as const,
      padding: "8px 28px 8px 12px",
      border: `1px solid ${t.border}`,
      borderRadius: 9,
      fontSize: 13,
      fontFamily: FONT,
      background: t.surface,
      color: t.ink,
      cursor: "pointer",
    },
    selectPillChevron: { position: "absolute" as const, right: 10, pointerEvents: "none" as const },
    primaryBtn: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      padding: "8px 14px",
      border: "none",
      borderRadius: 9,
      background: BRAND_RED,
      color: "#fff",
      fontSize: 13.5,
      fontWeight: 600,
      cursor: "pointer",
    },
    ghostBtn: {
      padding: "9px 16px",
      border: `1px solid ${t.border}`,
      borderRadius: 9,
      background: t.surface,
      fontSize: 13.5,
      fontWeight: 600,
      color: t.ink,
      cursor: "pointer",
    },
    iconGhost: {
      border: "none",
      background: "none",
      color: t.muted,
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      padding: 5,
      borderRadius: 6,
      marginRight: 2,
    },

    tableWrap: {
      margin: "0 24px",
      border: `1px solid ${t.border}`,
      borderRadius: 12,
      background: t.surface,
      overflow: "hidden",
    },
    cardHeaderRow: {
      display: "flex",
      alignItems: "center",
      gap: 20,
      padding: "11px 22px",
      fontSize: 11,
      textTransform: "uppercase" as const,
      letterSpacing: 0.5,
      color: t.mutedSoft,
      borderBottom: `1px solid ${t.border}`,
      fontWeight: 700,
      background: t.surfaceAlt,
    },
    cardRow: {
      display: "flex",
      alignItems: "center",
      gap: 20,
      padding: "26px 22px",
      borderBottom: `1px solid ${t.border}`,
    },
    colCandidate: { width: 200, flexShrink: 0 },
    colRole: { width: 170, flexShrink: 0 },
    colProgress: { flex: 1, display: "flex", justifyContent: "center", minWidth: 260 },
    colTeam: { width: 150, flexShrink: 0 },
    colActions: { width: 56, flexShrink: 0, display: "flex", justifyContent: "flex-end" },
    cardPrimary: { fontSize: 14.5, fontWeight: 600, color: t.ink },
    cardSub: { fontSize: 12.5, color: t.muted, marginTop: 3, fontWeight: 500 },
    cardSubDim: { color: t.mutedSoft },

    empty: { padding: "48px 20px", textAlign: "center" as const, color: t.mutedSoft, fontSize: 14 },

    modalOverlay: {
      position: "fixed" as const,
      inset: 0,
      background: t.overlay,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
      zIndex: 50,
    },
    modal: {
      width: "100%",
      maxWidth: 520,
      maxHeight: "88vh",
      overflowY: "auto" as const,
      background: t.surface,
      borderRadius: 14,
      fontFamily: FONT,
      border: `1px solid ${t.border}`,
    },
    modalHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "16px 22px",
      borderBottom: `1px solid ${t.border}`,
    },
    modalTitle: { fontSize: 15.5, fontWeight: 700, color: t.ink },
    formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, padding: 22 },
    fieldLabel: {
      fontSize: 11.5,
      fontWeight: 700,
      color: t.muted,
      textTransform: "uppercase" as const,
      letterSpacing: 0.4,
    },
    input: {
      padding: "9px 11px",
      border: `1px solid ${t.border}`,
      borderRadius: 8,
      fontSize: 13.5,
      fontFamily: FONT,
      outline: "none",
      color: t.ink,
      background: t.surfaceAlt,
    },
    chipRow: { display: "flex", flexWrap: "wrap" as const, gap: 7 },
    chip: {
      padding: "6px 13px",
      borderRadius: 20,
      border: "1.5px solid",
      fontSize: 12.5,
      fontWeight: 600,
      cursor: "pointer",
      background: "transparent",
    },
    modalFooter: {
      display: "flex",
      justifyContent: "flex-end",
      gap: 10,
      padding: "16px 22px",
      borderTop: `1px solid ${t.border}`,
    },
  };
}
