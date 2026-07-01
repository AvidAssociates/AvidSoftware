import { getDb } from "./db";
import { Recruiter, Sendout, Billing, Retainer, LeaderboardRow } from "./types";

export async function listRecruiters(activeOnly = true): Promise<Recruiter[]> {
  const db = getDb();
  const rows = activeOnly
    ? await db.sql`SELECT * FROM recruiters WHERE active = 1 ORDER BY sort_order, name`
    : await db.sql`SELECT * FROM recruiters ORDER BY sort_order, name`;
  return rows as Recruiter[];
}

export async function createRecruiter(name: string): Promise<Recruiter> {
  const db = getDb();
  const [maxOrder] = (await db.sql`
    SELECT COALESCE(MAX(sort_order), -1) as m FROM recruiters
  `) as { m: number }[];
  const [recruiter] = (await db.sql`
    INSERT INTO recruiters (name, sort_order)
    VALUES (${name}, ${maxOrder.m + 1})
    RETURNING *
  `) as Recruiter[];
  return recruiter;
}

export async function setRecruiterActive(id: number, active: boolean) {
  const db = getDb();
  await db.sql`UPDATE recruiters SET active = ${active ? 1 : 0} WHERE id = ${id}`;
}

export async function listSendouts(limit = 500): Promise<Sendout[]> {
  const db = getDb();
  const rows = await db.sql`
    SELECT * FROM sendouts ORDER BY date DESC, id DESC LIMIT ${limit}
  `;
  return rows as Sendout[];
}

export async function createSendout(input: {
  date: string;
  candidate: string;
  company: string;
  role?: string;
  type?: string;
  recruiter_id: number;
  am_recruiter_id?: number | null;
  notes?: string;
}): Promise<Sendout> {
  const db = getDb();
  const [sendout] = (await db.sql`
    INSERT INTO sendouts (date, candidate, company, role, type, recruiter_id, am_recruiter_id, notes)
    VALUES (
      ${input.date},
      ${input.candidate},
      ${input.company},
      ${input.role ?? null},
      ${input.type ?? null},
      ${input.recruiter_id},
      ${input.am_recruiter_id ?? null},
      ${input.notes ?? null}
    )
    RETURNING *
  `) as Sendout[];
  return sendout;
}

export async function deleteSendout(id: number) {
  await getDb().sql`DELETE FROM sendouts WHERE id = ${id}`;
}

export async function listBillings(limit = 500): Promise<Billing[]> {
  const db = getDb();
  const rows = await db.sql`
    SELECT * FROM billings ORDER BY date DESC, id DESC LIMIT ${limit}
  `;
  return rows as Billing[];
}

export async function createBilling(input: {
  date: string;
  recruiter_id: number;
  amount: number;
  category?: string;
  personal?: boolean;
  candidate?: string;
  company?: string;
  notes?: string;
}): Promise<Billing> {
  const db = getDb();
  const [billing] = (await db.sql`
    INSERT INTO billings (date, recruiter_id, amount, category, personal, candidate, company, notes)
    VALUES (
      ${input.date},
      ${input.recruiter_id},
      ${input.amount},
      ${input.category ?? "placement"},
      ${input.personal === false ? 0 : 1},
      ${input.candidate ?? null},
      ${input.company ?? null},
      ${input.notes ?? null}
    )
    RETURNING *
  `) as Billing[];
  return billing;
}

export async function deleteBilling(id: number) {
  await getDb().sql`DELETE FROM billings WHERE id = ${id}`;
}

export async function listRetainers(limit = 500): Promise<Retainer[]> {
  const db = getDb();
  const rows = await db.sql`
    SELECT * FROM retainers ORDER BY date DESC, id DESC LIMIT ${limit}
  `;
  return rows as Retainer[];
}

