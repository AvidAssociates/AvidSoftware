"use client";

import { useState } from "react";

type Recruiter = { id: number; name: string };

const today = () => new Date().toISOString().slice(0, 10);

export default function EntryForm({ recruiters }: { recruiters: Recruiter[] }) {
  const [tab, setTab] = useState<"sendout" | "billing" | "retainer">(
    "sendout"
  );
  const [status, setStatus] = useState<string | null>(null);

  const inputCls =
    "w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500";
  const labelCls = "text-sm text-slate-400 mb-1 block";

  async function submitForm(
    e: React.FormEvent<HTMLFormElement>,
    url: string,
    transform?: (data: Record<string, string>) => Record<string, unknown>
  ) {
    e.preventDefault();
    setStatus(null);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const raw = Object.fromEntries(formData.entries()) as Record<
      string,
      string
    >;
    const payload = transform ? transform(raw) : raw;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setStatus("Saved!");
      form.reset();
    } else {
      const err = await res.json().catch(() => ({}));
      setStatus(err.error || "Something went wrong");
    }
  }

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Add Entry</h1>
      <div className="flex gap-2 mb-6">
        {(["sendout", "billing", "retainer"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize ${
              tab === t
                ? "bg-emerald-500 text-slate-950"
                : "bg-slate-800 text-slate-300"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {status && (
        <div className="mb-4 text-sm rounded-lg bg-slate-800 px-3 py-2 text-emerald-300">
          {status}
        </div>
      )}

      {tab === "sendout" && (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) =>
            submitForm(e, "/api/sendouts", (d) => ({
              ...d,
              recruiter_id: d.recruiter_id,
              am_recruiter_id: d.am_recruiter_id || undefined,
            }))
          }
        >
          <div>
            <label className={labelCls}>Date</label>
            <input
              type="date"
              name="date"
              defaultValue={today()}
              required
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Candidate</label>
            <input name="candidate" required className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Company</label>
            <input name="company" required className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Role</label>
            <input name="role" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Type</label>
            <select name="type" className={inputCls} defaultValue="FT">
              <option value="FT">Full-Time (F)</option>
              <option value="T">Temp (T)</option>
              <option value="IT">Independent/Temp (IT)</option>
              <option value="C">Contract (C)</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Recruiter</label>
            <select name="recruiter_id" required className={inputCls}>
              {recruiters.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Account Manager (optional)</label>
            <select name="am_recruiter_id" className={inputCls} defaultValue="">
              <option value="">—</option>
              {recruiters.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Notes</label>
            <textarea name="notes" className={inputCls} rows={2} />
          </div>
          <button className="mt-2 rounded-lg bg-emerald-500 text-slate-950 font-bold py-2">
            Log Sendout
          </button>
        </form>
      )}

      {tab === "billing" && (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) =>
            submitForm(e, "/api/billings", (d) => ({
              ...d,
              amount: d.amount,
              personal: d.personal === "on",
            }))
          }
        >
          <div>
            <label className={labelCls}>Date</label>
            <input
              type="date"
              name="date"
              defaultValue={today()}
              required
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Recruiter</label>
            <select name="recruiter_id" required className={inputCls}>
              {recruiters.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Amount ($)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              name="amount"
              required
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Category</label>
            <select name="category" className={inputCls} defaultValue="placement">
              <option value="placement">Placement Fee</option>
              <option value="temp">Temp/Contract Margin</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="personal"
              name="personal"
              defaultChecked
              className="h-4 w-4"
            />
            <label htmlFor="personal" className="text-sm text-slate-300">
              Personal billing (uncheck if team-split credit)
            </label>
          </div>
          <div>
            <label className={labelCls}>Candidate (optional)</label>
            <input name="candidate" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Company (optional)</label>
            <input name="company" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Notes</label>
            <textarea name="notes" className={inputCls} rows={2} />
          </div>
          <button className="mt-2 rounded-lg bg-emerald-500 text-slate-950 font-bold py-2">
            Log Billing
          </button>
        </form>
      )}

      {tab === "retainer" && (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) =>
            submitForm(e, "/api/retainers", (d) => ({
              ...d,
              amount: d.amount,
            }))
          }
        >
          <div>
            <label className={labelCls}>Date</label>
            <input
              type="date"
              name="date"
              defaultValue={today()}
              required
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Recruiter</label>
            <select name="recruiter_id" required className={inputCls}>
              {recruiters.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Amount ($)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              name="amount"
              required
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Company (optional)</label>
            <input name="company" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Notes</label>
            <textarea name="notes" className={inputCls} rows={2} />
          </div>
          <button className="mt-2 rounded-lg bg-emerald-500 text-slate-950 font-bold py-2">
            Log Retainer
          </button>
        </form>
      )}
    </div>
  );
}
