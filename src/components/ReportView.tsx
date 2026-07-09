"use client";

import { useMemo, useRef, useState } from "react";
import { Download } from "lucide-react";
import type { Billing, Entry, RetainedSearch } from "@/lib/types";
import { buildYearReport } from "@/lib/report-metrics";
import {
  MONTHS_SHORT,
  SEARCH_STAGE_COLOR,
  STAGE_COLOR,
  CANDIDATE_STAGE_COLOR,
  Theme,
  getTheme,
  makeStyles,
  money,
  moneyCompact,
  niceAxisMax,
  seriesColor,
} from "@/lib/ui";

type Styles = ReturnType<typeof makeStyles>;

const W = 720;
const H = 260;
const MARGIN = { top: 28, right: 16, bottom: 26, left: 54 };
const PLOT_W = W - MARGIN.left - MARGIN.right;
const PLOT_H = H - MARGIN.top - MARGIN.bottom;

function monthX(i: number) {
  return MARGIN.left + (PLOT_W / 11) * i;
}
function valueY(value: number, max: number) {
  return MARGIN.top + PLOT_H - (Math.max(0, value) / max) * PLOT_H;
}
function topRoundedRectPath(x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, Math.max(h, 0));
  if (h <= 0) return `M${x},${y + h} h${w} v0 h${-w} Z`;
  return `M${x},${y + h} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h} Z`;
}