export async function createRetainer(input: {
  date: string;
  recruiter_id: number;
  amount: number;
  company?: string;
  notes?: string;
}): Promise<Retainer> {
  const db = getDb();
  const [retainer] = (await db.sql`
    INSERT INTO retainers (date, recruiter_id, amount, company, notes)
    VALUES (
      ${input.date},
      ${input.recruiter_id},
      ${input.amount},
      ${input.company ?? null},
      ${input.notes ?? null}
    )
    RETURNING *
  `) as Retainer[];
  return retainer;
}

export async function getAnnualGoal(): Promise<number> {
  const db = getDb();
  const [row] = (await db.sql`
    SELECT value FROM settings WHERE key = 'annual_goal'
  `) as { value: string }[];
  return row ? Number(row.value) : 1300000;
}

export async function setAnnualGoal(value: number) {
  const db = getDb();
  await db.sql`
    INSERT INTO settings (key, value) VALUES ('annual_goal', ${String(value)})
    ON CONFLICT (key) DO UPDATE SET value = excluded.value
  `;
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

export async function getLeaderboard(): Promise<{
  rows: LeaderboardRow[];
  annualGoal: number;
  teamCashYtd: number;
  teamBillingsMonth: number;
}> {
  const db = getDb();
  const recruiters = await listRecruiters(true);
  const { start: mStart, end: mEnd } = monthBounds();
  const { start: yStart, end: yEnd } = yearBounds();

  const rows: LeaderboardRow[] = await Promise.all(
    recruiters.map(async (recruiter) => {
      const [sendoutsMonthRow] = (await db.sql`
        SELECT COUNT(*) as c FROM sendouts
        WHERE recruiter_id = ${recruiter.id} AND date >= ${mStart} AND date < ${mEnd}
      `) as { c: number }[];
      const [sendoutsYtdRow] = (await db.sql`
        SELECT COUNT(*) as c FROM sendouts
        WHERE recruiter_id = ${recruiter.id} AND date >= ${yStart} AND date < ${yEnd}
      `) as { c: number }[];
      const [billingsMonthRow] = (await db.sql`
        SELECT COALESCE(SUM(amount),0) as s FROM billings
        WHERE recruiter_id = ${recruiter.id} AND date >= ${mStart} AND date < ${mEnd}
      `) as { s: number }[];
      const [billingsYtdTotalRow] = (await db.sql`
        SELECT COALESCE(SUM(amount),0) as s FROM billings
        WHERE recruiter_id = ${recruiter.id} AND date >= ${yStart} AND date < ${yEnd}
      `) as { s: number }[];
      const [billingsYtdPersonalRow] = (await db.sql`
        SELECT COALESCE(SUM(amount),0) as s FROM billings
        WHERE recruiter_id = ${recruiter.id} AND personal = 1 AND date >= ${yStart} AND date < ${yEnd}
      `) as { s: number }[];
      const [retainersYtdRow] = (await db.sql`
        SELECT COALESCE(SUM(amount),0) as s FROM retainers
        WHERE recruiter_id = ${recruiter.id} AND date >= ${yStart} AND date < ${yEnd}
      `) as { s: number }[];

      const billingsYtdTotal = Number(billingsYtdTotalRow.s);
      const retainersYtd = Number(retainersYtdRow.s);

      return {
        recruiter,
        sendoutsMonth: Number(sendoutsMonthRow.c),
        sendoutsYtd: Number(sendoutsYtdRow.c),
        billingsMonth: Number(billingsMonthRow.s),
        billingsYtdPersonal: Number(billingsYtdPersonalRow.s),
        billingsYtdTotal,
        retainersYtd,
        totalCashYtd: billingsYtdTotal + retainersYtd,
      };
    })
  );

  rows.sort((a, b) => b.totalCashYtd - a.totalCashYtd);

  const teamCashYtd = rows.reduce((sum, r) => sum + r.totalCashYtd, 0);
  const teamBillingsMonth = rows.reduce((sum, r) => sum + r.billingsMonth, 0);

  return { rows, annualGoal: await getAnnualGoal(), teamCashYtd, teamBillingsMonth };
}
