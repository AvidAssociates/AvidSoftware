"use client";

import { useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { RosterMember } from "@/lib/types";
import { Theme, makeStyles } from "@/lib/ui";

type Styles = ReturnType<typeof makeStyles>;

const send = (url: string, method: string, body?: unknown) =>
  fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

export default function SettingsModal({
  S,
  t,
  roster,
  reloadRoster,
  year,
  initialYearly,
  initialMonthly,
  onSavedGoals,
  onClose,
}: {
  S: Styles;
  t: Theme;
  roster: RosterMember[];
  reloadRoster: () => Promise<void>;
  year: number;
  initialYearly: number | null;
  initialMonthly: number | null;
  onSavedGoals: (goals: { yearlyGoal: number | null; monthlyGoal: number | null }) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"users" | "goals">("users");

  return (
    <div className="avid-overlay no-print" style={S.modalOverlay} onClick={onClose}>
      <div className="avid-modal" style={{ ...S.modal, maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
        <div style={S.modalHeader}>
          <div style={S.modalTitle}>Settings</div>
          <button className="avid-btn" style={S.iconGhost} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: "16px 22px 0" }}>
          <div style={S.segWrap}>
            <button className="avid-btn" style={tab === "users" ? S.segBtnActive : S.segBtn} onClick={() => setTab("users")}>
              Users
            </button>
            <button className="avid-btn" style={tab === "goals" ? S.segBtnActive : S.segBtn} onClick={() => setTab("goals")}>
              Goals
            </button>
          </div>
        </div>

        {tab === "users" ? (
          <UsersTab S={S} t={t} roster={roster} reloadRoster={reloadRoster} />
        ) : (
          <GoalsTab
            S={S}
            t={t}
            year={year}
            initialYearly={initialYearly}
            initialMonthly={initialMonthly}
            onSaved={onSavedGoals}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
}

function UsersTab({
  S,
  t,
  roster,
  reloadRoster,
}: {
  S: Styles;
  t: Theme;
  roster: RosterMember[];
  reloadRoster: () => Promise<void>;
}) {
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);

  const nameOf = (m: RosterMember) => drafts[m.id] ?? m.name;

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
    <div style={{ padding: 22 }}>
      {roster.map((m) => (
        <div key={m.id} style={S.rosterRow}>
          <input
            style={{ ...S.input, flex: 1 }}
            value={nameOf(m)}
            onChange={(e) => setDrafts((d) => ({ ...d, [m.id]: e.target.value }))}
          />
          <button
            className="avid-btn"
            style={{ ...S.ghostBtn, opacity: nameOf(m).trim() && nameOf(m) !== m.name ? 1 : 0.4, padding: "8px 12px" }}
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
  );
}

function GoalsTab({
  S,
  t,
  year,
  initialYearly,
  initialMonthly,
  onSaved,
  onClose,
}: {
  S: Styles;
  t: Theme;
  year: number;
  initialYearly: number | null;
  initialMonthly: number | null;
  onSaved: (goals: { yearlyGoal: number | null; monthlyGoal: number | null }) => void;
  onClose: () => void;
}) {
  const [yearly, setYearly] = useState(initialYearly !== null ? String(initialYearly) : "");
  const [monthly, setMonthly] = useState(initialMonthly !== null ? String(initialMonthly) : "");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    const yearlyGoal = yearly.trim() ? Number(yearly) : null;
    const monthlyGoal = monthly.trim() ? Number(monthly) : null;
    const res = await send("/api/goals", "PUT", { year, yearlyGoal, monthlyGoal });
    setBusy(false);
    if (res.ok) {
      onSaved({ yearlyGoal, monthlyGoal });
      onClose();
    }
  };

  return (
    <>
      <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ fontSize: 11.5, color: t.mutedSoft }}>Applies to {year} — shared by Billings and the Report tab.</div>
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
            Drives the Billings hero stats and the Report tab&apos;s goal line — months at or above it are
            highlighted, months below it are flagged.
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
    </>
  );
}