export default function ReportView({
  billings,
  entries,
  searches,
  teamNames,
  year,
  goals,
  t,
  isDark,
}: {
  billings: Billing[];
  entries: Entry[];
  searches: RetainedSearch[];
  teamNames: string[];
  year: number;
  goals: { yearlyGoal: number | null; monthlyGoal: number | null };
  t: Theme;
  isDark: boolean;
}) {
  const S = makeStyles(t);
  const [showTable, setShowTable] = useState(false);

  const report = useMemo(
    () => buildYearReport({ billings, entries, searches, teamNames, year, goals }),
    [billings, entries, searches, teamNames, year, goals]
  );

  const series = report.people.map((name, i) => ({
    name,
    color: seriesColor(i, isDark),
    values: report.byPersonByMonth[name] ?? new Array(12).fill(0),
  }));

  const topProducer = report.recruiters[0]?.name ?? "—";

  const printT = getTheme(false);
  const printS = makeStyles(printT);
  const printSeries = report.people.map((name, i) => ({
    name,
    color: seriesColor(i, false),
    values: report.byPersonByMonth[name] ?? new Array(12).fill(0),
  }));

  return (
    <div className="avid-report">
      <div className="no-print">
        <div className="avid-report-toolbar">
          <p className="avid-report-toolbar-sub" style={{ color: t.muted }}>
            {year} performance across billings, send-outs, searches, and pipeline activity.
          </p>
          <button className="avid-btn" style={S.iconGhost} onClick={() => window.print()} title="Export PDF" aria-label="Export PDF">
            <Download size={18} />
          </button>
        </div>

        <KpiGrid report={report} t={t} />

        <section className="avid-report-section" style={S.reportSection}>
          <SectionHead title="Firm Production" subtitle={`Total billings by month, ${year}`} />
          <FirmBarChart S={S} t={t} data={report.firmByMonth} color={STAGE_COLOR.placed} monthlyGoal={goals.monthlyGoal} visibleMonths={report.visibleMonths} />
        </section>

        <section className="avid-report-section" style={S.reportSection}>
          <SectionHead title="Pipeline Activity" subtitle="Send-outs, offers, placements, and meetings logged per month" />
          <ActivityLineChart
            S={S}
            t={t}
            visibleMonths={report.visibleMonths}
            series={[
              { name: "Send-outs", color: STAGE_COLOR.sent, values: report.sendOutsByMonth },
              { name: "Offers", color: STAGE_COLOR.offer, values: report.offersByMonth },
              { name: "Placements", color: STAGE_COLOR.placed, values: report.placementsByMonth },
              { name: "Meetings", color: STAGE_COLOR.interview, values: report.meetingsByMonth },
            ]}
            valueFormat="count"
          />
        </section>

        <div className="avid-report-split">
          <section className="avid-report-section avid-report-section--half" style={S.reportSection}>
            <SectionHead title="Send-Out Funnel" subtitle={`${report.kpis.sendOuts} send-outs in ${year}`} />
            <FunnelCard
              t={t}
              stages={[
                { key: "sent", label: "Sent", count: report.funnel.sent, color: STAGE_COLOR.sent },
                { key: "interview", label: "Interview", count: report.funnel.interview, color: STAGE_COLOR.interview },
                { key: "offer", label: "Offer", count: report.funnel.offer, color: STAGE_COLOR.offer },
                { key: "placed", label: "Placed", count: report.funnel.placed, color: STAGE_COLOR.placed },
              ]}
              declined={report.funnel.declined}
              avgDaysToOffer={report.avgDaysToOffer}
              avgDaysToPlace={report.avgDaysToPlace}
            />
          </section>

          <section className="avid-report-section avid-report-section--half" style={S.reportSection}>
            <SectionHead title="Collections" subtitle="Invoiced vs collected by month" />
            <CollectionChart
              S={S}
              t={t}
              invoiced={report.invoicedByMonth}
              collected={report.collectedByMonth}
              visibleMonths={report.visibleMonths}
            />
          </section>
        </div>

        <section className="avid-report-section" style={S.reportSection}>
          <SectionHead title="Recruiter Production" subtitle={`Monthly billings per person, ${year}`} />
          <RecruiterLineChart S={S} t={t} series={series} visibleMonths={report.visibleMonths} />
          <div style={S.legendRow}>
            {series.map((s) => (
              <div key={s.name} style={S.legendItem}>
                <span style={{ ...S.legendSwatch, background: s.color }} />
                {s.name}
              </div>
            ))}
          </div>
        </section>

        <section className="avid-report-section" style={S.reportSection}>
          <SectionHead title="Recruiter Scorecard" subtitle="Full-credit totals for everyone on a deal or send-out" />
          <ScorecardTable S={S} t={t} rows={report.recruiters} />
        </section>

        <section className="avid-report-section" style={{ ...S.reportSection, marginBottom: 24 }}>
          <SectionHead title="Retained Searches" subtitle="Current pipeline snapshot across all active searches" />
          <SearchSnapshot t={t} searchStages={report.searchStages} candidateStages={report.candidateStages} pipelineValue={report.kpis.pipelineValue} activeSearches={report.kpis.activeSearches} />
        </section>

        <button className="avid-btn" style={S.ghostBtn} onClick={() => setShowTable((v) => !v)}>
          {showTable ? "Hide production table" : "Show production table"}
        </button>
        <div style={{ ...S.reportTableWrap, marginTop: 16, display: showTable ? "block" : "none" }} className="avid-row-enter">
          <ReportTable S={S} months={MONTHS_SHORT} firmByMonth={report.firmByMonth} series={series} />
        </div>
      </div>

      <div className="print-only" style={{ display: "none" }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: printT.ink }}>Avid Associates — Production Reports</div>
        <div style={{ fontSize: 13, color: printT.muted, marginTop: 4, marginBottom: 28 }}>
          {year} &middot; Billed {money(report.kpis.billed)} &middot; {report.kpis.deals} deals &middot; Top Producer: {topProducer}
        </div>
        <section style={printS.reportSection}>
          <SectionHead title="Firm Production" subtitle={`Total billings by month, ${year}`} />
          <FirmBarChart S={printS} t={printT} data={report.firmByMonth} color={STAGE_COLOR.placed} monthlyGoal={goals.monthlyGoal} visibleMonths={report.visibleMonths} />
        </section>
        <section style={printS.reportSection}>
          <SectionHead title="Recruiter Production" subtitle={`Monthly billings per person, ${year}`} />
          <RecruiterLineChart S={printS} t={printT} series={printSeries} visibleMonths={report.visibleMonths} />
        </section>
        <div style={printS.reportTableWrap}>
          <ReportTable S={printS} months={MONTHS_SHORT} firmByMonth={report.firmByMonth} series={printSeries} />
        </div>
      </div>
    </div>
  );
}

