-- Salary and fee % for placed send-outs (billing amount = salary * fee_percent / 100).
ALTER TABLE billings ADD COLUMN IF NOT EXISTS salary NUMERIC;
ALTER TABLE billings ADD COLUMN IF NOT EXISTS fee_percent NUMERIC;
