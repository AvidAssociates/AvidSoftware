"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type LeaderboardRow = {
  recruiter: { id: number; name: string };
  sendoutsMonth: number;
  sendoutsYtd: number;
  billingsMonth: number;
  billingsYtdPersonal: number;
  billingsYtdTotal: number;
  retainersYtd: number;
  totalCashYtd: number;
};

type LeaderboardResponse = {
  rows: LeaderboardRow[];
  annualGoal: number;
  teamCashYtd: number;
  teamBillingsMonth: number;
};

const money = (n: number) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

const medals = ["🥇", "🥈", "🥉"];

export default function TvBoard() {
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const load = () => {
      fetch("/api/leaderboard")
        .then((r) => r.json())
        .then(setData)
        .catch(() => {});
    };
    load();
    const dataTimer = setInterval(load, 30000);
    const clockTimer = setInterval(() => setNow(new Date()), 1000);
    return () => {
      clearInterval(dataTimer);
      clearInterval(clockTimer);
    };
  }, []);

  if (!data) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-950 text-slate-400 text-2xl">
        Loading leaderboard…
      </div>
    );
  }

  const pct = Math.min(
    100,
    Math.round((data.teamCashYtd / data.annualGoal) * 100)
  );

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 px-10 py-8 flex flex-col gap-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-5xl font-black tracking-tight">
            AVID ASSOCIATES
          </h1>
          <p className="text-xl text-slate-400 mt-1">
            {now.toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}{" "}
            &middot; {now.toLocaleTimeString("en-US")}
          </p>
        </div>
        <Link
          href="/entry"
          className="text-slate-500 hover:text-slate-300 text-sm border border-slate-700 rounded px-3 py-1"
        >
          + Add Entry
        </Link>
      </header>

      <section className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
        <div className="flex justify-between items-baseline mb-2">
          <span className="text-lg text-slate-300 font-semibold">
            Team Cash-In YTD
          </span>
          <span className="text-2xl font-bold text-emerald-400">
            {money(data.teamCashYtd)}{" "}
            <span className="text-slate-500 text-lg font-normal">
              / {money(data.annualGoal)} goal
            </span>
          </span>
        </div>
        <div className="h-6 w-full bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-300 transition-all duration-1000"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="text-right text-slate-400 mt-1">{pct}% of goal</div>
      </section>

      <section className="grid grid-cols-12 gap-3 text-sm uppercase tracking-wide text-slate-400 px-4">
        <div className="col-span-3">Recruiter</div>
        <div className="col-span-2 text-right">Sendouts (Mo / YTD)</div>
        <div className="col-span-2 text-right">Billings This Month</div>
        <div className="col-span-2 text-right">Billings YTD</div>
        <div className="col-span-1 text-right">Retainers</div>
        <div className="col-span-2 text-right">Total Cash YTD</div>
      </section>

      <section className="flex flex-col gap-3">
        {data.rows.map((row, i) => (
          <div
            key={row.recruiter.id}
            className={`grid grid-cols-12 gap-3 items-center rounded-xl px-4 py-4 border ${
              i === 0
                ? "bg-amber-400/10 border-amber-400/40"
                : "bg-slate-900 border-slate-800"
            }`}
          >
            <div className="col-span-3 flex items-center gap-3">
              <span className="text-2xl w-8">{medals[i] ?? i + 1}</span>
              <span className="text-2xl font-bold">{row.recruiter.name}</span>
            </div>
            <div className="col-span-2 text-right text-xl">
              {row.sendoutsMonth}{" "}
              <span className="text-slate-500 text-base">
                / {row.sendoutsYtd}
              </span>
            </div>
            <div className="col-span-2 text-right text-xl font-semibold text-sky-300">
              {money(row.billingsMonth)}
            </div>
            <div className="col-span-2 text-right text-xl">
              {money(row.billingsYtdTotal)}
            </div>
            <div className="col-span-1 text-right text-xl">
              {money(row.retainersYtd)}
            </div>
            <div className="col-span-2 text-right text-2xl font-black text-emerald-400">
              {money(row.totalCashYtd)}
            </div>
          </div>
        ))}
      </section>

      <footer className="mt-auto text-center text-slate-600 text-sm pt-4">
        Updates automatically every 30 seconds
      </footer>
    </div>
  );
}