function SectionHead({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <h3 style={{ fontSize: 14.5, fontWeight: 700, margin: 0 }}>{title}</h3>
      <p style={{ fontSize: 12.5, marginTop: 3, marginBottom: 18, fontWeight: 500, opacity: 0.72 }}>{subtitle}</p>
    </div>
  );
}

function KpiGrid({ report, t }: { report: ReturnType<typeof buildYearReport>; t: Theme }) {
  const cards = [
    { label: "Billed", value: money(report.kpis.billed), color: STAGE_COLOR.placed },
    { label: "Collected", value: money(report.kpis.collected), color: "#4FBF82" },
    { label: "Send-Outs", value: String(report.kpis.sendOuts), color: STAGE_COLOR.sent },
    { label: "Offers", value: String(report.kpis.offers), color: STAGE_COLOR.offer },
    { label: "Placements", value: String(report.kpis.placements), color: STAGE_COLOR.placed },
    { label: "Avg Deal", value: report.kpis.deals ? money(report.kpis.avgDeal) : "—", color: t.accent },
    { label: "Pipeline Value", value: report.kpis.pipelineValue ? money(report.kpis.pipelineValue) : "—", color: SEARCH_STAGE_COLOR.interviewing },
    {
      label: "Goal",
      value: report.kpis.goalPct !== null ? `${Math.round(report.kpis.goalPct * 100)}%` : "—",
      color: report.kpis.goalPct !== null && report.kpis.goalPct >= 1 ? "#4FBF82" : t.accent,
    },
  ];
  return (
    <div className="avid-report-kpis">
      {cards.map((c) => (
        <div key={c.label} className="avid-report-kpi" style={{ background: t.surfaceAlt, borderColor: t.border }}>
          <span className="avid-report-kpi-label" style={{ color: t.mutedSoft }}>
            {c.label}
          </span>
          <span className="avid-report-kpi-value" style={{ color: c.color }}>
            {c.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function FunnelCard({
  t,
  stages,
  declined,
  avgDaysToOffer,
  avgDaysToPlace,
}: {
  t: Theme;
  stages: { key: string; label: string; count: number; color: string }[];
  declined: number;
  avgDaysToOffer: number | null;
  avgDaysToPlace: number | null;
}) {
  const max = Math.max(1, ...stages.map((s) => s.count));
  return (
    <div className="avid-report-funnel" style={{ borderColor: t.border, background: t.surfaceAlt }}>
      {stages.map((s) => (
        <div key={s.key} className="avid-report-funnel-row">
          <span className="avid-report-funnel-label" style={{ color: t.muted }}>
            {s.label}
          </span>
          <div className="avid-report-funnel-track" style={{ background: t.surface }}>
            <div className="avid-report-funnel-fill" style={{ width: `${(s.count / max) * 100}%`, background: s.color }} />
          </div>
          <span className="avid-report-funnel-count" style={{ color: t.ink }}>
            {s.count}
          </span>
        </div>
      ))}
      <div className="avid-report-funnel-foot" style={{ borderTopColor: t.border, color: t.mutedSoft }}>
        <span>{declined} declined</span>
        {avgDaysToOffer !== null ? <span>Avg {avgDaysToOffer}d to offer</span> : null}
        {avgDaysToPlace !== null ? <span>Avg {avgDaysToPlace}d to place</span> : null}
      </div>
    </div>
  );
}

function SearchSnapshot({
  t,
  searchStages,
  candidateStages,
  pipelineValue,
  activeSearches,
}: {
  t: Theme;
  searchStages: { sourcing: number; interviewing: number; placed: number; stale: number };
  candidateStages: { presented: number; interview: number; offer: number; placed: number };
  pipelineValue: number;
  activeSearches: number;
}) {
  const searchPills = [
    { label: "Sourcing", count: searchStages.sourcing, color: SEARCH_STAGE_COLOR.sourcing },
    { label: "Interviewing", count: searchStages.interviewing, color: SEARCH_STAGE_COLOR.interviewing },
    { label: "Placed", count: searchStages.placed, color: SEARCH_STAGE_COLOR.placed },
    { label: "Stale", count: searchStages.stale, color: SEARCH_STAGE_COLOR.stale },
  ];
  const candidatePills = [
    { label: "Presented", count: candidateStages.presented, color: CANDIDATE_STAGE_COLOR.presented },
    { label: "Interview", count: candidateStages.interview, color: CANDIDATE_STAGE_COLOR.interview },
    { label: "Offer", count: candidateStages.offer, color: CANDIDATE_STAGE_COLOR.offer },
    { label: "Placed", count: candidateStages.placed, color: CANDIDATE_STAGE_COLOR.placed },
  ];
  return (
    <div className="avid-report-search-snapshot" style={{ borderColor: t.border, background: t.surfaceAlt }}>
      <div className="avid-report-search-summary">
        <div>
          <span className="avid-report-search-stat-label" style={{ color: t.mutedSoft }}>
            Active searches
          </span>
          <span className="avid-report-search-stat-value" style={{ color: t.ink }}>
            {activeSearches}
          </span>
        </div>
        <div>
          <span className="avid-report-search-stat-label" style={{ color: t.mutedSoft }}>
            Est. pipeline
          </span>
          <span className="avid-report-search-stat-value" style={{ color: STAGE_COLOR.placed }}>
            {pipelineValue ? money(pipelineValue) : "—"}
          </span>
        </div>
      </div>
      <div className="avid-report-pill-group">
        <span className="avid-report-pill-heading" style={{ color: t.mutedSoft }}>
          Searches
        </span>
        <div className="avid-report-pills">
          {searchPills.map((p) => (
            <span key={p.label} className="avid-report-pill" style={{ borderColor: `${p.color}44`, color: p.color, background: `${p.color}12` }}>
              {p.label} <strong>{p.count}</strong>
            </span>
          ))}
        </div>
      </div>
      <div className="avid-report-pill-group">
        <span className="avid-report-pill-heading" style={{ color: t.mutedSoft }}>
          Candidates
        </span>
        <div className="avid-report-pills">
          {candidatePills.map((p) => (
            <span key={p.label} className="avid-report-pill" style={{ borderColor: `${p.color}44`, color: p.color, background: `${p.color}12` }}>
              {p.label} <strong>{p.count}</strong>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function ScorecardTable({ S, t, rows }: { S: Styles; t: Theme; rows: ReturnType<typeof buildYearReport>["recruiters"] }) {
  const cols = "1.2fr repeat(6, minmax(72px, 1fr))";
  return (
    <div style={S.reportTableWrap}>
      <div style={{ ...S.reportTableHeadRow, gridTemplateColumns: cols }}>
        <div>Recruiter</div>
        <div>Billed</div>
        <div>Deals</div>
        <div>Send-Outs</div>
        <div>Offers</div>
        <div>Placed</div>
        <div>Meetings</div>
      </div>
      {rows.map((r) => (
        <div key={r.name} style={{ ...S.reportTableRow, gridTemplateColumns: cols, borderBottom: `1px solid ${t.border}` }}>
          <div style={{ ...S.reportTableCell, fontWeight: 700 }}>{r.name}</div>
          <div style={S.reportTableCell}>{money(r.billed)}</div>
          <div style={S.reportTableCell}>{r.deals}</div>
          <div style={S.reportTableCell}>{r.sendOuts}</div>
          <div style={S.reportTableCell}>{r.offers}</div>
          <div style={S.reportTableCell}>{r.placements}</div>
          <div style={S.reportTableCell}>{r.meetings}</div>
        </div>
      ))}
    </div>
  );
}

function CollectionChart({
  S,
  t,
  invoiced,
  collected,
  visibleMonths,
}: {
  S: Styles;
  t: Theme;
  invoiced: number[];
  collected: number[];
  visibleMonths: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const visibleInv = invoiced.slice(0, visibleMonths);
  const visibleCol = collected.slice(0, visibleMonths);
  const { max: yMax, step } = niceAxisMax(Math.max(...visibleInv, ...visibleCol, 0));
  const ticks = [0, step, step * 2, step * 3, step * 4];
  const bandW = PLOT_W / 12;
  const barW = Math.min(14, bandW * 0.22);
  const gap = 3;

  return (
    <div style={{ position: "relative" }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }} role="img" aria-label="Collections by month">
        {ticks.map((tick, i) => {
          const y = valueY(tick, yMax);
          return (
            <g key={i}>
              <line x1={MARGIN.left} x2={W - MARGIN.right} y1={y} y2={y} stroke={t.border} strokeWidth={1} />
              <text x={MARGIN.left - 10} y={y} textAnchor="end" dominantBaseline="middle" fontSize={10.5} fill={t.mutedSoft}>
                {moneyCompact(tick)}
              </text>
            </g>
          );
        })}
        {invoiced.map((v, i) => {
          if (i >= visibleMonths) return null;
          const cx = monthX(i);
          const col = collected[i] ?? 0;
          const y1 = valueY(v, yMax);
          const h1 = MARGIN.top + PLOT_H - y1;
          const y2 = valueY(col, yMax);
          const h2 = MARGIN.top + PLOT_H - y2;
          return (
            <g key={i}>
              <rect
                x={cx - barW - gap / 2}
                y={y1}
                width={barW}
                height={Math.max(h1, 0)}
                rx={3}
                fill={STAGE_COLOR.interview}
                opacity={hover === i ? 1 : 0.82}
              />
              <rect
                x={cx + gap / 2}
                y={y2}
                width={barW}
                height={Math.max(h2, 0)}
                rx={3}
                fill={STAGE_COLOR.placed}
                opacity={hover === i ? 1 : 0.82}
              />
              <rect
                x={cx - bandW / 2}
                y={MARGIN.top}
                width={bandW}
                height={PLOT_H}
                fill="transparent"
                onPointerEnter={() => setHover(i)}
                onPointerLeave={() => setHover(null)}
              />
              <text x={cx} y={H - 8} textAnchor="middle" fontSize={11} fill={t.mutedSoft}>
                {MONTHS_SHORT[i]}
              </text>
            </g>
          );
        })}
      </svg>
      <div style={{ ...S.legendRow, marginTop: 8 }}>
        <div style={S.legendItem}>
          <span style={{ ...S.legendSwatch, background: STAGE_COLOR.interview }} />
          Invoiced
        </div>
        <div style={S.legendItem}>
          <span style={{ ...S.legendSwatch, background: STAGE_COLOR.placed }} />
          Collected
        </div>
      </div>
      {hover !== null && (
        <div style={{ ...S.chartTooltip, left: `${(monthX(hover) / W) * 100}%`, top: `${(MARGIN.top / H) * 100}%`, transform: "translate(-50%, -100%)" }}>
          <div style={S.tooltipMonth}>{MONTHS_SHORT[hover]}</div>
          <div style={S.tooltipRow}>
            <span style={S.tooltipName}>Invoiced</span>
            <span style={S.tooltipValue}>{money(invoiced[hover])}</span>
          </div>
          <div style={S.tooltipRow}>
            <span style={S.tooltipName}>Collected</span>
            <span style={S.tooltipValue}>{money(collected[hover])}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function ActivityLineChart({
  S,
  t,
  series,
  visibleMonths,
  valueFormat,
}: {
  S: Styles;
  t: Theme;
  series: { name: string; color: string; values: number[] }[];
  visibleMonths: number;
  valueFormat: "count" | "money";
}) {
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const visibleValues = series.flatMap((s) => s.values.slice(0, visibleMonths));
  const { max: yMax, step } = niceAxisMax(Math.max(...visibleValues, 0));
  const ticks = [0, step, step * 2, step * 3, step * 4];
  const fmt = valueFormat === "money" ? moneyCompact : (n: number) => String(n);

  const onMove = (evt: React.PointerEvent<SVGRectElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const relX = ((evt.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((relX - MARGIN.left) / PLOT_W) * 11);
    setHover(Math.min(visibleMonths - 1, Math.max(0, i)));
  };

  return (
    <div style={{ position: "relative" }}>
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }} role="img" aria-label="Pipeline activity by month">
        {ticks.map((tick, i) => {
          const y = valueY(tick, yMax);
          return (
            <g key={i}>
              <line x1={MARGIN.left} x2={W - MARGIN.right} y1={y} y2={y} stroke={t.border} strokeWidth={1} />
              <text x={MARGIN.left - 10} y={y} textAnchor="end" dominantBaseline="middle" fontSize={10.5} fill={t.mutedSoft}>
                {fmt(tick)}
              </text>
            </g>
          );
        })}
        {MONTHS_SHORT.map((m, i) => (
          <text key={m} x={monthX(i)} y={H - 8} textAnchor="middle" fontSize={11} fill={t.mutedSoft}>
            {m}
          </text>
        ))}
        {hover !== null && (
          <line x1={monthX(hover)} x2={monthX(hover)} y1={MARGIN.top} y2={MARGIN.top + PLOT_H} stroke={t.mutedSoft} strokeWidth={1} strokeDasharray="3 3" />
        )}
        {series.map((s) => {
          const visible = s.values.slice(0, visibleMonths);
          const d = visible.map((v, i) => `${i === 0 ? "M" : "L"}${monthX(i)},${valueY(v, yMax)}`).join(" ");
          return (
            <g key={s.name}>
              <path d={d} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              {visible.map((v, i) => (
                <circle key={i} cx={monthX(i)} cy={valueY(v, yMax)} r={hover === i ? 4.5 : 3} fill={s.color} stroke={t.surface} strokeWidth={2} />
              ))}
            </g>
          );
        })}
        <rect
          x={MARGIN.left}
          y={MARGIN.top}
          width={visibleMonths >= 12 ? PLOT_W : monthX(visibleMonths - 1) - MARGIN.left + PLOT_W / 22}
          height={PLOT_H}
          fill="transparent"
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
          style={{ cursor: "crosshair" }}
        />
      </svg>
      <div style={S.legendRow}>
        {series.map((s) => (
          <div key={s.name} style={S.legendItem}>
            <span style={{ ...S.legendSwatch, background: s.color }} />
            {s.name}
          </div>
        ))}
      </div>
      {hover !== null && (
        <div
          style={{
            ...S.chartTooltip,
            left: `${(monthX(hover) / W) * 100}%`,
            top: `${(MARGIN.top / H) * 100}%`,
            transform: `translate(${hover > 6 ? "-100%" : "0%"}, -100%)`,
          }}
        >
          <div style={S.tooltipMonth}>{MONTHS_SHORT[hover]}</div>
          {series.map((s) => (
            <div key={s.name} style={S.tooltipRow}>
              <span style={{ ...S.legendSwatch, background: s.color }} />
              <span style={S.tooltipName}>{s.name}</span>
              <span style={S.tooltipValue}>{valueFormat === "money" ? money(s.values[hover]) : s.values[hover]}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FirmBarChart({
  S,
  t,
  data,
  color,
  monthlyGoal,
  visibleMonths = 12,
}: {
  S: Styles;
  t: Theme;
  data: number[];
  color: string;
  monthlyGoal?: number | null;
  visibleMonths?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const visibleData = data.slice(0, visibleMonths);
  const hasGoal = !!monthlyGoal && monthlyGoal > 0;
  const { max: yMax, step } = niceAxisMax(Math.max(...visibleData, hasGoal ? monthlyGoal! : 0, 0));
  const ticks = [0, step, step * 2, step * 3, step * 4];
  const bandW = PLOT_W / 12;
  const barW = Math.min(24, bandW * 0.55);
  const peakIndex = data.indexOf(Math.max(...visibleData));
  const goalY = hasGoal ? valueY(monthlyGoal!, yMax) : null;
  const leftPct = (i: number) => (monthX(i) / W) * 100;
  const topPct = (MARGIN.top / H) * 100;

  return (
    <div style={{ position: "relative" }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }} role="img" aria-label="Firm production by month">
        {ticks.map((tick, i) => {
          const y = valueY(tick, yMax);
          return (
            <g key={i}>
              <line x1={MARGIN.left} x2={W - MARGIN.right} y1={y} y2={y} stroke={t.border} strokeWidth={1} />
              <text x={MARGIN.left - 10} y={y} textAnchor="end" dominantBaseline="middle" fontSize={10.5} fill={t.mutedSoft}>
                {moneyCompact(tick)}
              </text>
            </g>
          );
        })}
        {data.map((v, i) => {
          const isFuture = i >= visibleMonths;
          const x = monthX(i) - barW / 2;
          const y = valueY(v, yMax);
          const h = MARGIN.top + PLOT_H - y;
          const isHover = hover === i;
          const underGoal = hasGoal && v < monthlyGoal!;
          const barColor = underGoal ? t.danger : color;
          return (
            <g key={i}>
              {!isFuture && (
                <>
                  <rect
                    x={monthX(i) - bandW / 2}
                    y={MARGIN.top}
                    width={bandW}
                    height={PLOT_H}
                    fill="transparent"
                    onPointerEnter={() => setHover(i)}
                    onPointerLeave={() => setHover(null)}
                    style={{ cursor: "pointer" }}
                  />
                  <path d={topRoundedRectPath(x, y, barW, Math.max(h, 0), 4)} fill={barColor} opacity={isHover ? 1 : 0.85} />
                  {v > 0 && (
                    <text x={monthX(i)} y={y - 8} textAnchor="middle" fontSize={11} fontWeight={i === peakIndex ? 700 : 600} fill={i === peakIndex ? t.ink : t.muted}>
                      {moneyCompact(v)}
                    </text>
                  )}
                </>
              )}
              <text x={monthX(i)} y={H - 8} textAnchor="middle" fontSize={11} fill={t.mutedSoft}>
                {MONTHS_SHORT[i]}
              </text>
            </g>
          );
        })}
        {hasGoal && goalY !== null && (
          <g>
            <line x1={MARGIN.left} x2={W - MARGIN.right} y1={goalY} y2={goalY} stroke={t.accent} strokeWidth={1.5} strokeDasharray="6 4" />
            <text x={W - MARGIN.right} y={goalY - 7} textAnchor="end" fontSize={10.5} fontWeight={700} fill={t.accent}>
              Goal {moneyCompact(monthlyGoal!)}
            </text>
          </g>
        )}
      </svg>
      {hover !== null && (
        <div style={{ ...S.chartTooltip, left: `${leftPct(hover)}%`, top: `${topPct}%`, transform: "translate(-50%, -100%)" }}>
          <div style={S.tooltipMonth}>{MONTHS_SHORT[hover]}</div>
          <div style={S.tooltipRow}>
            <span style={S.tooltipValue}>{money(data[hover])}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function RecruiterLineChart({
  S,
  t,
  series,
  visibleMonths = 12,
}: {
  S: Styles;
  t: Theme;
  series: { name: string; color: string; values: number[] }[];
  visibleMonths?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const visibleValues = series.flatMap((s) => s.values.slice(0, visibleMonths));
  const { max: yMax, step } = niceAxisMax(Math.max(...visibleValues, 0));
  const ticks = [0, step, step * 2, step * 3, step * 4];

  const onMove = (evt: React.PointerEvent<SVGRectElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const relX = ((evt.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((relX - MARGIN.left) / PLOT_W) * 11);
    setHover(Math.min(visibleMonths - 1, Math.max(0, i)));
  };

  const leftPct = hover === null ? 0 : (monthX(hover) / W) * 100;
  const topPct = (MARGIN.top / H) * 100;
  const rows = hover === null ? [] : [...series].sort((a, b) => b.values[hover] - a.values[hover]);

  return (
    <div style={{ position: "relative" }}>
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }} role="img" aria-label="Total production by recruiter, by month">
        {ticks.map((tick, i) => {
          const y = valueY(tick, yMax);
          return (
            <g key={i}>
              <line x1={MARGIN.left} x2={W - MARGIN.right} y1={y} y2={y} stroke={t.border} strokeWidth={1} />
              <text x={MARGIN.left - 10} y={y} textAnchor="end" dominantBaseline="middle" fontSize={10.5} fill={t.mutedSoft}>
                {moneyCompact(tick)}
              </text>
            </g>
          );
        })}
        {MONTHS_SHORT.map((m, i) => (
          <text key={m} x={monthX(i)} y={H - 8} textAnchor="middle" fontSize={11} fill={t.mutedSoft}>
            {m}
          </text>
        ))}
        {hover !== null && (
          <line x1={monthX(hover)} x2={monthX(hover)} y1={MARGIN.top} y2={MARGIN.top + PLOT_H} stroke={t.mutedSoft} strokeWidth={1} strokeDasharray="3 3" />
        )}
        {series.map((s) => {
          const visible = s.values.slice(0, visibleMonths);
          const d = visible.map((v, i) => `${i === 0 ? "M" : "L"}${monthX(i)},${valueY(v, yMax)}`).join(" ");
          return (
            <g key={s.name}>
              <path d={d} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              {visible.map((v, i) => (
                <circle key={i} cx={monthX(i)} cy={valueY(v, yMax)} r={hover === i ? 5 : 3} fill={s.color} stroke={t.surface} strokeWidth={2} />
              ))}
            </g>
          );
        })}
        <rect
          x={MARGIN.left}
          y={MARGIN.top}
          width={visibleMonths >= 12 ? PLOT_W : monthX(visibleMonths - 1) - MARGIN.left + PLOT_W / 22}
          height={PLOT_H}
          fill="transparent"
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
          style={{ cursor: "crosshair" }}
        />
      </svg>
      {hover !== null && rows.length > 0 && (
        <div style={{ ...S.chartTooltip, left: `${leftPct}%`, top: `${topPct}%`, transform: `translate(${hover > 6 ? "-100%" : "0%"}, -100%)` }}>
          <div style={S.tooltipMonth}>{MONTHS_SHORT[hover]}</div>
          {rows.map((r) => (
            <div key={r.name} style={S.tooltipRow}>
              <span style={{ ...S.legendSwatch, background: r.color }} />
              <span style={S.tooltipName}>{r.name}</span>
              <span style={S.tooltipValue}>{money(r.values[hover])}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReportTable({
  S,
  months,
  firmByMonth,
  series,
}: {
  S: Styles;
  months: string[];
  firmByMonth: number[];
  series: { name: string; color: string; values: number[] }[];
}) {
  const cols = `100px 120px repeat(${series.length}, 1fr)`;
  const totalRow = [firmByMonth.reduce((s, v) => s + v, 0), ...series.map((s) => s.values.reduce((sum, v) => sum + v, 0))];
  return (
    <div>
      <div style={{ ...S.reportTableHeadRow, gridTemplateColumns: cols }}>
        <div>Month</div>
        <div>Firm Total</div>
        {series.map((s) => (
          <div key={s.name}>{s.name}</div>
        ))}
      </div>
      {months.map((m, i) => (
        <div key={m} style={{ ...S.reportTableRow, gridTemplateColumns: cols }}>
          <div style={S.reportTableCell}>{m}</div>
          <div style={S.reportTableCell}>{money(firmByMonth[i])}</div>
          {series.map((s) => (
            <div key={s.name} style={S.reportTableCell}>
              {money(s.values[i])}
            </div>
          ))}
        </div>
      ))}
      <div style={{ ...S.reportTableRow, ...S.reportTableTotalRow, gridTemplateColumns: cols }}>
        <div style={S.reportTableCell}>Total</div>
        {totalRow.map((v, i) => (
          <div key={i} style={S.reportTableCell}>
            {money(v)}
          </div>
        ))}
      </div>
    </div>
  );
}
