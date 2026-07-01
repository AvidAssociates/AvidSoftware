import { getDb } from "./db";
import { Recruiter, Sendout, Billing, Retainer, LeaderboardRow } from "./types";

export function listRecruiters(activeOnly = true): Recruiter[] {
  const db = getDb();
  const sql = activeOnly
    ? "SELECT * FROM recruiters WHERE active = 1 ORDER BY sort_order, name"
    : "SELECT * FROM recruiters ORDER BY sort_order, name";
  return db.prepare(sql).all() as Recruiter[];
}

export function createRecruiter(name: string): Recruiter {
  const db = getDb();
  const maxOrder = db
    .prepare("SELECT COALESCE(MAX(sort_order), -1) as m FROM recruiters")
    .get() as { m: number };
  const info = db
    .prepare("INSERT INTO recruiters (name, sort_order) VALUES (?, ?)")
    .run(name, maxOrder.m + 1);
  return db
    .prepare("SELECT * FROM recruiters WHERE id = ?")
    .get(info.lastInsertRowid) as Recruiter;
}

export function setRecruiterActive(id: number, active: boolean) {
  const db = getDb();
  db.prepare("UPDATE recruiters SET active = ? WHERE id = ?").run(
    active ? 1 : 0,
    id
  );
}

export function listSendouts(limit = 500): Sendout[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM sendouts ORDER BY date DESC, id DESC LIMIT ?")
    .all(limit) as Sendout[];
}

export function createSendout(input: {
  date: string;
  candidate: string;
  company: string;
  role?: string;
  type?: string;
  recruiter_id: number;
  am_recruiter_id?: number | null;
  notes?: string;
}): Sendout {
  const db = getDb();
  const info = db
    .prepare(
      `INSERT INTO sendouts (date, candidate, company, role, type, recruiter_id, am_recruiter_id, notes)
       VALUES (@date, @candidate, @company, @role, @type, @recruiter_id, @am_recruiter_id, @notes)`
    )
    .run({
      date: input.date,
      candidate: input.candidate,
      company: input.company,
      role: input.role ?? null,
      type: input.type ?? null,
      recruiter_id: input.recruiter_id,
      am_recruiter_id: input.am_recruiter_id ?? null,
      notes: input.notes ?? null,
    });
  return db
    .prepare("SELECT * FROM sendouts WHERE id = ?")
    .get(info.lastInsertRowid) as Sendout;
}

export function deleteSendout(id: number) {
  getDb().prepare("DELETE FROM sendouts WHERE id = ?").run(id);
}

export function listBillings(limit = 500): Billing[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM billings ORDER BY date DESC, id DESC LIMIT ?")
    .all(limit) as Billing[];
}

export function createBilling(input: {
  date: string;
  recruiter_id: number;
  amount: number;
  category?: string;
  personal?: boolean;
  candidate?: string;
  company?: string;
  notes?: string;
}): Billing {
  const db = getDb();
  const info = db
    .prepare(
      `INSERT INTO billings (date, recruiter_id, amount, category, personal, candidate, company, notes)
       VALUES (@date, @recruiter_id, @amount, @category, @personal, @candidate, @company, @notes)`
    )
    .run({
      date: input.date,
      recruiter_id: input.recruiter_id,
      amount: input.amount,
      category: input.category ?? "placement",
      personal: input.personal === false ? 0 : 1,
      candidate: input.candidate ?? null,
      company: input.company ?? null,
      notes: input.notes ?? null,
    });
  return db
    .prepare("SELECT * FROM billings WHERE id = ?")
    .get(info.lastInsertRowid) as Billing;
}

export function deleteBilling(id: number) {
  getDb().prepare("DELETE FROM billings WHERE id = ?").run(id);
}

export function listRetainers(limit = 500): Retainer[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM retainers ORDER BY date DESC, id DESC LIMIT ?")
    .all(limit) as Retainer[];
}

