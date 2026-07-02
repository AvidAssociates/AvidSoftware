export type Stage = "sent" | "interview" | "offer" | "placed";

export type StageEvent = {
  stage: Stage;
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
  declined: boolean;
  notes: string | null;
  addedBy: string | null;
  createdAt: string;
};

export type Billing = {
  id: string;
  date: string;
  recruiter: string;
  amount: number;
  company: string | null;
  candidate: string | null;
  notes: string | null;
  addedBy: string | null;
  createdAt: string;
};

export type RosterMember = {
  id: number;
  name: string;
  sortOrder: number;
};
