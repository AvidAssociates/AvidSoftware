"use client";

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { Calendar, Target, TrendingUp, Trophy, Users, X, Zap } from "lucide-react";
import type { Billing, Entry } from "@/lib/types";
import { LOGO_ICON_SRC } from "@/lib/logos";
import { FONT } from "@/lib/ui";
import {
  activePipeline,
  avatarHue,
  billingLeaderboard,
  computePulseStats,
  fmtDayLabel,
  fmtShortDate,
  gatherInterviews,
  initials,
  money,
  monthKeyOf,
  placementsInRange,
  sendoutLeaderboard,
  todayIso,
  weekRange,
  type BillingLeaderRow,
  type InterviewItem,
  type PlacementItem,
  type SendoutLeaderRow,
} from "@/lib/tv-stats";

const C = {
  bg0: "#0A0A09",
  bg1: "#141413",
  surface: "rgba(255,255,255,0.04)",
  surfaceHi: "rgba(255,255,255,0.07)",
  border: "rgba(255,255,255,0.09)",
  ink: "#F7F5F0",
  muted: "#A8A39A",
  mutedSoft: "#6E6A62",
  red: "#ED1D24",
  green: "#4FBF82",
  amber: "#E5A53B",
  blue: "#8C92F0",
  purple: "#B794F6",
};
const RANK = ["#E5C558", "#C7CCD1", "#C08457"];
const STAGE_COLORS = { sent: "#A39E95", interview: C.amber, offer: C.blue, placed: C.green, declined: C.red };

type SceneKey = "pulse" | "billings" | "interviews" | "placements" | "sendouts" | "pipeline";
type Scene = { key: SceneKey; label: string; accent: string; kicker: string };

const SCENES: Scene[] = [
  { key: "pulse", label: "The Pulse", accent: C.red, kicker: "Monthly snapshot" },
  { key: "billings", label: "MTD Billings", accent: C.green, kicker: "Leaderboard" },
  { key: "interviews", label: "Interviews", accent: C.amber, kicker: "This week" },
  { key: "placements", label: "Placements", accent: C.purple, kicker: "This week" },
  { key: "sendouts", label: "Send-Outs", accent: C.blue, kicker: "Leaderboard" },
  { key: "pipeline", label: "Active Pipeline", accent: C.blue, kicker: "By stage" },
];

const CYCLE_MS = 14000;

