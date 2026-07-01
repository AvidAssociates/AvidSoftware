export type Stage = "sent" | "interview" | "offer" | "placed";

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
  declined: boolean;
  notes: string | null;
  addedBy: string | null;
  createdAt: string;
};
