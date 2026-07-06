export type Stage = "sent" | "interview" | "offer" | "placed";

export type StageEvent = {
  stage: Stage;
  date: string;
};

export type DeclineReason = "candidate" | "client";

// One logged meeting within the Interview stage — Phone R1, then Phone R2,
// then Face-to-Face R1, etc. Lets the meeting type/round move forward
// without the fixed 4-stage tracker (Sent/Interview/Offer/Placed) changing
// shape, and without creating a duplicate entry for the same candidate the
// way the paper sheet does.
export type MeetingLogEntry = {
  id: string;
  type: string;
  round: number;
  date: string;
};

export type Entry = {
  id: string;
  date: string;
  candidate: string;
  company: string;
  role: string | null;
  interviewType: string;
  round: number;
  team: string[];
  stage: Stage;
  stageHistory: StageEvent[];
  meetingLog: MeetingLogEntry[];
  declined: boolean;
  declinedReason: DeclineReason | null;
  notes: string | null;
  addedBy: string | null;
  createdAt: string;
  // First-time business vs. a repeat placement for the same relationship —
  // drives the "First-Time" leaderboard variant.
  firstTime: boolean;
};

export type Billing = {
  id: string;
  date: string;
  // Every person listed is credited the FULL amount — a solo deal is
  // team.length === 1, a team deal is team.length >= 2. No splitting.
  team: string[];
  amount: number;
  company: string | null;
  candidate: string | null;
  role: string | null;
  notes: string | null;
  addedBy: string | null;
  createdAt: string;
  salary: number | null;
  feePercent: number | null;
  // Set when this row was auto-created from a placed send-out; NULL for
  // fees logged directly on the Billings tab.
  entryId: string | null;
};

export type EntryMutationResult = {
  entry: Entry;
  billing?: Billing;
  billingDeletedId?: string;
};

export type Retainer = {
  recruiter: string;
  client: string | null;
  amount: number | null;
};

export type RosterMember = {
  id: number;
  name: string;
  sortOrder: number;
};

export type ProductionGoals = {
  year: number;
  yearlyGoal: number | null;
  monthlyGoal: number | null;
};
