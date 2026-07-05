import { getDb } from "./db";
import { uid } from "./ui";
import { Billing, Entry, MeetingLogEntry, ProductionGoals, Retainer, RosterMember, StageEvent } from "./types";

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
  stage_history: StageEvent[];
  meeting_log: MeetingLogEntry[];
  declined: boolean;
  declined_reason: string | null;
  notes: string | null;
  added_by: string | null;
  created_at: string;
  first_time: boolean;
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
    stageHistory: row.stage_history ?? [],
    meetingLog: row.meeting_log ?? [],
    declined: row.declined,
    declinedReason: row.declined_reason as Entry["declinedReason"],
    notes: row.notes,
    addedBy: row.added_by,
    createdAt: row.created_at,
    firstTime: row.first_time,
  };
}

// The activity log's entries are either a logged meeting (Phone/Video/
// Face-to-Face + round) or a stage marker like "Offer" (round unused) —
// same shape, so both render in one chronological list.
function activityEntry(type: string, round: number, date: string): MeetingLogEntry {
  return { id: uid(), type, round, date };
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
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
  declinedReason?: string | null;
  notes?: string | null;
  addedBy?: string | null;
  firstTime: boolean;
}): Promise<Entry> {
  const db = getDb();
  // The Sent date defaults to the send-out's own date — no other default.
  const history: StageEvent[] = [{ stage: input.stage as Entry["stage"], date: input.date }];
  // No meeting is logged automatically -- the user picks when they've
  // actually held one. Created straight into Offer or Placed (rare) still
  // marks it, same as reaching that stage normally would.
  const meetingLog: MeetingLogEntry[] = [];
  if (input.stage === "offer" || input.stage === "placed") meetingLog.push(activityEntry("Offer", 0, input.date));
  if (input.stage === "placed") meetingLog.push(activityEntry("Placed", 0, input.date));
  const [row] = (await db.sql`
    INSERT INTO pipeline_entries (id, date, candidate, company, role, interview_type, round, team, stage, stage_history, meeting_log, declined, declined_reason, notes, added_by, first_time)
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
      ${JSON.stringify(history)},
      ${JSON.stringify(meetingLog)},
      ${input.declined},
      ${input.declinedReason ?? null},
      ${input.notes ?? null},
      ${input.addedBy ?? null},
      ${input.firstTime}
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
    declinedReason?: string | null;
    notes?: string | null;
    firstTime: boolean;
    // The browser's own local calendar date for a newly-reached stage. The
    // server's clock can't be trusted for this -- it has no idea what
    // timezone the user is in, so falling back to its own "today" can stamp
    // a stage a day off from the business day the user actually acted in
    // (e.g. Vercel's server clock is UTC, which is already "tomorrow" for
    // anyone in the US once it's evening locally).
    stageDate?: string;
  }
): Promise<Entry | null> {
  const db = getDb();
  const [existing] = (await db.sql`
    SELECT stage, stage_history, meeting_log FROM pipeline_entries WHERE id = ${id}
  `) as { stage: string; stage_history: StageEvent[]; meeting_log: MeetingLogEntry[] }[];
  if (!existing) return null;

  const newStageDate = input.stageDate || todayISO();
  let history = existing.stage_history ?? [];
  // Insert-or-update: if this send-out had already reached this stage before
  // (e.g. it was advanced to Offer, moved back to Interview, and is now being
  // advanced to Offer again), re-arriving at it just now should re-stamp
  // today's date, not silently keep whatever date was recorded the first
  // time. The old "only append if missing" guard left stale dates in place
  // on a re-arrival, which then leaked into the activity log below.
  if (input.stage !== existing.stage) {
    const idx = history.map((h) => h.stage).lastIndexOf(input.stage as Entry["stage"]);
    history =
      idx === -1
        ? [...history, { stage: input.stage as Entry["stage"], date: newStageDate }]
        : history.map((h, i) => (i === idx ? { ...h, date: newStageDate } : h));
  }

  // Reaching Offer or Placed logs it as an activity, same as a logged
  // meeting -- Interview itself is never auto-logged, the user picks when
  // they've actually held a meeting. Uses newStageDate directly (not a
  // history lookup) so it can't inherit a stale date from a prior visit.
  let meetingLog = existing.meeting_log ?? [];
  if (input.stage === "offer" && existing.stage !== "offer") {
    meetingLog = [...meetingLog, activityEntry("Offer", 0, newStageDate)];
  }
  if (input.stage === "placed" && existing.stage !== "placed") {
    meetingLog = [...meetingLog, activityEntry("Placed", 0, newStageDate)];
  }

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
      stage_history = ${JSON.stringify(history)},
      meeting_log = ${JSON.stringify(meetingLog)},
      declined = ${input.declined},
      declined_reason = ${input.declined ? input.declinedReason ?? null : null},
      notes = ${input.notes ?? null},
      first_time = ${input.firstTime}
    WHERE id = ${id}
    RETURNING *
  `) as EntryRow[];
  return toEntry(row);
}

export async function deleteEntry(id: string) {
  await getDb().sql`DELETE FROM pipeline_entries WHERE id = ${id}`;
}

// Appends a meeting to the log (Phone R1 -> Phone R2 -> Face-to-Face R1,
// etc.) and updates the entry's current type/round to match — the fixed
// 4-stage tracker never changes, only what's logged inside Interview does.
export async function logMeeting(
  id: string,
  type: string,
  round: number,
  date: string
): Promise<Entry | null> {
  const db = getDb();
  const [existing] = (await db.sql`
    SELECT meeting_log FROM pipeline_entries WHERE id = ${id}
  `) as { meeting_log: MeetingLogEntry[] }[];
  if (!existing) return null;

  const meetingLog = [...(existing.meeting_log ?? []), { id: uid(), type, round, date }];
  const [row] = (await db.sql`
    UPDATE pipeline_entries SET meeting_log = ${JSON.stringify(meetingLog)}, interview_type = ${type}, round = ${round}
    WHERE id = ${id}
    RETURNING *
  `) as EntryRow[];
  return toEntry(row);
}

