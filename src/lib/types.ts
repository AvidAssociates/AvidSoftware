export type Stage = "sent" | "interview" | "offer" | "placed";

export type StageEvent = {
  stage: Stage;
  date: string;
};

export type DeclineReason = "candidate" | "client";

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
  notes: string | null;
  addedBy: string | null;
  createdAt: string;
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