export function createRetainer(input: {
  date: string;
  recruiter_id: number;
  amount: number;
  company?: string;
  notes?: string;
}): Retainer {
  const db = getDb();
  const info = db
    .prepare(
      `INSERT INTO retainers (date, recruiter_id, amount, company, notes)
       VALUES (@date, @recruiter_id, @amount, @company, @notes)`
    )
    .run({
      date: input.date,
      recruiter_id: input.recruiter_id,
      amount: input.amount,
      company: input.company ?? null,
      notes: input.notes ?? null,
    });
  return db
    .prepare("SELECT * FROM retainers WHERE id = ?")
    .get(info.lastInsertRowid) as Retainer;
}

export function getAnnualGoal(): number {
  const db = getDb();
  const row = db
    .prepare("SELECT value FROM settings WHERE key = 'annual_goal'")
    .get() as { value: string } | undefined;
  return row ? Number(row.value) : 1300000;
}

export function setAnnualGoal(value: number) {
  const db = getDb();
  db.prepare(
    "INSERT INTO settings (key, value) VALUES ('annual_goal', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  ).run(String(value));
}

function monthBounds(ref = new Date()) {
  const y = ref.getFullYear();
  const m = ref.getMonth();
  const start = new Date(y, m, 1).toISOString().slice(0, 10);
  const end = new Date(y, m + 1, 1).toISOString().slice(0, 10);
  return { start, end };
}

function yearBounds(ref = new Date()) {
  const y = ref.getFullYear();
  const start = `${y}-01-01`;
  const end = `${y + 1}-01-01`;
  return { start, end };
}

export function getLeaderboard(): {
  rows: LeaderboardRow[];
  annualGoal: number;
  teamCashYtd: number;
  teamBillingsMonth: number;
} {
  const db = getDb();
  const recruiters = listRecruiters(true);
  const { start: mStart, end: mEnd } = monthBounds();
  const { start: yStart, end: yEnd } = yearBounds();

  const sendoutCount = db.prepare(
    `SELECT COUNT(*) as c FROM sendouts WHERE recruiter_id = ? AND date >= ? AND date < ?`
  );
  const billingSum = db.prepare(
    `SELECT COALESCE(SUM(amount),0) as s FROM billings WHERE recruiter_id = ? AND date >= ? AND date < ?`
  );
  const billingSumPersonal = db.prepare(
    `SELECT COALESCE(SUM(amount),0) as s FROM billings WHERE recruiter_id = ? AND personal = 1 AND date >= ? AND date < ?`
  );
  const retainerSum = db.prepare(
    `SELECT COALESCE(SUM(amount),0) as s FROM retainers WHERE recruiter_id = ? AND date >= ? AND date < ?`
  );

  const rows: LeaderboardRow[] = recruiters.map((recruiter) => {
    const sendoutsMonth = (
      sendoutCount.get(recruiter.id, mStart, mEnd) as { c: number }
    ).c;
    const sendoutsYtd = (
      sendoutCount.get(recruiter.id, yStart, yEnd) as { c: number }
    ).c;
    const billingsMonth = (
      billingSum.get(recruiter.id, mStart, mEnd) as { s: number }
    ).s;
    const billingsYtdTotal = (
      billingSum.get(recruiter.id, yStart, yEnd) as { s: number }
    ).s;
    const billingsYtdPersonal = (
      billingSumPersonal.get(recruiter.id, yStart, yEnd) as { s: number }
    ).s;
    const retainersYtd = (
      retainerSum.get(recruiter.id, yStart, yEnd) as { s: number }
    ).s;

    return {
      recruiter,
      sendoutsMonth,
      sendoutsYtd,
      billingsMonth,
      billingsYtdPersonal,
      billingsYtdTotal,
      retainersYtd,
      totalCashYtd: billingsYtdTotal + retainersYtd,
    };
  });

  rows.sort((a, b) => b.totalCashYtd - a.totalCashYtd);

  const teamCashYtd = rows.reduce((sum, r) => sum + r.totalCashYtd, 0);
  const teamBillingsMonth = rows.reduce((sum, r) => sum + r.billingsMonth, 0);

  return { rows, annualGoal: getAnnualGoal(), teamCashYtd, teamBillingsMonth };
}
