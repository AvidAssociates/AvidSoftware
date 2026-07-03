"use client";

import { Billing } from "@/lib/types";
import { Theme, money } from "@/lib/ui";

export default function BillingsSummary({
  billings,
  monthKey,
  year,
  goals,
  t,
}: {
  billings: Billing[];
  monthKey: string;
  year: number;
  goals: { yearlyGoal: number | null; monthlyGoal: number | null };
  t: Theme;
}) {
  const month = Number(monthKey.slice(5, 7));
  // Company-wide totals are a plain sum — a team deal is counted once here,
  // even though it also counts toward every listed person's own total.
  const ytdFees = billings.filter((b) => b.date?.startsWith(String(year)) && Number(b.date.slice(5, 7)) <= month);
  const companyYtd = ytdFees.reduce((s, b) => s + b.amount, 0);

  const monthlyAvgNeeded = goals.yearlyGoal ? goals.yearlyGoal / 12 : null;
  const pctToGoal = goals.yearlyGoal ? companyYtd / goals.yearlyGoal : null;

  return (
    <div style={{ display: "flex", gap: 36, flexWrap: "wrap" as const }}>
      <Stat t={t} label="Monthly Avg Needed" value={monthlyAvgNeeded !== null ? money(monthlyAvgNeeded) : "—"} />
      <Stat t={t} label="Company YTD" value={money(companyYtd)} color="#4FBF82" />
      <Stat
        t={t}
        label="% to Goal"
        value={pctToGoal !== null ? `${Math.round(pctToGoal * 100)}%` : "—"}
        color={pctToGoal !== null ? (pctToGoal >= 1 ? "#4FBF82" : t.accent) : undefined}
      />
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
