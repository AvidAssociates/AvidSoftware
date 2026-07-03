-- Yearly and monthly billing goals for the Report tab, one row per year.
CREATE TABLE IF NOT EXISTS production_goals (
  year INTEGER PRIMARY KEY,
  yearly_goal REAL,
  monthly_goal REAL
);
