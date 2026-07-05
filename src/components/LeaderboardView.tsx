"use client";

import { Entry } from "@/lib/types";
import { Theme, makeStyles } from "@/lib/ui";

type Styles = ReturnType<typeof makeStyles>;

// gold, silver, bronze — top 3 get special styling, everyone else the plain track color.
const RANK_COLORS = ["#E5C558", "#C7CCD1", "#C08457"];

type Row = { name: string; count: number };

function tally(entries: Entry[], teamNames: string[]): Row[] {
  const counts: Record<string, number> = {};
  for (const name of teamNames) counts[name] = 0;
  for (const e of entries) {
    const credited = e.team.length ? e.team : ["Unassigned"];
    for (const name of credited) counts[name] = (counts[name] || 0) + 1;
  }
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

export default function LeaderboardView({
  entries,
  teamNames,
  t,
}: {
  entries: Entry[];
  teamNames: string[];
  t: Theme;
}) {
  const S = makeStyles(t);
  const all = tally(entries, teamNames);
  const firstTimeOnly = tally(
    entries.filter((e) => e.firstTime),
    teamNames
  );

  return (
    <div style={S.reportPad}>
      <LeaderboardBoard
        S={S}
        t={t}
        title="Leaderboard — All Send-Outs"
        subtitle="Ranked by number of send-outs this month — everyone listed on a shared send-out gets full credit, not a split."
        rows={all}
      />
      <div style={{ height: 8 }} />
      <LeaderboardBoard
        S={S}
        t={t}
        title="Leaderboard — First-Time Only"
        subtitle="Same ranking, limited to first-time business (excludes repeat placements)."
        rows={firstTimeOnly}
      />
    </div>
  );
}

function LeaderboardBoard({
  S,
  t,
  title,
  subtitle,
  rows,
}: {
  S: Styles;
  t: Theme;
  title: string;
  subtitle: string;
  rows: Row[];
}) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div style={S.reportSection}>
      <h3 style={S.chartTitle}>{title}</h3>
      <p style={S.chartSubtitle}>{subtitle}</p>
      {rows.length === 0 ? (
        <div style={S.empty}>No send-outs yet this month.</div>
      ) : (
        rows.map((r, i) => (
          <div key={r.name} className="avid-row-enter" style={S.leaderboardRow}>
            <div
              style={{
                ...S.leaderboardRank,
                background: RANK_COLORS[i] ?? S.leaderboardRank.background,
                color: RANK_COLORS[i] ? "#1A1A18" : t.muted,
              }}
            >
              {i + 1}
            </div>
            <div style={S.leaderboardName}>{r.name}</div>
            <div style={S.leaderboardBarTrack}>
              <div
                className="tv-bar"
                style={{
                  ...S.leaderboardBarFill,
                  width: `${(r.count / max) * 100}%`,
                  background: RANK_COLORS[i] ? `linear-gradient(90deg, ${RANK_COLORS[i]}AA, ${RANK_COLORS[i]})` : t.accent,
                }}
              />
            </div>
            <div style={S.leaderboardCount}>
              {r.count} deal{r.count === 1 ? "" : "s"}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
