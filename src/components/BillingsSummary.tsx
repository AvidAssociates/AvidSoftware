"use client";

import { useEffect, useState } from "react";
import { Billing } from "@/lib/types";
import { Theme, makeStyles, money } from "@/lib/ui";

type Styles = ReturnType<typeof makeStyles>;

// ---- the routing rule: credit everyone listed, never split ----
function personalSum(person: string, list: Billing[]) {
  return list.filter((b) => b.team.length === 1 && b.team[0] === person).reduce((s, b) => s + b.amount, 0);
}
function personalCount(person: string, list: Billing[]) {
  return list.filter((b) => b.team.length === 1 && b.team[0] === person).length;
}
function totalSum(person: string, list: Billing[]) {
  return list.filter((b) => b.team.includes(person)).reduce((s, b) => s + b.amount, 0);
}
function totalCount(person: string, list: Billing[]) {
  return list.filter((b) => b.team.includes(person)).length;
}

export default function BillingsSummary({
  billings,
  teamNames,
  monthKey,
  year,
  t,
}: {
  billings: Billing[];
  teamNames: string[];
  monthKey: string;
  year: number;
  t: Theme;
}) {
  const S = makeStyles(t);
  const [goals, setGoals] = useState<{ yearlyGoal: number | null; monthlyGoal: number | null }>({
    yearlyGoal: null,
    monthlyGoal: null,
  });

  useEffect(() => {
    fetch(`/api/goals?year=${year}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setGoals({ yearlyGoal: data.yearlyGoal ?? null, monthlyGoal: data.monthlyGoal ?? null });
      })
      .catch(() => {});
  }, [year]);

  const month = Number(monthKey.slice(5, 7));
  const monthFees = billings.filter((b) => b.date?.startsWith(monthKey));
  const ytdFees = billings.filter((b) => b.date?.startsWith(String(year)) && Number(b.date.slice(5, 7)) <= month);

  const companyYtd = ytdFees.reduce((s, b) => s + b.amount, 0);

  const monthlyAvgNeeded = goals.yearlyGoal ? goals.yearlyGoal / 12 : null;
  const pctToGoal = goals.yearlyGoal ? companyYtd / goals.yearlyGoal : null;

  const cols = "repeat(5, 1fr)";
  const centered = { textAlign: "center" as const };

  return (
    <div style={S.reportSection}>
      <h3 style={S.chartTitle}>Billings Summary</h3>
      <p style={S.chartSubtitle}>Solo deals count toward Personal; team deals credit everyone listed, toward Total only.</p>

      <div style={{ display: "flex", gap: 36, marginBottom: 20, flexWrap: "wrap" as const }}>
        <Stat t={t} label="Monthly Avg Needed" value={monthlyAvgNeeded !== null ? money(monthlyAvgNeeded) : "—"} />
        <Stat t={t} label="Company YTD" value={money(companyYtd)} />
        <Stat
          t={t}
          label="% to Goal"
          value={pctToGoal !== null ? `${Math.round(pctToGoal * 100)}%` : "—"}
          color={pctToGoal !== null ? (pctToGoal >= 1 ? "#4FBF82" : t.accent) : undefined}
        />
      </div>

      <div style={S.reportTableWrap}>
        <div style={{ ...S.reportTableHeadRow, gridTemplateColumns: cols }}>
          <div style={centered}>Recruiter</div>
          <div style={centered}>Monthly Personal</div>
          <div style={centered}>Monthly Total</div>
          <div style={centered}>YTD Personal</div>
          <div style={centered}>YTD Total</div>
        </div>
        {teamNames.map((name) => (
          <div key={name} style={{ ...S.reportTableRow, gridTemplateColumns: cols }}>
            <div style={{ ...S.reportTableCell, ...centered }}>{name}</div>
            <MoneyCell S={S} amount={personalSum(name, monthFees)} count={personalCount(name, monthFees)} />
            <MoneyCell S={S} amount={totalSum(name, monthFees)} count={totalCount(name, monthFees)} />
            <MoneyCell S={S} amount={personalSum(name, ytdFees)} count={personalCount(name, ytdFees)} />
            <MoneyCell S={S} amount={totalSum(name, ytdFees)} count={totalCount(name, ytdFees)} />
          </div>
        ))}
      </div>
    </div>
  );
}

function MoneyCell({ S, amount, count }: { S: Styles; amount: number; count: number }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ ...S.reportTableCell, color: "#4FBF82" }}>{money(amount)}</div>
      <div style={S.cardSub}>
        {count} deal{count === 1 ? "" : "s"}
      </div>
    </div>
  );
}

function Stat({ t, label, value, color }: { t: Theme; label: string; value: string; color?: string }) {
  return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5, color: color ?? t.ink, fontVariantNumeric: "tabular-nums" }}>
        {value}
      </div>
      <div style={{ fontSize: 11.5, color: t.muted, marginTop: 2, fontWeight: 600 }}>{label}</div>
    </div>
  );
}
