export type Recruiter = {
  id: number;
  name: string;
  active: number;
  sort_order: number;
};

export type Sendout = {
  id: number;
  date: string;
  candidate: string;
  company: string;
  role: string | null;
  type: string | null;
  recruiter_id: number;
  am_recruiter_id: number | null;
  notes: string | null;
  created_at: string;
};

export type Billing = {
  id: number;
  date: string;
  recruiter_id: number;
  amount: number;
  category: string;
  personal: number;
  candidate: string | null;
  company: string | null;
  notes: string | null;
  created_at: string;
};

export type Retainer = {
  id: number;
  date: string;
  recruiter_id: number;
  amount: number;
  company: string | null;
  notes: string | null;
  created_at: string;
};

export type LeaderboardRow = {
  recruiter: Recruiter;
  sendoutsMonth: number;
  sendoutsYtd: number;
  billingsMonth: number;
  billingsYtdPersonal: number;
  billingsYtdTotal: number;
  retainersYtd: number;
  totalCashYtd: number;
};
