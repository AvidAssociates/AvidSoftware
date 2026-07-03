"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Settings, X } from "lucide-react";
import { Billing } from "@/lib/types";
import {
  MONTHS_SHORT,
  STAGE_COLOR,
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
// Rounded top corners only, square baseline — the bar mark spec.
function topRoundedRectPath(x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, Math.max(h, 0));
  if (h <= 0) return `M${x},${y + h} h${w} v0 h${-w} Z`;
  return `M${x},${y + h} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h} Z`;
}

export default function ReportView({
  billings,
  teamNames,
  year,
  t,
  isDark,
}: {
  billings: Billing[];
  teamNames: string[];
  year: number;
  t: Theme;
  isDark: boolean;
}) {
  const S = makeStyles(t);
  const [showTable, setShowTable] = useState(false);
  const [showGoalsModal, setShowGoalsModal] = useState(false);
  const [goals, setGoals] = useState<{ yearlyGoal: number | null; monthlyGoal: number | null }>({
    yearlyGoal: null,
    monthlyGoal: null,
  });

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/goals?year=${year}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data) setGoals({ yearlyGoal: data.yearlyGoal ?? null, monthlyGoal: data.monthlyGoal ?? null });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [year]);

  const yearBillings = useMemo(
    () => billings.filter((b) => b.date?.startsWith(String(year))),
    [billings, year]
  );

  const firmByMonth = useMemo(() => {
    const arr = new Array(12).fill(0);
    for (const b of yearBillings) {
      const m = Number(b.date.slice(5, 7)) - 1;
      if (m >= 0 && m < 12) arr[m] += b.amount;
    }
    return arr;
  }, [yearBillings]);

  const people = useMemo(
    () => (teamNames.length ? teamNames : Array.from(new Set(yearBillings.flatMap((b) => b.team)))),
    [teamNames, yearBillings]
  );

  // Every person listed on a team deal is credited the full amount — same
  // "credit everyone, don't split" rule as the Billings tab's Total column.
  const byPersonByMonth = useMemo(() => {
    const map: Record<string, number[]> = {};
    for (const name of people) map[name] = new Array(12).fill(0);
    for (const b of yearBillings) {
      const m = Number(b.date.slice(5, 7)) - 1;
      if (m < 0 || m >= 12) continue;
      for (const name of b.team) {
        if (map[name]) map[name][m] += b.amount;
      }
    }
    return map;
  }, [yearBillings, people]);

  const series = people.map((name, i) => ({ name, color: seriesColor(i, isDark), values: byPersonByMonth[name] }));

  let topProducer = "—";
  let topAmount = 0;
  for (const s of series) {
    const total = s.values.reduce((a, b) => a + b, 0);
    if (total > topAmount) {
      topProducer = s.name;
      topAmount = total;
    }
  }

  const firmTotal = firmByMonth.reduce((a, b) => a + b, 0);

  // A fixed light theme for the printed rendition — a PDF should always look
  // like clean print, independent of whatever theme the screen happens to
  // be in when Export is clicked.
  const printT = getTheme(false);
  const printS = makeStyles(printT);
  const printSeries = people.map((name, i) => ({ name, color: seriesColor(i, false), values: byPersonByMonth[name] }));

  return (
    <div>
      <div className="no-print">
        <div style={S.reportSection}>
          <div style={S.reportSectionHeader}>
            <div>
              <div style={S.reportTitleGroup}>
                <button
                  className="avid-btn"
                  style={S.iconGhost}
                  onClick={() => setShowGoalsModal(true)}
                  title="Set production goals"
                  aria-label="Set production goals"
                >
                  <Settings size={16} />
                </button>
                <h3 style={S.chartTitle}>Firm Production</h3>
              </div>
              <p style={S.chartSubtitle}>Total billings by month, {year}</p>
            </div>
            <button
              className="avid-btn"
              style={S.iconGhost}
              onClick={() => window.print()}
              title="Export PDF"
              aria-label="Export PDF"
            >
              <Download size={18} />
            </button>
          </div>
          <FirmBarChart S={S} t={t} data={firmByMonth} color={STAGE_COLOR.placed} monthlyGoal={goals.monthlyGoal} />
        </div>

        <div style={{ ...S.reportSection, marginBottom: 24 }}>
          <h3 style={S.chartTitle}>Production by Recruiter</h3>
          <p style={S.chartSubtitle}>Monthly billings per person, {year}</p>
          <RecruiterLineChart S={S} t={t} series={series} />
          <div style={S.legendRow}>
            {series.map((s) => (
              <div key={s.name} style={S.legendItem}>
                <span style={{ ...S.legendSwatch, background: s.color }} />
                {s.name}
              </div>
            ))}
          </div>
        </div>

        <button className="avid-btn" style={S.ghostBtn} onClick={() => setShowTable((v) => !v)}>
          {showTable ? "Hide data table" : "Show data table"}
        </button>

        <div
          key={showTable ? "shown" : "hidden"}
          style={{ ...S.reportTableWrap, marginTop: 16, display: showTable ? "block" : "none" }}
          className="avid-row-enter"
        >
          <ReportTable S={S} months={MONTHS_SHORT} firmByMonth={firmByMonth} series={series} />
        </div>
      </div>

      <div className="print-only" style={{ display: "none" }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: printT.ink }}>Avid Associates — Production Report</div>
        <div style={{ fontSize: 13, color: printT.muted, marginTop: 4, marginBottom: 28 }}>
          {year} &middot; Billed {money(firmTotal)} &middot; {yearBillings.length} deals &middot; Top Producer: {topProducer}
        </div>
        <div style={printS.reportSection}>
          <h3 style={printS.chartTitle}>Firm Production</h3>
          <p style={printS.chartSubtitle}>Total billings by month, {year}</p>
          <FirmBarChart S={printS} t={printT} data={firmByMonth} color={STAGE_COLOR.placed} monthlyGoal={goals.monthlyGoal} />
        </div>
        <div style={printS.reportSection}>
          <h3 style={printS.chartTitle}>Production by Recruiter</h3>
          <p style={printS.chartSubtitle}>Monthly billings per person, {year}</p>
          <RecruiterLineChart S={printS} t={printT} series={printSeries} />
          <div style={printS.legendRow}>
            {printSeries.map((s) => (
              <div key={s.name} style={printS.legendItem}>
                <span style={{ ...printS.legendSwatch, background: s.color }} />
                {s.name}
              </div>
            ))}
          </div>
        </div>
        <div style={printS.reportTableWrap}>
          <ReportTable S={printS} months={MONTHS_SHORT} firmByMonth={firmByMonth} series={printSeries} />
        </div>
      </div>

      {showGoalsModal && (
        <GoalsModal
          S={S}
          t={t}
          year={year}
          initialYearly={goals.yearlyGoal}
          initialMonthly={goals.monthlyGoal}
          onClose={() => setShowGoalsModal(false)}
          onSaved={setGoals}
        />
      )}
    </div>
  );
}