export default function TVMode({
  entries,
  billings,
  roster,
  goals,
  onExit,
}: {
  entries: Entry[];
  billings: Billing[];
  roster: string[];
  goals: { yearlyGoal: number | null; monthlyGoal: number | null };
  onExit: () => void;
}) {
  const [sceneIdx, setSceneIdx] = useState(0);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const cycle = setInterval(() => setSceneIdx((i) => (i + 1) % SCENES.length), CYCLE_MS);
    const clock = setInterval(() => setNow(new Date()), 1000);
    return () => {
      clearInterval(cycle);
      clearInterval(clock);
    };
  }, []);

  const monthKey = monthKeyOf(now);
  const monthLabel = now.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const today = todayIso(now);
  const week = weekRange(now);

  const pulse = useMemo(() => computePulseStats(entries, billings, now, goals), [entries, billings, now, goals]);
  const billingBoard = useMemo(() => billingLeaderboard(billings, roster, monthKey), [billings, roster, monthKey]);
  const sendoutBoard = useMemo(() => sendoutLeaderboard(entries, roster, monthKey), [entries, roster, monthKey]);
  const weekInterviews = useMemo(() => gatherInterviews(entries, week.start, week.end), [entries, week.start, week.end]);
  const todayInterviews = useMemo(() => weekInterviews.filter((i) => i.date === today), [weekInterviews, today]);
  const weekPlacements = useMemo(
    () => placementsInRange(entries, billings, week.start, week.end),
    [entries, billings, week.start, week.end]
  );
  const pipeline = useMemo(() => activePipeline(entries, monthKey), [entries, monthKey]);

  const scene = SCENES[sceneIdx];
  const teamTotal = billingBoard.reduce((s, r) => s + r.amount, 0);

  return (
    <div className="tv-root" style={S.root}>
      <div className="tv-ambient" aria-hidden />

      <header className="tv-header" style={S.header}>
        <div style={S.brand}>
          {LOGO_ICON_SRC ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={LOGO_ICON_SRC} alt="" className="tv-logo" />
          ) : null}
          <span style={S.brandText}>
            AVID <span style={{ color: C.red }}>ASSOCIATES</span>
          </span>
        </div>
        <div style={S.headerMid}>
          <span className="tv-scene-pill" style={{ color: scene.accent, borderColor: `${scene.accent}55`, background: `${scene.accent}14` }}>
            {scene.kicker}
          </span>
        </div>
        <div style={S.headerRight}>
          <div style={S.clockWrap}>
            <div style={S.clock}>
              {now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
            </div>
            <div style={S.clockDate}>{fmtDayLabel(today)}</div>
          </div>
          <button type="button" className="tv-exit" style={S.exitBtn} onClick={onExit} title="Exit TV mode">
            <X size={20} />
          </button>
        </div>
      </header>

      <main className="tv-main">
        <div key={scene.key} className="tv-slide tv-rise">
          <div className="tv-slide-head">
            <div className="tv-slide-kicker" style={{ color: scene.accent }}>{monthLabel}</div>
            <h1 className="tv-slide-title" style={S.sceneTitle}>{scene.label}</h1>
          </div>

          {scene.key === "pulse" ? (
            <PulseSlide pulse={pulse} accent={scene.accent} />
          ) : scene.key === "billings" ? (
            <BillingsLeaderSlide rows={billingBoard} total={teamTotal} accent={scene.accent} />
          ) : scene.key === "interviews" ? (
            <InterviewsSlide
              todayItems={todayInterviews}
              weekItems={weekInterviews}
              today={today}
              weekLabel={`${fmtShortDate(week.start)} – ${fmtShortDate(week.end)}`}
              accent={scene.accent}
            />
          ) : scene.key === "placements" ? (
            <PlacementsSlide items={weekPlacements} weekLabel={`${fmtShortDate(week.start)} – ${fmtShortDate(week.end)}`} accent={scene.accent} />
          ) : scene.key === "sendouts" ? (
            <SendoutsLeaderSlide rows={sendoutBoard} accent={scene.accent} />
          ) : (
            <PipelineSlide pipeline={pipeline} accent={scene.accent} />
          )}
        </div>
      </main>

      <footer className="tv-footer" style={S.footer}>
        <div className="tv-dots">
          {SCENES.map((s, i) => (
            <span
              key={s.key}
              className={`tv-dot${i === sceneIdx ? " tv-dot--active" : ""}`}
              style={{
                width: i === sceneIdx ? 28 : 8,
                background: i === sceneIdx ? scene.accent : C.mutedSoft,
              }}
            />
          ))}
        </div>
        <div className="tv-scene-labels">
          {SCENES.map((s, i) => (
            <span key={s.key} className="tv-scene-label" style={{ color: i === sceneIdx ? scene.accent : C.mutedSoft, opacity: i === sceneIdx ? 1 : 0.45 }}>
              {s.label}
            </span>
          ))}
        </div>
        <div style={S.progressTrack}>
          <div key={scene.key} className="tv-progress" style={{ background: scene.accent, animationDuration: `${CYCLE_MS}ms` }} />
        </div>
      </footer>
    </div>
  );
}

