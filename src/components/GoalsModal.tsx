"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Theme, makeStyles } from "@/lib/ui";

type Styles = ReturnType<typeof makeStyles>;

export default function GoalsModal({
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
              Carries over to the Report tab&apos;s Firm Production chart — months at or above it are highlighted,
              months below it are flagged.
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