function GoalsModal({
  S,
  t,
  year,
  initialYearly,
  initialMonthly,
  onClose,
  onSaved,
}: {
  S: Styles;
  t: Theme;
  year: number;
  initialYearly: number | null;
  initialMonthly: number | null;
  onClose: () => void;
  onSaved: (goals: { yearlyGoal: number | null; monthlyGoal: number | null }) => void;
}) {
  const [yearly, setYearly] = useState(initialYearly !== null ? String(initialYearly) : "");
  const [monthly, setMonthly] = useState(initialMonthly !== null ? String(initialMonthly) : "");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    const yearlyGoal = yearly.trim() ? Number(yearly) : null;
    const monthlyGoal = monthly.trim() ? Number(monthly) : null;
    const res = await fetch("/api/goals", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year, yearlyGoal, monthlyGoal }),
    });
    setBusy(false);
    if (res.ok) {
      onSaved({ yearlyGoal, monthlyGoal });
      onClose();
    }
  };

  return (
    <div className="avid-overlay no-print" style={S.modalOverlay} onClick={onClose}>
      <div className="avid-modal" style={{ ...S.modal, maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <div style={S.modalHeader}>
          <div style={S.modalTitle}>Production Goals — {year}</div>
          <button className="avid-btn" style={S.iconGhost} onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 18 }}>
          <div>
            <div style={S.fieldLabel}>Yearly Goal</div>
            <input
              style={{ ...S.input, width: "100%", marginTop: 6, boxSizing: "border-box" }}
              type="number"
              inputMode="decimal"
              placeholder="e.g. 1300000"
              value={yearly}
              onChange={(e) => setYearly(e.target.value)}
            />
          </div>
          <div>
            <div style={S.fieldLabel}>Monthly Goal</div>
            <input
              style={{ ...S.input, width: "100%", marginTop: 6, boxSizing: "border-box" }}
              type="number"
              inputMode="decimal"
              placeholder="e.g. 108000"
              value={monthly}
              onChange={(e) => setMonthly(e.target.value)}
            />
            <div style={{ fontSize: 11.5, color: t.mutedSoft, marginTop: 8 }}>
              Shown as a reference line on the Firm Production chart — months at or above it are highlighted, months
              below it are flagged.
            </div>
          </div>
        </div>
        <div style={S.modalFooter}>
          <button className="avid-btn" style={S.ghostBtn} onClick={onClose}>
            Cancel
          </button>
          <button className="avid-btn" style={{ ...S.primaryBtn, opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={save}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function FirmBarChart({
  S,
  t,
  data,
  color,
  monthlyGoal,
}: {
  S: Styles;
  t: Theme;
  data: number[];
  color: string;
  monthlyGoal?: number | null;
}) {
  const [hover, setHover] = useState<number | null>(null);

  const hasGoal = !!monthlyGoal && monthlyGoal > 0;
  const { max: yMax, step } = niceAxisMax(Math.max(...data, hasGoal ? monthlyGoal! : 0, 0));
  const ticks = [0, step, step * 2, step * 3, step * 4];
  const bandW = PLOT_W / 12;
  const barW = Math.min(24, bandW * 0.55);
  const peakIndex = data.indexOf(Math.max(...data));
  const goalY = hasGoal ? valueY(monthlyGoal!, yMax) : null;

  // The svg scales to 100% width at a fixed aspect ratio, so the tooltip's
  // containing box always matches its rendered size 1:1 — percentages of the
  // viewBox map directly onto it without ever reading rendered pixel size.
  const leftPct = (i: number) => (monthX(i) / W) * 100;
  const topPct = (MARGIN.top / H) * 100;

  return (
    <div style={{ position: "relative" }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", height: "auto", display: "block" }}
        role="img"
        aria-label="Firm production by month"
      >
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
          const x = monthX(i) - barW / 2;
          const y = valueY(v, yMax);
          const h = MARGIN.top + PLOT_H - y;
          const isHover = hover === i;
          const underGoal = hasGoal && v < monthlyGoal!;
          const barColor = underGoal ? t.danger : color;
          const goalNote = hasGoal ? (underGoal ? " — below goal" : " — at or above goal") : "";
          return (
            <g key={i}>
              <rect
                x={monthX(i) - bandW / 2}
                y={MARGIN.top}
                width={bandW}
                height={PLOT_H}
                fill="transparent"
                tabIndex={0}
                aria-label={`${MONTHS_SHORT[i]}: ${money(v)}${goalNote}`}
                onPointerEnter={() => setHover(i)}
                onPointerLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                style={{ cursor: "pointer" }}
              />
              <path
                d={topRoundedRectPath(x, y, barW, Math.max(h, 0), 4)}
                fill={barColor}
                opacity={isHover ? 1 : 0.85}
                style={{ transition: "opacity 0.15s ease, fill 0.2s ease", pointerEvents: "none" }}
              />
              {v > 0 && (
                <text
                  x={monthX(i)}
                  y={y - 8}
                  textAnchor="middle"
                  fontSize={11}
                  fontWeight={i === peakIndex ? 700 : 600}
                  fill={i === peakIndex ? t.ink : t.muted}
                  style={{ pointerEvents: "none" }}
                >
                  {moneyCompact(v)}
                </text>
              )}
              <text x={monthX(i)} y={H - 8} textAnchor="middle" fontSize={11} fill={t.mutedSoft} style={{ pointerEvents: "none" }}>
                {MONTHS_SHORT[i]}
              </text>
            </g>
          );
        })}
        {hasGoal && goalY !== null && (
          <g>
            <line
              x1={MARGIN.left}
              x2={W - MARGIN.right}
              y1={goalY}
              y2={goalY}
              stroke={t.accent}
              strokeWidth={1.5}
              strokeDasharray="6 4"
              style={{ pointerEvents: "none" }}
            />
            <text
              x={W - MARGIN.right}
              y={goalY - 7}
              textAnchor="end"
              fontSize={10.5}
              fontWeight={700}
              fill={t.accent}
              style={{ pointerEvents: "none" }}
            >
              Goal {moneyCompact(monthlyGoal!)}
            </text>
          </g>
        )}
      </svg>
      {hover !== null && (
        <div
          style={{
            ...S.chartTooltip,
            left: `${leftPct(hover)}%`,
            top: `${topPct}%`,
            transform: "translate(-50%, -100%)",
          }}
        >
          <div style={S.tooltipMonth}>{MONTHS_SHORT[hover]}</div>
          <div style={S.tooltipRow}>
            <span style={S.tooltipValue}>{money(data[hover])}</span>
          </div>
          {hasGoal && (
            <div style={{ fontSize: 11, color: data[hover] >= monthlyGoal! ? color : t.danger, marginTop: 4, fontWeight: 600 }}>
              {data[hover] >= monthlyGoal! ? "At or above goal" : "Below goal"}
            </div>
          )}
        </div>
      )}
      {hasGoal && (
        <div style={S.legendRow}>
          <div style={S.legendItem}>
            <span style={{ ...S.legendDot, background: color }} />
            At or above goal
          </div>
          <div style={S.legendItem}>
            <span style={{ ...S.legendDot, background: t.danger }} />
            Below goal
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
}: {
  S: Styles;
  t: Theme;
  series: { name: string; color: string; values: number[] }[];
}) {
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const allValues = series.flatMap((s) => s.values);
  const { max: yMax, step } = niceAxisMax(Math.max(...allValues, 0));
  const ticks = [0, step, step * 2, step * 3, step * 4];

  const onMove = (evt: React.PointerEvent<SVGRectElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const relX = ((evt.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((relX - MARGIN.left) / PLOT_W) * 11);
    setHover(Math.min(11, Math.max(0, i)));
  };

  // Pure data-space percentages — see FirmBarChart for why no ref read is needed.
  const leftPct = hover === null ? 0 : (monthX(hover) / W) * 100;
  const topPct = (MARGIN.top / H) * 100;

  const rows =
    hover === null
      ? []
      : [...series].sort((a, b) => b.values[hover] - a.values[hover]);

  return (
    <div style={{ position: "relative" }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", height: "auto", display: "block" }}
        role="img"
        aria-label="Production by recruiter, by month"
      >
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
          <line
            x1={monthX(hover)}
            x2={monthX(hover)}
            y1={MARGIN.top}
            y2={MARGIN.top + PLOT_H}
            stroke={t.mutedSoft}
            strokeWidth={1}
            strokeDasharray="3 3"
            style={{ pointerEvents: "none" }}
          />
        )}
        {series.map((s) => {
          const d = s.values.map((v, i) => `${i === 0 ? "M" : "L"}${monthX(i)},${valueY(v, yMax)}`).join(" ");
          return (
            <g key={s.name}>
              <path d={d} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              {s.values.map((v, i) => (
                <circle
                  key={i}
                  cx={monthX(i)}
                  cy={valueY(v, yMax)}
                  r={hover === i ? 5 : 3}
                  fill={s.color}
                  stroke={t.surface}
                  strokeWidth={2}
                  style={{ transition: "r 0.12s ease", pointerEvents: "none" }}
                />
              ))}
            </g>
          );
        })}
        <rect
          x={MARGIN.left}
          y={MARGIN.top}
          width={PLOT_W}
          height={PLOT_H}
          fill="transparent"
          tabIndex={0}
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
          onFocus={() => setHover(0)}
          onBlur={() => setHover(null)}
          style={{ cursor: "crosshair" }}
        />
      </svg>
      {hover !== null && rows.length > 0 && (
        <div
          style={{
            ...S.chartTooltip,
            left: `${leftPct}%`,
            top: `${topPct}%`,
            transform: `translate(${hover > 6 ? "-100%" : "0%"}, -100%)`,
          }}
        >
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
  const totalRow = [
    firmByMonth.reduce((s, v) => s + v, 0),
    ...series.map((s) => s.values.reduce((sum, v) => sum + v, 0)),
  ];
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
