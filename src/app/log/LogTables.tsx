"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Recruiter = { id: number; name: string };

type Sendout = {
  id: number;
  date: string;
  candidate: string;
  company: string;
  role: string | null;
  type: string | null;
  recruiter_id: number;
};

type Billing = {
  id: number;
  date: string;
  recruiter_id: number;
  amount: number;
  category: string;
  personal: number;
  candidate: string | null;
  company: string | null;
};

const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

export default function LogTables({
  recruiters,
  sendouts,
  billings,
}: {
  recruiters: Recruiter[];
  sendouts: Sendout[];
  billings: Billing[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"sendouts" | "billings">("sendouts");
  const nameOf = (id: number) =>
    recruiters.find((r) => r.id === id)?.name ?? "—";

  async function remove(kind: "sendouts" | "billings", id: number) {
    if (!confirm("Delete this entry?")) return;
    await fetch(`/api/${kind}/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Log</h1>
      <div className="flex gap-2 mb-4">
        {(["sendouts", "billings"] as const).map((t) => (
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

      {tab === "sendouts" && (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-400 border-b border-slate-800">
              <th className="py-2 pr-3">Date</th>
              <th className="py-2 pr-3">Candidate</th>
              <th className="py-2 pr-3">Company</th>
              <th className="py-2 pr-3">Role</th>
              <th className="py-2 pr-3">Type</th>
              <th className="py-2 pr-3">Recruiter</th>
              <th className="py-2 pr-3"></th>
            </tr>
          </thead>
          <tbody>
            {sendouts.map((s) => (
              <tr key={s.id} className="border-b border-slate-900">
                <td className="py-2 pr-3 whitespace-nowrap">{s.date}</td>
                <td className="py-2 pr-3">{s.candidate}</td>
                <td className="py-2 pr-3">{s.company}</td>
                <td className="py-2 pr-3">{s.role}</td>
                <td className="py-2 pr-3">{s.type}</td>
                <td className="py-2 pr-3">{nameOf(s.recruiter_id)}</td>
                <td className="py-2 pr-3 text-right">
                  <button
                    onClick={() => remove("sendouts", s.id)}
                    className="text-red-400 hover:text-red-300"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {sendouts.length === 0 && (
              <tr>
                <td className="py-4 text-slate-500" colSpan={7}>
                  No sendouts logged yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {tab === "billings" && (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-400 border-b border-slate-800">
              <th className="py-2 pr-3">Date</th>
              <th className="py-2 pr-3">Recruiter</th>
              <th className="py-2 pr-3">Amount</th>
              <th className="py-2 pr-3">Category</th>
              <th className="py-2 pr-3">Personal</th>
              <th className="py-2 pr-3">Company</th>
              <th className="py-2 pr-3"></th>
            </tr>
          </thead>
          <tbody>
            {billings.map((b) => (
              <tr key={b.id} className="border-b border-slate-900">
                <td className="py-2 pr-3 whitespace-nowrap">{b.date}</td>
                <td className="py-2 pr-3">{nameOf(b.recruiter_id)}</td>
                <td className="py-2 pr-3">{money(b.amount)}</td>
                <td className="py-2 pr-3">{b.category}</td>
                <td className="py-2 pr-3">{b.personal ? "Yes" : "No"}</td>
                <td className="py-2 pr-3">{b.company}</td>
                <td className="py-2 pr-3 text-right">
                  <button
                    onClick={() => remove("billings", b.id)}
                    className="text-red-400 hover:text-red-300"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {billings.length === 0 && (
              <tr>
                <td className="py-4 text-slate-500" colSpan={7}>
                  No billings logged yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
