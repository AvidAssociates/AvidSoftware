"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { Billing, Entry } from "@/lib/types";
import { LOGO_ICON_SRC } from "@/lib/logos";
import { FONT, money } from "@/lib/ui";

// TV mode is always dark + flashy regardless of the app theme.
const C = {
  bg0: "#141413",
  bg1: "#1E1E1C",
  surface: "rgba(255,255,255,0.035)",
  surfaceHi: "rgba(255,255,255,0.06)",
  border: "rgba(255,255,255,0.08)",
  ink: "#F4F2ED",
  muted: "#A6A199",
  mutedSoft: "#726E66",
  red: "#ED1D24",
  green: "#4FBF82",
  amber: "#E5A53B",
  blue: "#8C92F0",
};
const RANK = ["#E5C558", "#C7CCD1", "#C08457"];

type Scene = { key: "sendouts" | "billings"; label: string; accent: string };
const SCENES: Scene[] = [
  { key: "sendouts", label: "Send-Outs", accent: C.blue },
  { key: "billings", label: "Billings", accent: C.green },
];
const CYCLE_MS = 12000;

function monthKeyOf(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function TVMode({
  entries,
  billings,
  roster,
  onExit,
}: {
  entries: Entry[];
  billings: Billing[];
  roster: string[];
  onExit: () => void;
}) {
  const [sceneIdx, setSceneIdx] = useState(0);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const cycle = setInterval(
      () => setSceneIdx((i) => (i + 1) % SCENES.length),
      CYCLE_MS
    );
    const clock = setInterval(() => setNow(new Date()), 1000);
    return () => {
      clearInterval(cycle);
      clearInterval(clock);
    };
  }, []);

  const monthKey = monthKeyOf(now);
  const monthLabel = now.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const monthEntries = useMemo(
    () => entries.filter((e) => e.date?.startsWith(monthKey)),
    [entries, monthKey]
  );
  const monthBillings = useMemo(
    () => billings.filter((b) => b.date?.startsWith(monthKey)),
    [billings, monthKey]
  );

  const sendoutStats = useMemo(() => {
    const board = roster
      .map((name) => ({
        name,
        count: monthEntries.filter((e) => (e.team || []).includes(name)).length,
        placed: monthEntries.filter(
          (e) => (e.team || []).includes(name) && e.stage === "placed" && !e.declined
        ).length,
      }))
      .sort((a, b) => b.count - a.count || b.placed - a.placed);
    return {
      board,
      total: monthEntries.length,
      placed: monthEntries.filter((e) => e.stage === "placed" && !e.declined).length,
      active: monthEntries.filter((e) => !e.declined && e.stage !== "placed").length,
      declined: monthEntries.filter((e) => e.declined).length,
    };
  }, [monthEntries, roster]);

  const billingStats = useMemo(() => {
    const board = roster
      .map((name) => ({
        name,
        amount: monthBillings
          .filter((b) => b.recruiter === name)
          .reduce((s, b) => s + b.amount, 0),
        deals: monthBillings.filter((b) => b.recruiter === name).length,
      }))
      .sort((a, b) => b.amount - a.amount);
    const total = monthBillings.reduce((s, b) => s + b.amount, 0);
    return {
      board,
      total,
      deals: monthBillings.length,
      avg: monthBillings.length ? Math.round(total / monthBillings.length) : 0,
    };
  }, [monthBillings, roster]);

  const scene = SCENES[sceneIdx];

  return (
    <div style={S.root}>
      {/* header */}
      <div style={S.header}>
        <div style={S.brand}>
          {LOGO_ICON_SRC ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={LOGO_ICON_SRC} alt="" style={{ width: 30 }} />
          ) : null}
          <span style={S.brandText}>
            AVID <span style={{ color: C.red }}>ASSOCIATES</span>
          </span>
        </div>
        <div style={S.headerRight}>
          <div style={S.clockWrap}>
            <div style={S.clock}>
              {now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
            </div>
            <div style={S.clockDate}>
              {now.toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </div>
          </div>
          <button style={S.exitBtn} onClick={onExit} title="Exit TV mode">
            <X size={20} />
          </button>
        </div>
      </div>

      {/* scene */}
      <div key={scene.key} style={S.sceneWrap} className="tv-rise">
        <div style={S.sceneHead}>
          <div style={{ ...S.sceneKicker, color: scene.accent }}>{monthLabel}</div>
          <h1 style={S.sceneTitle}>{scene.label}</h1>
        </div>

        {scene.key === "sendouts" ? (
          <>
            <div style={S.statRow}>
              <StatTile label="Total Send-Outs" value={String(sendoutStats.total)} color={C.ink} />
              <StatTile label="Placed" value={String(sendoutStats.placed)} color={C.green} />
              <StatTile label="Active" value={String(sendoutStats.active)} color={C.blue} />
              <StatTile label="Declined" value={String(sendoutStats.declined)} color={C.red} />
            </div>
            <Leaderboard
              rows={sendoutStats.board.map((r) => ({
                name: r.name,
                value: r.count,
                display: String(r.count),
                sub: `${r.placed} placed`,
              }))}
              accent={scene.accent}
            />
          </>
        ) : (
          <>
            <div style={S.statRow}>
              <StatTile label="Billed This Month" value={money(billingStats.total)} color={C.green} />
              <StatTile label="Placements" value={String(billingStats.deals)} color={C.ink} />
              <StatTile label="Avg Deal" value={money(billingStats.avg)} color={C.amber} />
            </div>
            <Leaderboard
              rows={billingStats.board.map((r) => ({
                name: r.name,
                value: r.amount,
                display: money(r.amount),
                sub: `${r.deals} deal${r.deals === 1 ? "" : "s"}`,
              }))}
              accent={scene.accent}
            />
          </>
        )}
      </div>

      {/* footer: scene dots + cycle progress */}
      <div style={S.footer}>
        <div style={S.dots}>
          {SCENES.map((s, i) => (
            <span
              key={s.key}
              style={{
                width: i === sceneIdx ? 26 : 8,
                height: 8,
                borderRadius: 8,
                background: i === sceneIdx ? scene.accent : C.mutedSoft,
                transition: "all .3s ease",
              }}
            />
          ))}
        </div>
        <div style={S.progressTrack}>
          <div
            key={scene.key}
            className="tv-progress"
            style={{ background: scene.accent, animationDuration: `${CYCLE_MS}ms` }}
          />
        </div>
      </div>
    </div>
  );
}

