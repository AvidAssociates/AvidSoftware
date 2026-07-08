import { getDb } from "./db";
import { uid } from "./ui";
import { normalizeSearchStage, resolveAutoSearchStage } from "./search-stale";
import { Billing, BillingCollectionLogEntry, BillingCollectionStage, CandidateStage, CandidateStageEvent, Entry, EntryMutationResult, MeetingLogEntry, ProductionGoals, RetainedSearch, Retainer, RosterMember, SearchCandidate, SearchStage, SearchStageEvent, StageEvent } from "./types";

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
}): Promise<EntryMutationResult> {
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
  const entry = toEntry(row);
  return { entry };
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
): Promise<EntryMutationResult | null> {
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
  const entry = toEntry(row);
  const wasPlaced = existing.stage === "placed";

  if (wasPlaced && !isEffectivelyPlaced(input)) {
    const billingDeletedId = (await removeAutoBillingForEntry(id)) ?? undefined;
    return billingDeletedId ? { entry, billingDeletedId } : { entry };
  }

  return { entry };
}

export async function deleteEntry(id: string): Promise<string | null> {
  const db = getDb();
  const billingDeletedId = await removeAutoBillingForEntry(id);
  await db.sql`UPDATE billings SET entry_id = NULL WHERE entry_id = ${id}`;
  await db.sql`DELETE FROM pipeline_entries WHERE id = ${id}`;
  return billingDeletedId;
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

export async function updateMeetingLogDate(
  id: string,
  meetingId: string,
  date: string
): Promise<Entry | null> {
  const db = getDb();
  const [existing] = (await db.sql`
    SELECT meeting_log FROM pipeline_entries WHERE id = ${id}
  `) as { meeting_log: MeetingLogEntry[] }[];
  if (!existing) return null;

  const meetingLog = (existing.meeting_log ?? []).map((m) => (m.id === meetingId ? { ...m, date } : m));
  if (!meetingLog.some((m) => m.id === meetingId)) return null;

  const [row] = (await db.sql`
    UPDATE pipeline_entries SET meeting_log = ${JSON.stringify(meetingLog)}
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
  entry_id: string | null;
  salary: number | null;
  fee_percent: number | null;
  collection_stage: string;
  collection_history: { stage: BillingCollectionStage; date: string }[];
  collection_log: BillingCollectionLogEntry[];
};

function collectionLogEntry(type: BillingCollectionLogEntry["type"], date: string): BillingCollectionLogEntry {
  return { id: uid(), type, date };
}

function initialCollectionState(date: string) {
  return {
    collection_stage: "invoiced" as BillingCollectionStage,
    collection_history: [{ stage: "invoiced" as BillingCollectionStage, date }],
    collection_log: [collectionLogEntry("Invoiced", date)],
  };
}

function toBilling(row: BillingRow): Billing {
  const collectionStage = (row.collection_stage === "collected" ? "collected" : "invoiced") as BillingCollectionStage;
  return {
    id: row.id,
    date: row.date,
    team: row.team ?? [],
    amount: Number(row.amount),
    company: row.company,
    candidate: row.candidate,
    role: row.role ?? null,
    notes: row.notes,
    addedBy: row.added_by,
    createdAt: row.created_at,
    entryId: row.entry_id ?? null,
    salary: row.salary === null || row.salary === undefined ? null : Number(row.salary),
    feePercent: row.fee_percent === null || row.fee_percent === undefined ? null : Number(row.fee_percent),
    collectionStage,
    collectionHistory: row.collection_history ?? [],
    collectionLog: row.collection_log ?? [],
  };
}

function isEffectivelyPlaced(input: { stage: string; declined: boolean }) {
  return input.stage === "placed" && !input.declined;
}

function placedDateFromHistory(history: StageEvent[], fallback: string) {
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].stage === "placed") return history[i].date;
  }
  return fallback;
}

type BillingSyncInput = {
  date: string;
  team: string[];
  company: string;
  candidate: string;
  role?: string | null;
  addedBy?: string | null;
};

// A placed send-out always has a matching billing row (amount starts at $0
// until the fee is entered). Manual billings skip this and leave entry_id NULL.
async function syncBillingForPlacedEntry(
  entryId: string,
  input: BillingSyncInput,
  options?: { updateDate?: boolean }
): Promise<Billing> {
  const db = getDb();
  const [existing] = (await db.sql`
    SELECT * FROM billings WHERE entry_id = ${entryId}
  `) as BillingRow[];

  if (existing) {
    const [row] = options?.updateDate
      ? ((await db.sql`
          UPDATE billings SET
            date = ${input.date},
            team = ${input.team},
            company = ${input.company},
            candidate = ${input.candidate},
            role = ${input.role ?? null}
          WHERE id = ${existing.id}
          RETURNING *
        `) as BillingRow[])
      : ((await db.sql`
          UPDATE billings SET
            team = ${input.team},
            company = ${input.company},
            candidate = ${input.candidate},
            role = ${input.role ?? null}
          WHERE id = ${existing.id}
          RETURNING *
        `) as BillingRow[]);
    return toBilling(row);
  }

  const initial = initialCollectionState(input.date);
  const [row] = (await db.sql`
    INSERT INTO billings (id, date, team, amount, company, candidate, role, notes, added_by, entry_id, collection_stage, collection_history, collection_log)
    VALUES (
      ${uid()},
      ${input.date},
      ${input.team},
      0,
      ${input.company},
      ${input.candidate},
      ${input.role ?? null},
      null,
      ${input.addedBy ?? null},
      ${entryId},
      ${initial.collection_stage},
      ${JSON.stringify(initial.collection_history)},
      ${JSON.stringify(initial.collection_log)}
    )
    RETURNING *
  `) as BillingRow[];
  return toBilling(row);
}

// Only removes auto-created rows that still have no fee logged.
async function removeAutoBillingForEntry(entryId: string): Promise<string | null> {
  const db = getDb();
  const [existing] = (await db.sql`
    SELECT id, amount FROM billings WHERE entry_id = ${entryId}
  `) as { id: string; amount: number }[];
  if (!existing || Number(existing.amount) !== 0) return null;
  await db.sql`DELETE FROM billings WHERE id = ${existing.id}`;
  return existing.id;
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
  const initial = initialCollectionState(input.date);
  const [row] = (await db.sql`
    INSERT INTO billings (id, date, team, amount, company, candidate, role, notes, added_by, collection_stage, collection_history, collection_log)
    VALUES (
      ${input.id},
      ${input.date},
      ${input.team},
      ${input.amount},
      ${input.company ?? null},
      ${input.candidate ?? null},
      ${input.role ?? null},
      ${input.notes ?? null},
      ${input.addedBy ?? null},
      ${initial.collection_stage},
      ${JSON.stringify(initial.collection_history)},
      ${JSON.stringify(initial.collection_log)}
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
    salary?: number | null;
    feePercent?: number | null;
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
      notes = ${input.notes ?? null},
      salary = ${input.salary ?? null},
      fee_percent = ${input.feePercent ?? null}
    WHERE id = ${id}
    RETURNING *
  `) as BillingRow[];
  return toBilling(row);
}

export async function deleteBilling(id: string) {
  await getDb().sql`DELETE FROM billings WHERE id = ${id}`;
}

export async function advanceBillingCollection(
  id: string,
  stage: BillingCollectionStage,
  stageDate?: string
): Promise<Billing | null> {
  const db = getDb();
  const [existing] = (await db.sql`
    SELECT collection_stage, collection_history, collection_log FROM billings WHERE id = ${id}
  `) as {
    collection_stage: BillingCollectionStage;
    collection_history: { stage: BillingCollectionStage; date: string }[];
    collection_log: BillingCollectionLogEntry[];
  }[];
  if (!existing) return null;

  const newStageDate = stageDate || todayISO();
  let history = existing.collection_history ?? [];
  let collectionLog = existing.collection_log ?? [];

  if (stage !== existing.collection_stage) {
    const idx = history.map((h) => h.stage).lastIndexOf(stage);
    history =
      idx === -1
        ? [...history, { stage, date: newStageDate }]
        : history.map((h, i) => (i === idx ? { ...h, date: newStageDate } : h));
  }

  if (stage === "collected" && existing.collection_stage !== "collected") {
    if (collectionLog.some((e) => e.type === "Collected")) {
      collectionLog = collectionLog.map((e) => (e.type === "Collected" ? { ...e, date: newStageDate } : e));
    } else {
      collectionLog = [...collectionLog, collectionLogEntry("Collected", newStageDate)];
    }
  }

  if (stage === "invoiced" && existing.collection_stage === "collected") {
    collectionLog = collectionLog.filter((e) => e.type !== "Collected");
    collectionLog = collectionLog.map((e) => (e.type === "Invoiced" ? { ...e, date: newStageDate } : e));
  }

  if (!collectionLog.some((e) => e.type === "Invoiced")) {
    collectionLog = [collectionLogEntry("Invoiced", newStageDate), ...collectionLog];
  }

  const [row] = (await db.sql`
    UPDATE billings SET
      collection_stage = ${stage},
      collection_history = ${JSON.stringify(history)},
      collection_log = ${JSON.stringify(collectionLog)}
    WHERE id = ${id}
    RETURNING *
  `) as BillingRow[];
  return toBilling(row);
}

export async function updateBillingCollectionLogDate(
  id: string,
  logId: string,
  date: string
): Promise<Billing | null> {
  const db = getDb();
  const [existing] = (await db.sql`
    SELECT collection_log, collection_history, collection_stage FROM billings WHERE id = ${id}
  `) as {
    collection_log: BillingCollectionLogEntry[];
    collection_history: { stage: BillingCollectionStage; date: string }[];
    collection_stage: BillingCollectionStage;
  }[];
  if (!existing) return null;

  const collectionLog = (existing.collection_log ?? []).map((e) => (e.id === logId ? { ...e, date } : e));
  const touched = collectionLog.find((e) => e.id === logId);
  let history = existing.collection_history ?? [];
  if (touched) {
    const stage = touched.type === "Invoiced" ? "invoiced" : "collected";
    const idx = history.map((h) => h.stage).lastIndexOf(stage);
    if (idx !== -1) {
      history = history.map((h, i) => (i === idx ? { ...h, date } : h));
    }
  }

  const [row] = (await db.sql`
    UPDATE billings SET
      collection_log = ${JSON.stringify(collectionLog)},
      collection_history = ${JSON.stringify(history)}
    WHERE id = ${id}
    RETURNING *
  `) as BillingRow[];
  return toBilling(row);
}

// ---------------- Retained searches ----------------

type SearchRow = {
  id: string;
  date: string;
  client: string;
  role: string | null;
  team: string[];
  stage: string;
  stage_history: SearchStageEvent[];
  retainer_amount: number | null;
  notes: string | null;
  added_by: string | null;
  created_at: string;
};

type CandidateRow = {
  id: string;
  search_id: string;
  name: string;
  stage: string;
  stage_history: CandidateStageEvent[];
  notes: string | null;
  added_by: string | null;
  created_at: string;
  profile_image_url: string | null;
  linkedin_url: string | null;
};

function toSearch(row: SearchRow, candidates: SearchCandidate[] = []): RetainedSearch {
  const stage = normalizeSearchStage(row.stage);
  const stageHistory = (row.stage_history ?? []).map((ev) => ({
    ...ev,
    stage: normalizeSearchStage(ev.stage),
  }));
  return {
    id: row.id,
    date: row.date,
    client: row.client,
    role: row.role,
    team: row.team ?? [],
    stage,
    stageHistory,
    retainerAmount: row.retainer_amount === null ? null : Number(row.retainer_amount),
    notes: row.notes,
    addedBy: row.added_by,
    createdAt: row.created_at,
    candidates,
  };
}

function toCandidate(row: CandidateRow): SearchCandidate {
  return {
    id: row.id,
    searchId: row.search_id,
    name: row.name,
    stage: row.stage as CandidateStage,
    stageHistory: row.stage_history ?? [],
    notes: row.notes,
    addedBy: row.added_by,
    createdAt: row.created_at,
    profileImageUrl: row.profile_image_url,
    linkedinUrl: row.linkedin_url,
  };
}

function mergeSearchStageHistory(
  existing: SearchStageEvent[],
  stage: SearchStage,
  stageDate: string
): SearchStageEvent[] {
  const last = existing[existing.length - 1];
  if (last?.stage === stage) return existing;
  return [...existing, { stage, date: stageDate }];
}

function mergeCandidateStageHistory(
  existing: CandidateStageEvent[],
  stage: CandidateStage,
  stageDate: string
): CandidateStageEvent[] {
  const last = existing[existing.length - 1];
  if (last?.stage === stage) return existing;
  return [...existing, { stage, date: stageDate }];
}

async function syncSearchStaleIfNeeded(search: RetainedSearch): Promise<RetainedSearch> {
  const candidates = search.candidates ?? [];
  const today = todayISO();
  const target = resolveAutoSearchStage(search, candidates, today);
  if (search.stage === target) return search;
  return updateSearch(search.id, {
    date: search.date,
    client: search.client,
    role: search.role,
    team: search.team,
    stage: target,
    retainerAmount: search.retainerAmount,
    notes: search.notes,
    stageDate: today,
  });
}

async function syncSearchStaleById(searchId: string): Promise<void> {
  const db = getDb();
  const [row] = (await db.sql`SELECT * FROM retained_searches WHERE id = ${searchId}`) as SearchRow[];
  if (!row) return;
  const candidateRows = (await db.sql`
    SELECT * FROM search_candidates WHERE search_id = ${searchId} ORDER BY created_at DESC
  `) as CandidateRow[];
  await syncSearchStaleIfNeeded(toSearch(row, candidateRows.map(toCandidate)));
}

export async function listSearches(): Promise<RetainedSearch[]> {
  const db = getDb();
  const searchRows = (await db.sql`
    SELECT * FROM retained_searches ORDER BY date DESC, created_at DESC
  `) as SearchRow[];
  const candidateRows = (await db.sql`
    SELECT * FROM search_candidates ORDER BY created_at DESC
  `) as CandidateRow[];
  const bySearch = new Map<string, SearchCandidate[]>();
  for (const row of candidateRows) {
    const list = bySearch.get(row.search_id) ?? [];
    list.push(toCandidate(row));
    bySearch.set(row.search_id, list);
  }
  return Promise.all(searchRows.map((row) => syncSearchStaleIfNeeded(toSearch(row, bySearch.get(row.id) ?? []))));
}

export async function getSearch(id: string): Promise<RetainedSearch | null> {
  const db = getDb();
  const [row] = (await db.sql`SELECT * FROM retained_searches WHERE id = ${id}`) as SearchRow[];
  if (!row) return null;
  const candidateRows = (await db.sql`
    SELECT * FROM search_candidates WHERE search_id = ${id} ORDER BY created_at DESC
  `) as CandidateRow[];
  return syncSearchStaleIfNeeded(toSearch(row, candidateRows.map(toCandidate)));
}

export async function createSearch(input: {
  id: string;
  date: string;
  client: string;
  role?: string | null;
  team: string[];
  stage?: SearchStage;
  retainerAmount?: number | null;
  notes?: string | null;
  addedBy?: string | null;
}): Promise<RetainedSearch> {
  const db = getDb();
  const stage = input.stage ?? "sourcing";
  const history: SearchStageEvent[] = [{ stage, date: input.date }];
  const [row] = (await db.sql`
    INSERT INTO retained_searches (id, date, client, role, team, stage, stage_history, retainer_amount, notes, added_by)
    VALUES (
      ${input.id},
      ${input.date},
      ${input.client},
      ${input.role ?? null},
      ${input.team},
      ${stage},
      ${JSON.stringify(history)},
      ${input.retainerAmount ?? null},
      ${input.notes ?? null},
      ${input.addedBy ?? null}
    )
    RETURNING *
  `) as SearchRow[];
  return toSearch(row, []);
}

export async function updateSearch(
  id: string,
  input: {
    date: string;
    client: string;
    role?: string | null;
    team: string[];
    stage: SearchStage;
    retainerAmount?: number | null;
    notes?: string | null;
    stageDate?: string;
  }
): Promise<RetainedSearch> {
  const db = getDb();
  const [existing] = (await db.sql`SELECT * FROM retained_searches WHERE id = ${id}`) as SearchRow[];
  if (!existing) throw new Error("Search not found");
  const stageDate = input.stageDate ?? todayISO();
  const history =
    input.stage !== existing.stage
      ? mergeSearchStageHistory(existing.stage_history ?? [], input.stage, stageDate)
      : (existing.stage_history ?? []);
  const [row] = (await db.sql`
    UPDATE retained_searches SET
      date = ${input.date},
      client = ${input.client},
      role = ${input.role ?? null},
      team = ${input.team},
      stage = ${input.stage},
      stage_history = ${JSON.stringify(history)},
      retainer_amount = ${input.retainerAmount ?? null},
      notes = ${input.notes ?? null}
    WHERE id = ${id}
    RETURNING *
  `) as SearchRow[];
  const candidateRows = (await db.sql`
    SELECT * FROM search_candidates WHERE search_id = ${id} ORDER BY created_at DESC
  `) as CandidateRow[];
  return toSearch(row, candidateRows.map(toCandidate));
}

export async function deleteSearch(id: string): Promise<void> {
  const db = getDb();
  await db.sql`DELETE FROM retained_searches WHERE id = ${id}`;
}

export async function createSearchCandidate(input: {
  id: string;
  searchId: string;
  name: string;
  stage?: CandidateStage;
  notes?: string | null;
  addedBy?: string | null;
  stageDate?: string;
  profileImageUrl?: string | null;
  linkedinUrl?: string | null;
}): Promise<SearchCandidate> {
  const db = getDb();
  const stage = input.stage ?? "presented";
  const stageDate = input.stageDate ?? todayISO();
  const history: CandidateStageEvent[] = [{ stage, date: stageDate }];
  const [row] = (await db.sql`
    INSERT INTO search_candidates (id, search_id, name, stage, stage_history, notes, added_by, profile_image_url, linkedin_url)
    VALUES (
      ${input.id},
      ${input.searchId},
      ${input.name},
      ${stage},
      ${JSON.stringify(history)},
      ${input.notes ?? null},
      ${input.addedBy ?? null},
      ${input.profileImageUrl ?? null},
      ${input.linkedinUrl ?? null}
    )
    RETURNING *
  `) as CandidateRow[];
  const candidate = toCandidate(row);
  await syncSearchStaleById(input.searchId);
  return candidate;
}

export async function updateSearchCandidate(
  id: string,
  input: {
    name: string;
    stage: CandidateStage;
    notes?: string | null;
    stageDate?: string;
    profileImageUrl?: string | null;
    linkedinUrl?: string | null;
  }
): Promise<SearchCandidate> {
  const db = getDb();
  const [existing] = (await db.sql`SELECT * FROM search_candidates WHERE id = ${id}`) as CandidateRow[];
  if (!existing) throw new Error("Candidate not found");
  const stageDate = input.stageDate ?? todayISO();
  const history =
    input.stage !== existing.stage
      ? mergeCandidateStageHistory(existing.stage_history ?? [], input.stage, stageDate)
      : (existing.stage_history ?? []);
  const profileImageUrl = input.profileImageUrl !== undefined ? input.profileImageUrl : existing.profile_image_url;
  const linkedinUrl = input.linkedinUrl !== undefined ? input.linkedinUrl : existing.linkedin_url;
  const [row] = (await db.sql`
    UPDATE search_candidates SET
      name = ${input.name},
      stage = ${input.stage},
      stage_history = ${JSON.stringify(history)},
      notes = ${input.notes ?? null},
      profile_image_url = ${profileImageUrl},
      linkedin_url = ${linkedinUrl}
    WHERE id = ${id}
    RETURNING *
  `) as CandidateRow[];
  const candidate = toCandidate(row);
  await syncSearchStaleById(existing.search_id);
  return candidate;
}

export async function deleteSearchCandidate(id: string): Promise<void> {
  const db = getDb();
  const [existing] = (await db.sql`SELECT search_id FROM search_candidates WHERE id = ${id}`) as { search_id: string }[];
  await db.sql`DELETE FROM search_candidates WHERE id = ${id}`;
  if (existing?.search_id) await syncSearchStaleById(existing.search_id);
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