function PulseSlide({ pulse, accent }: { pulse: ReturnType<typeof computePulseStats>; accent: string }) {
  const goalPct = pulse.goalPct != null ? Math.min(1.2, pulse.goalPct) : null;
  const goalDisplay = pulse.goalPct != null ? `${Math.round(pulse.goalPct * 100)}%` : "—";

  return (
    <div className="tv-pulse">
      <div className="tv-pulse-grid">
        <PulseCard icon={<Zap size={22} />} label="Send-Outs" value={String(pulse.sendoutsMtd)} sub="This month" accent={C.blue} />
        <PulseCard icon={<TrendingUp size={22} />} label="MTD Billings" value={money(pulse.billingsMtd)} sub="Team total" accent={C.green} large />
        <PulseCard
          icon={<Target size={22} />}
          label="Goal Progress"
          value={goalDisplay}
          sub={
            pulse.monthlyGoal
              ? pulse.goalDiff != null && pulse.goalDiff >= 0
                ? `${money(pulse.goalDiff)} over`
                : pulse.goalDiff != null
                  ? `${money(Math.abs(pulse.goalDiff))} to go`
                  : `Target ${money(pulse.monthlyGoal)}`
              : "No monthly goal set"
          }
          accent={accent}
          large
        />
        <PulseCard icon={<Trophy size={22} />} label="Placements" value={String(pulse.placementsMtd)} sub="This month" accent={C.purple} />
        <PulseCard icon={<Calendar size={22} />} label="Interviews Today" value={String(pulse.interviewsToday)} sub={`${pulse.interviewsWeek} this week`} accent={C.amber} />
        <PulseCard icon={<Users size={22} />} label="Active Pipeline" value={String(pulse.activePipeline)} sub={`${pulse.firstTimeMtd} first-time MTD`} accent={C.blue} />
        <PulseCard icon={<TrendingUp size={22} />} label="Company YTD" value={money(pulse.ytdBillings)} sub="Billings" accent={C.green} />
        <PulseCard icon={<Zap size={22} />} label="Avg Deal MTD" value={pulse.placementsMtd > 0 ? money(Math.round(pulse.billingsMtd / Math.max(1, pulse.placementsMtd))) : "—"} sub="Per placement" accent={C.muted} />
      </div>
      {goalPct != null ? (
        <div className="tv-goal-ring-wrap">
          <div className="tv-goal-ring" style={{ "--pct": goalPct, "--accent": accent } as CSSProperties}>
            <svg viewBox="0 0 120 120" className="tv-goal-svg">
              <circle cx="60" cy="60" r="52" className="tv-goal-track" />
              <circle cx="60" cy="60" r="52" className="tv-goal-fill" />
            </svg>
            <div className="tv-goal-center">
              <div className="tv-goal-pct">{Math.round(pulse.goalPct! * 100)}%</div>
              <div className="tv-goal-of">of monthly goal</div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PulseCard({
  icon,
  label,
  value,
  sub,
  accent,
  large,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  sub: string;
  accent: string;
  large?: boolean;
}) {
  return (
    <div className={`tv-pulse-card${large ? " tv-pulse-card--large" : ""}`} style={{ "--card-accent": accent } as CSSProperties}>
      <div className="tv-pulse-card-icon" style={{ color: accent }}>{icon}</div>
      <div className="tv-pulse-card-value" style={{ color: C.ink }}>{value}</div>
      <div className="tv-pulse-card-label">{label}</div>
      <div className="tv-pulse-card-sub">{sub}</div>
    </div>
  );
}

function Headshot({ name, rank }: { name: string; rank: number }) {
  const hue = avatarHue(name);
  const ring = rank < 3 ? RANK[rank] : "rgba(255,255,255,0.12)";
  return (
    <div className="tv-headshot" style={{ "--ring": ring, "--hue": hue } as CSSProperties}>
      <span className="tv-headshot-inner">{initials(name)}</span>
      {rank < 3 ? <span className="tv-headshot-medal">{rank + 1}</span> : null}
    </div>
  );
}

function BillingsLeaderSlide({ rows, total, accent }: { rows: BillingLeaderRow[]; total: number; accent: string }) {
  const max = Math.max(1, ...rows.map((r) => r.amount));
  return (
    <div className="tv-leader">
      <div className="tv-leader-hero">
        <div className="tv-leader-hero-label">Team MTD</div>
        <div className="tv-leader-hero-value" style={{ color: accent }}>{money(total)}</div>
      </div>
      <div className="tv-leader-list">
        {rows.map((r, i) => {
          const isLeader = i === 0 && r.amount > 0;
          return (
            <div key={r.name} className={`tv-lb-row tv-lb-row--billings${isLeader ? " tv-lb-row--leader" : ""}`} style={{ "--row-accent": accent, animationDelay: `${i * 60}ms` } as CSSProperties}>
              <Headshot name={r.name} rank={i} />
              <div className="tv-lb-copy">
                <div className="tv-lb-name">{r.name}</div>
                <div className="tv-lb-bar-track">
                  <div className="tv-bar tv-lb-bar" style={{ width: `${(r.amount / max) * 100}%`, background: `linear-gradient(90deg, ${accent}88, ${accent})` }} />
                </div>
              </div>
              <div className="tv-lb-stats">
                <div className="tv-lb-amount" style={{ color: isLeader ? accent : C.ink }}>{money(r.amount)}</div>
                <div className="tv-lb-sub">{r.placements} placement{r.placements === 1 ? "" : "s"}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SendoutsLeaderSlide({ rows, accent }: { rows: SendoutLeaderRow[]; accent: string }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  const total = rows.reduce((s, r) => s + r.count, 0);
  return (
    <div className="tv-leader">
      <div className="tv-leader-hero">
        <div className="tv-leader-hero-label">Send-Outs MTD</div>
        <div className="tv-leader-hero-value" style={{ color: accent }}>{total}</div>
      </div>
      <div className="tv-leader-list">
        {rows.map((r, i) => {
          const isLeader = i === 0 && r.count > 0;
          return (
            <div key={r.name} className={`tv-lb-row${isLeader ? " tv-lb-row--leader" : ""}`} style={{ "--row-accent": accent, animationDelay: `${i * 60}ms` } as CSSProperties}>
              <Headshot name={r.name} rank={i} />
              <div className="tv-lb-copy">
                <div className="tv-lb-name">{r.name}</div>
                <div className="tv-lb-bar-track">
                  <div className="tv-bar tv-lb-bar" style={{ width: `${(r.count / max) * 100}%`, background: `linear-gradient(90deg, ${accent}88, ${accent})` }} />
                </div>
              </div>
              <div className="tv-lb-stats">
                <div className="tv-lb-amount" style={{ color: isLeader ? accent : C.ink }}>{r.count}</div>
                <div className="tv-lb-sub">{r.placed} placed</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InterviewsSlide({
  todayItems,
  weekItems,
  today,
  weekLabel,
  accent,
}: {
  todayItems: InterviewItem[];
  weekItems: InterviewItem[];
  today: string;
  weekLabel: string;
  accent: string;
}) {
  const rest = weekItems.filter((i) => i.date !== today);
  return (
    <div className="tv-split">
      <section className="tv-split-panel tv-split-panel--today">
        <div className="tv-split-head">
          <span className="tv-split-badge" style={{ background: `${accent}22`, color: accent }}>Today</span>
          <span className="tv-split-count" style={{ color: accent }}>{todayItems.length}</span>
        </div>
        {todayItems.length === 0 ? (
          <div className="tv-empty">No interviews logged for today.</div>
        ) : (
          <div className="tv-event-list">
            {todayItems.map((item) => (
              <InterviewCard key={item.id} item={item} accent={accent} highlight />
            ))}
          </div>
        )}
      </section>
      <section className="tv-split-panel tv-split-panel--week">
        <div className="tv-split-head">
          <span className="tv-split-badge" style={{ background: C.surfaceHi, color: C.muted }}>This week</span>
          <span className="tv-split-sub">{weekLabel}</span>
          <span className="tv-split-count" style={{ color: C.ink }}>{weekItems.length}</span>
        </div>
        {rest.length === 0 ? (
          <div className="tv-empty">{weekItems.length === 0 ? "No interviews this week yet." : "No other interviews this week."}</div>
        ) : (
          <div className="tv-event-list tv-event-list--scroll">
            {rest.map((item) => (
              <InterviewCard key={item.id} item={item} accent={accent} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function InterviewCard({ item, accent, highlight }: { item: InterviewItem; accent: string; highlight?: boolean }) {
  return (
    <div className={`tv-event-card${highlight ? " tv-event-card--hot" : ""}`} style={{ "--event-accent": accent } as CSSProperties}>
      <div className="tv-event-date">{fmtShortDate(item.date)}</div>
      <div className="tv-event-main">
        <div className="tv-event-title">{item.candidate}</div>
        <div className="tv-event-sub">{item.company}{item.role ? ` · ${item.role}` : ""}</div>
      </div>
      <div className="tv-event-tag">{item.type} R{item.round}</div>
      <div className="tv-event-team">{(item.team.length ? item.team : ["—"]).join(", ")}</div>
    </div>
  );
}

function PlacementsSlide({ items, weekLabel, accent }: { items: PlacementItem[]; weekLabel: string; accent: string }) {
  const totalFees = items.reduce((s, p) => s + (p.amount ?? 0), 0);
  return (
    <div className="tv-placements">
      <div className="tv-placements-hero">
        <div>
          <div className="tv-placements-kicker">{weekLabel}</div>
          <div className="tv-placements-count" style={{ color: accent }}>{items.length}</div>
          <div className="tv-placements-label">placement{items.length === 1 ? "" : "s"}</div>
        </div>
        {totalFees > 0 ? (
          <div className="tv-placements-fees">
            <div className="tv-placements-fees-label">Fees logged</div>
            <div className="tv-placements-fees-value" style={{ color: C.green }}>{money(totalFees)}</div>
          </div>
        ) : null}
      </div>
      {items.length === 0 ? (
        <div className="tv-empty tv-empty--large">No placements this week yet — keep pushing.</div>
      ) : (
        <div className="tv-placement-grid">
          {items.map((p, i) => (
            <div key={p.id} className="tv-placement-card tv-rise" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="tv-placement-date">{fmtShortDate(p.date)}</div>
              <div className="tv-placement-name">{p.candidate}</div>
              <div className="tv-placement-co">{p.company}</div>
              {p.role ? <div className="tv-placement-role">{p.role}</div> : null}
              <div className="tv-placement-foot">
                <span className="tv-placement-team">{(p.team.length ? p.team : ["—"]).join(" · ")}</span>
                {p.amount != null ? <span className="tv-placement-fee" style={{ color: C.green }}>{money(p.amount)}</span> : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PipelineSlide({ pipeline, accent }: { pipeline: ReturnType<typeof activePipeline>; accent: string }) {
  const stages = [
    { key: "sent" as const, label: "Sent" },
    { key: "interview" as const, label: "Interview" },
    { key: "offer" as const, label: "Offer" },
    { key: "placed" as const, label: "Placed" },
    { key: "declined" as const, label: "Declined" },
  ];
  const max = Math.max(1, ...stages.map((s) => pipeline[s.key]));
  const active = pipeline.sent + pipeline.interview + pipeline.offer;

  return (
    <div className="tv-pipeline">
      <div className="tv-pipeline-hero">
        <div className="tv-pipeline-hero-value" style={{ color: accent }}>{active}</div>
        <div className="tv-pipeline-hero-label">active send-outs in play</div>
      </div>
      <div className="tv-pipeline-stages">
        {stages.map((s, i) => (
          <div key={s.key} className="tv-pipeline-row" style={{ animationDelay: `${i * 70}ms` }}>
            <div className="tv-pipeline-label">{s.label}</div>
            <div className="tv-pipeline-track">
              <div
                className="tv-bar tv-pipeline-bar"
                style={{
                  width: `${(pipeline[s.key] / max) * 100}%`,
                  background: `linear-gradient(90deg, ${STAGE_COLORS[s.key]}99, ${STAGE_COLORS[s.key]})`,
                }}
              />
            </div>
            <div className="tv-pipeline-count" style={{ color: STAGE_COLORS[s.key] }}>{pipeline[s.key]}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  root: {
    position: "fixed",
    inset: 0,
    color: C.ink,
    fontFamily: FONT,
    zIndex: 100,
    display: "flex",
    flexDirection: "column",
    padding: "2vh 2.5vw",
    overflow: "hidden",
  },
  header: {
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    alignItems: "center",
    paddingBottom: "1.4vh",
    borderBottom: `1px solid ${C.border}`,
    position: "relative",
    zIndex: 2,
  },
  brand: { display: "flex", alignItems: "center", gap: 12 },
  brandText: { fontSize: "clamp(16px, 1.8vw, 28px)", fontWeight: 900, letterSpacing: -0.5 },
  headerMid: { justifySelf: "center" },
  headerRight: { display: "flex", alignItems: "center", gap: "1.2vw", justifySelf: "end" },
  clockWrap: { textAlign: "right" },
  clock: {
    fontSize: "clamp(18px, 2.2vw, 36px)",
    fontWeight: 800,
    letterSpacing: 1,
    fontVariantNumeric: "tabular-nums",
  },
  clockDate: { fontSize: "clamp(10px, 0.95vw, 14px)", color: C.muted, marginTop: 2 },
  exitBtn: {
    border: `1px solid ${C.border}`,
    background: C.surface,
    color: C.muted,
    cursor: "pointer",
    borderRadius: 10,
    padding: 8,
    display: "flex",
  },
  sceneTitle: {
    fontSize: "clamp(32px, 4.8vw, 76px)",
    fontWeight: 900,
    letterSpacing: -2,
    margin: "2px 0 0",
    lineHeight: 1,
    color: C.ink,
  },
  footer: {
    display: "grid",
    gridTemplateColumns: "auto 1fr auto",
    alignItems: "center",
    gap: 16,
    paddingTop: "1.4vh",
    position: "relative",
    zIndex: 2,
  },
  progressTrack: {
    width: 120,
    height: 4,
    background: "rgba(255,255,255,0.07)",
    borderRadius: 4,
    overflow: "hidden",
  },
};