function StatTile({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={S.statTile}>
      <div style={{ ...S.statValue, color }}>{value}</div>
      <div style={S.statLabel}>{label}</div>
    </div>
  );
}

function Leaderboard({
  rows,
  accent,
}: {
  rows: { name: string; value: number; display: string; sub: string }[];
  accent: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div style={S.board}>
      {rows.map((r, i) => {
        const isLeader = i === 0 && r.value > 0;
        return (
          <div
            key={r.name}
            style={{
              ...S.boardRow,
              background: isLeader ? C.surfaceHi : C.surface,
              boxShadow: isLeader ? `0 0 0 1px ${accent}55` : "none",
            }}
          >
            <div
              style={{
                ...S.rankBadge,
                background: RANK[i] || "rgba(255,255,255,0.08)",
                color: RANK[i] ? "#1A1A18" : C.muted,
              }}
            >
              {i + 1}
            </div>
            <div style={S.boardName}>{r.name}</div>
            <div style={S.barWrap}>
              <div
                className="tv-bar"
                style={{
                  width: `${(r.value / max) * 100}%`,
                  background: `linear-gradient(90deg, ${accent}AA, ${accent})`,
                }}
              />
            </div>
            <div style={S.boardValue}>{r.display}</div>
            <div style={S.boardSub}>{r.sub}</div>
          </div>
        );
      })}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  root: {
    position: "fixed",
    inset: 0,
    background: `radial-gradient(1200px 600px at 70% -10%, ${C.bg1}, ${C.bg0})`,
    color: C.ink,
    fontFamily: FONT,
    zIndex: 100,
    display: "flex",
    flexDirection: "column",
    padding: "2.2vh 3vw",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: "1.6vh",
    borderBottom: `1px solid ${C.border}`,
  },
  brand: { display: "flex", alignItems: "center", gap: 12 },
  brandText: { fontSize: "clamp(18px, 2vw, 30px)", fontWeight: 900, letterSpacing: -0.5 },
  headerRight: { display: "flex", alignItems: "center", gap: "1.4vw" },
  clockWrap: { textAlign: "right" },
  clock: {
    fontSize: "clamp(20px, 2.4vw, 38px)",
    fontWeight: 800,
    letterSpacing: 1,
    fontVariantNumeric: "tabular-nums",
  },
  clockDate: { fontSize: "clamp(11px, 1vw, 15px)", color: C.muted, marginTop: 2 },
  exitBtn: {
    border: `1px solid ${C.border}`,
    background: C.surface,
    color: C.muted,
    cursor: "pointer",
    borderRadius: 10,
    padding: 8,
    display: "flex",
  },
  sceneWrap: { flex: 1, display: "flex", flexDirection: "column", paddingTop: "2.5vh", minHeight: 0 },
  sceneHead: { marginBottom: "2vh" },
  sceneKicker: { fontSize: "clamp(12px, 1.2vw, 18px)", fontWeight: 800, letterSpacing: 2, textTransform: "uppercase" },
  sceneTitle: { fontSize: "clamp(34px, 5.5vw, 88px)", fontWeight: 900, letterSpacing: -2, margin: "4px 0 0", lineHeight: 1 },
  statRow: { display: "flex", gap: "1.5vw", marginBottom: "2.5vh" },
  statTile: {
    flex: 1,
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 16,
    padding: "1.8vh 1.6vw",
  },
  statValue: {
    fontSize: "clamp(28px, 3.6vw, 60px)",
    fontWeight: 900,
    letterSpacing: -1.5,
    lineHeight: 1,
    fontVariantNumeric: "tabular-nums",
  },
  statLabel: {
    fontSize: "clamp(11px, 1vw, 16px)",
    color: C.muted,
    marginTop: "1vh",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  board: { flex: 1, display: "flex", flexDirection: "column", gap: "1.1vh", minHeight: 0 },
  boardRow: {
    display: "flex",
    alignItems: "center",
    gap: "1.6vw",
    borderRadius: 14,
    padding: "1.5vh 1.6vw",
    border: `1px solid ${C.border}`,
  },
  rankBadge: {
    width: "clamp(30px, 2.6vw, 46px)",
    height: "clamp(30px, 2.6vw, 46px)",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 900,
    fontSize: "clamp(15px, 1.5vw, 24px)",
    flexShrink: 0,
  },
  boardName: {
    width: "16vw",
    fontSize: "clamp(18px, 2vw, 34px)",
    fontWeight: 800,
    letterSpacing: -0.5,
    flexShrink: 0,
  },
  barWrap: {
    flex: 1,
    height: "clamp(14px, 1.6vw, 26px)",
    background: "rgba(255,255,255,0.05)",
    borderRadius: 20,
    overflow: "hidden",
  },
  boardValue: {
    width: "9vw",
    textAlign: "right",
    fontSize: "clamp(20px, 2.4vw, 40px)",
    fontWeight: 900,
    letterSpacing: -1,
    fontVariantNumeric: "tabular-nums",
    flexShrink: 0,
  },
  boardSub: {
    width: "7vw",
    textAlign: "right",
    fontSize: "clamp(11px, 1vw, 16px)",
    color: C.muted,
    fontWeight: 600,
    flexShrink: 0,
  },
  footer: { display: "flex", alignItems: "center", gap: 16, paddingTop: "1.6vh" },
  dots: { display: "flex", alignItems: "center", gap: 8 },
  progressTrack: {
    flex: 1,
    height: 4,
    background: "rgba(255,255,255,0.07)",
    borderRadius: 4,
    overflow: "hidden",
  },
};
