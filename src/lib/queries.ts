import { getDb } from "./db";
import { Billing, Entry, RosterMember } from "./types";

type EntryRow = {
  id: string;
  date: string;
  candidate: string;
  company: string;
  role: string | null;
  interview_type: string;
  round: number;
  team: string[];
  stage: string;
  declined: boolean;
  notes: string | null;
  added_by: string | null;
  created_at: string;
};

function toEntry(row: EntryRow): Entry {
  return {
    id: row.id,
    date: row.date,
    candidate: row.candidate,
    company: row.company,
    role: row.role,
    interviewType: row.interview_type,
    round: row.round,
    team: row.team ?? [],
    stage: row.stage as Entry["stage"],
    declined: row.declined,
    notes: row.notes,
    addedBy: row.added_by,
    createdAt: row.created_at,
  };
}

export async function listEntries(): Promise<Entry[]> {
  const db = getDb();
  const rows = (await db.sql`
    SELECT * FROM pipeline_entries ORDER BY date DESC, created_at DESC
  `) as EntryRow[];
  return rows.map(toEntry);
}

export async function createEntry(input: {
  id: string;
  date: string;
  candidate: string;
  company: string;
  role?: string | null;
  interviewType: string;
  round: number;
  team: string[];
  stage: string;
  declined: boolean;
  notes?: string | null;
  addedBy?: string | null;
}): Promise<Entry> {
  const db = getDb();
  const [row] = (await db.sql`
    INSERT INTO pipeline_entries (id, date, candidate, company, role, interview_type, round, team, stage, declined, notes, added_by)
    VALUES (
      ${input.id},
      ${input.date},
      ${input.candidate},
      ${input.company},
      ${input.role ?? null},
      ${input.interviewType},
      ${input.round},
      ${input.team},
      ${input.stage},
      ${input.declined},
      ${input.notes ?? null},
      ${input.addedBy ?? null}
    )
    RETURNING *
  `) as EntryRow[];
  return toEntry(row);
}

export async function updateEntry(
  id: string,
  input: {
    date: string;
    candidate: string;
    company: string;
    role?: string | null;
    interviewType: string;
    round: number;
    team: string[];
    stage: string;
    declined: boolean;
    notes?: string | null;
  }
): Promise<Entry> {
  const db = getDb();
  const [row] = (await db.sql`
    UPDATE pipeline_entries SET
      date = ${input.date},
      candidate = ${input.candidate},
      company = ${input.company},
      role = ${input.role ?? null},
      interview_type = ${input.interviewType},
      round = ${input.round},
      team = ${input.team},
      stage = ${input.stage},
      declined = ${input.declined},
      notes = ${input.notes ?? null}
    WHERE id = ${id}
    RETURNING *
  `) as EntryRow[];
  return toEntry(row);
}

export async function deleteEntry(id: string) {
  await getDb().sql`DELETE FROM pipeline_entries WHERE id = ${id}`;
}

// ---------------- Roster ----------------

type RosterRow = { id: number; name: string; sort_order: number };

function toRoster(row: RosterRow): RosterMember {
  return { id: row.id, name: row.name, sortOrder: row.sort_order };
}

export async function listRoster(): Promise<RosterMember[]> {
  const db = getDb();
  const rows = (await db.sql`
    SELECT * FROM roster ORDER BY sort_order, name
  `) as RosterRow[];
  return rows.map(toRoster);
}

export async function addRosterMember(name: string): Promise<RosterMember> {
  const db = getDb();
  const [maxRow] = (await db.sql`
    SELECT COALESCE(MAX(sort_order), -1) AS m FROM roster
  `) as { m: number }[];
  const [row] = (await db.sql`
    INSERT INTO roster (name, sort_order)
    VALUES (${name}, ${maxRow.m + 1})
    ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
    RETURNING *
  `) as RosterRow[];
  return toRoster(row);
}

export async function renameRosterMember(
  id: number,
  newName: string
): Promise<RosterMember | null> {
  const db = getDb();
  const [existing] = (await db.sql`
    SELECT * FROM roster WHERE id = ${id}
  `) as RosterRow[];
  if (!existing) return null;
  const oldName = existing.name;

  const [row] = (await db.sql`
    UPDATE roster SET name = ${newName} WHERE id = ${id} RETURNING *
  `) as RosterRow[];

  // Keep historical records consistent with the rename.
  await db.sql`
    UPDATE pipeline_entries SET team = array_replace(team, ${oldName}, ${newName})
    WHERE ${oldName} = ANY(team)
  `;
  await db.sql`
    UPDATE pipeline_entries SET added_by = ${newName} WHERE added_by = ${oldName}
  `;
  await db.sql`
    UPDATE billings SET recruiter = ${newName} WHERE recruiter = ${oldName}
  `;
  await db.sql`
    UPDATE billings SET added_by = ${newName} WHERE added_by = ${oldName}
  `;

  return toRoster(row);
}

export async function deleteRosterMember(id: number) {
  await getDb().sql`DELETE FROM roster WHERE id = ${id}`;
}

// ---------------- Billings ----------------

type BillingRow = {
  id: string;
  date: string;
  recruiter: string;
  amount: number;
  company: string | null;
  candidate: string | null;
  notes: string | null;
  added_by: string | null;
  created_at: string;
};

function toBilling(row: BillingRow): Billing {
  return {
    id: row.id,
    date: row.date,
    recruiter: row.recruiter,
    amount: Number(row.amount),
    company: row.company,
    candidate: row.candidate,
    notes: row.notes,
    addedBy: row.added_by,
    createdAt: row.created_at,
  };
}

export async function listBillings(): Promise<Billing[]> {
  const db = getDb();
  const rows = (await db.sql`
    SELECT * FROM billings ORDER BY date DESC, created_at DESC
  `) as BillingRow[];
  return rows.map(toBilling);
}

export async function createBilling(input: {
  id: string;
  date: string;
  recruiter: string;
  amount: number;
  company?: string | null;
  candidate?: string | null;
  notes?: string | null;
  addedBy?: string | null;
}): Promise<Billing> {
  const db = getDb();
  const [row] = (await db.sql`
    INSERT INTO billings (id, date, recruiter, amount, company, candidate, notes, added_by)
    VALUES (
      ${input.id},
      ${input.date},
      ${input.recruiter},
      ${input.amount},
      ${input.company ?? null},
      ${input.candidate ?? null},
      ${input.notes ?? null},
      ${input.addedBy ?? null}
    )
    RETURNING *
  `) as BillingRow[];
  return toBilling(row);
}

export async function updateBilling(
  id: string,
  input: {
    date: string;
    recruiter: string;
    amount: number;
    company?: string | null;
    candidate?: string | null;
    notes?: string | null;
  }
): Promise<Billing> {
  const db = getDb();
  const [row] = (await db.sql`
    UPDATE billings SET
      date = ${input.date},
      recruiter = ${input.recruiter},
      amount = ${input.amount},
      company = ${input.company ?? null},
      candidate = ${input.candidate ?? null},
      notes = ${input.notes ?? null}
    WHERE id = ${id}
    RETURNING *
  `) as BillingRow[];
  return toBilling(row);
}

export async function deleteBilling(id: string) {
  await getDb().sql`DELETE FROM billings WHERE id = ${id}`;
}