// Removes a single mistakenly-logged meeting. The entry's current
// type/round follows whatever is now the last remaining meeting (or stays
// put if the log is now empty).
export async function deleteMeetingLogEntry(id: string, meetingId: string): Promise<Entry | null> {
  const db = getDb();
  const [existing] = (await db.sql`
    SELECT meeting_log, interview_type, round FROM pipeline_entries WHERE id = ${id}
  `) as { meeting_log: MeetingLogEntry[]; interview_type: string; round: number }[];
  if (!existing) return null;

  const meetingLog = (existing.meeting_log ?? []).filter((m) => m.id !== meetingId);
  const last = meetingLog[meetingLog.length - 1];
  const interviewType = last?.type ?? existing.interview_type;
  const round = last?.round ?? existing.round;

  const [row] = (await db.sql`
    UPDATE pipeline_entries SET meeting_log = ${JSON.stringify(meetingLog)}, interview_type = ${interviewType}, round = ${round}
    WHERE id = ${id}
    RETURNING *
  `) as EntryRow[];
  return toEntry(row);
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
    UPDATE billings SET team = array_replace(team, ${oldName}, ${newName})
    WHERE ${oldName} = ANY(team)
  `;
  await db.sql`
    UPDATE billings SET added_by = ${newName} WHERE added_by = ${oldName}
  `;
  await db.sql`
    UPDATE retainers SET recruiter = ${newName} WHERE recruiter = ${oldName}
    AND NOT EXISTS (SELECT 1 FROM retainers WHERE recruiter = ${newName})
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
  team: string[] | null;
  amount: number;
  company: string | null;
  candidate: string | null;
  role: string | null;
  notes: string | null;
  added_by: string | null;
  created_at: string;
};

function toBilling(row: BillingRow): Billing {
  return {
    id: row.id,
    date: row.date,
    team: row.team ?? [],
    amount: Number(row.amount),
    company: row.company,
    candidate: row.candidate,
    role: row.role,
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
  team: string[];
  amount: number;
  company?: string | null;
  candidate?: string | null;
  role?: string | null;
  notes?: string | null;
  addedBy?: string | null;
}): Promise<Billing> {
  const db = getDb();
  const [row] = (await db.sql`
    INSERT INTO billings (id, date, team, amount, company, candidate, role, notes, added_by)
    VALUES (
      ${input.id},
      ${input.date},
      ${input.team},
      ${input.amount},
      ${input.company ?? null},
      ${input.candidate ?? null},
      ${input.role ?? null},
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
    team: string[];
    amount: number;
    company?: string | null;
    candidate?: string | null;
    role?: string | null;
    notes?: string | null;
  }
): Promise<Billing> {
  const db = getDb();
  const [row] = (await db.sql`
    UPDATE billings SET
      date = ${input.date},
      team = ${input.team},
      amount = ${input.amount},
      company = ${input.company ?? null},
      candidate = ${input.candidate ?? null},
      role = ${input.role ?? null},
      notes = ${input.notes ?? null}
    WHERE id = ${id}
    RETURNING *
  `) as BillingRow[];
  return toBilling(row);
}

export async function deleteBilling(id: string) {
  await getDb().sql`DELETE FROM billings WHERE id = ${id}`;
}

// ---------------- Retainers ----------------

type RetainerRow = { recruiter: string; client: string | null; amount: number | null };

function toRetainer(row: RetainerRow): Retainer {
  return { recruiter: row.recruiter, client: row.client, amount: row.amount === null ? null : Number(row.amount) };
}

export async function listRetainers(): Promise<Retainer[]> {
  const db = getDb();
  const rows = (await db.sql`SELECT * FROM retainers`) as RetainerRow[];
  return rows.map(toRetainer);
}

export async function setRetainer(
  recruiter: string,
  client: string | null,
  amount: number | null
): Promise<Retainer> {
  const db = getDb();
  await db.sql`
    INSERT INTO retainers (recruiter, client, amount)
    VALUES (${recruiter}, ${client}, ${amount})
    ON CONFLICT (recruiter) DO UPDATE SET client = EXCLUDED.client, amount = EXCLUDED.amount
  `;
  return { recruiter, client, amount };
}

// ---------------- Production goals ----------------

type GoalsRow = { year: number; yearly_goal: number | null; monthly_goal: number | null };

export async function getProductionGoals(year: number): Promise<ProductionGoals> {
  const db = getDb();
  const [row] = (await db.sql`
    SELECT * FROM production_goals WHERE year = ${year}
  `) as GoalsRow[];
  return {
    year,
    yearlyGoal: row ? Number(row.yearly_goal) : null,
    monthlyGoal: row ? Number(row.monthly_goal) : null,
  };
}

export async function setProductionGoals(
  year: number,
  yearlyGoal: number | null,
  monthlyGoal: number | null
): Promise<ProductionGoals> {
  const db = getDb();
  await db.sql`
    INSERT INTO production_goals (year, yearly_goal, monthly_goal)
    VALUES (${year}, ${yearlyGoal}, ${monthlyGoal})
    ON CONFLICT (year) DO UPDATE SET yearly_goal = EXCLUDED.yearly_goal, monthly_goal = EXCLUDED.monthly_goal
  `;
  return { year, yearlyGoal, monthlyGoal };
}
