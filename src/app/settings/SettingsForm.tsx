"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Recruiter = { id: number; name: string; active: number };

export default function SettingsForm({
  recruiters,
  annualGoal,
}: {
  recruiters: Recruiter[];
  annualGoal: number;
}) {
  const router = useRouter();
  const [newName, setNewName] = useState("");
  const [goal, setGoal] = useState(String(annualGoal));
  const [status, setStatus] = useState<string | null>(null);

  const inputCls =
    "w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500";

  async function addRecruiter(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    await fetch("/api/recruiters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    setNewName("");
    router.refresh();
  }

  async function toggleActive(r: Recruiter) {
    await fetch(`/api/recruiters/${r.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !r.active }),
    });
    router.refresh();
  }

  async function saveGoal(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ annualGoal: Number(goal) }),
    });
    setStatus(res.ok ? "Saved!" : "Failed to save");
    router.refresh();
  }

  return (
    <div className="max-w-xl mx-auto p-6 flex flex-col gap-10">
      <h1 className="text-2xl font-bold">Settings</h1>

      <section>
        <h2 className="text-lg font-semibold mb-3">Annual Team Goal</h2>
        <form onSubmit={saveGoal} className="flex gap-3">
          <input
            type="number"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            className={inputCls}
          />
          <button className="rounded-lg bg-emerald-500 text-slate-950 font-bold px-4">
            Save
          </button>
        </form>
        {status && <p className="text-sm text-emerald-300 mt-2">{status}</p>}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Recruiters</h2>
        <ul className="flex flex-col gap-2 mb-4">
          {recruiters.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between bg-slate-800 rounded-lg px-3 py-2"
            >
              <span className={r.active ? "" : "text-slate-500 line-through"}>
                {r.name}
              </span>
              <button
                onClick={() => toggleActive(r)}
                className="text-sm text-slate-400 hover:text-white"
              >
                {r.active ? "Deactivate" : "Activate"}
              </button>
            </li>
          ))}
        </ul>
        <form onSubmit={addRecruiter} className="flex gap-3">
          <input
            placeholder="New recruiter name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className={inputCls}
          />
          <button className="rounded-lg bg-emerald-500 text-slate-950 font-bold px-4">
            Add
          </button>
        </form>
      </section>
    </div>
  );
}
