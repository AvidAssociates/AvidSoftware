-- Recalibrate the Jan-Jul sample billings to match the office whiteboard
-- (Brad/Joe/Reid/Matt's YTD + July monthly totals, and Joe's/Matt's
-- personal-vs-team split). Team credit is created by adding a second name
-- to a few of Matt's and Reid's existing rows -- the shared row's full
-- amount then also counts toward Joe's Total without changing what
-- Matt/Reid already earned, matching the "credit everyone, never split"
-- rule. Justice was blank on the whiteboard, so his numbers are untouched.

-- Brad -- 100% solo, $545,908 YTD / $90,000 in July.
UPDATE billings SET amount = 55000 WHERE id = 'smpl-2026-b-001';
UPDATE billings SET amount = 58000 WHERE id = 'smpl-2026-b-002';
UPDATE billings SET amount = 50000 WHERE id = 'smpl-2026-b-003';
UPDATE billings SET amount = 47908 WHERE id = 'smpl-2026-b-004';
UPDATE billings SET amount = 62000 WHERE id = 'smpl-2026-b-005';
UPDATE billings SET amount = 88000 WHERE id = 'smpl-2026-b-006';
UPDATE billings SET amount = 95000 WHERE id = 'smpl-2026-b-007';
UPDATE billings SET amount = 52000 WHERE id = 'smpl-2026-b-008';
UPDATE billings SET amount = 38000 WHERE id = 'smpl-2026-b-009';

-- Joe -- solo rows sum to his $290,875 Personal YTD; the team-shared rows
-- below (Matt's and Reid's) bring his Total to $452,625 / $66,000 in July.
UPDATE billings SET amount = 30000 WHERE id = 'smpl-2026-b-015';
UPDATE billings SET amount = 28000 WHERE id = 'smpl-2026-b-016';
UPDATE billings SET amount = 35000 WHERE id = 'smpl-2026-b-017';
UPDATE billings SET amount = 32000 WHERE id = 'smpl-2026-b-018';
UPDATE billings SET amount = 30875 WHERE id = 'smpl-2026-b-019';
UPDATE billings SET amount = 34000 WHERE id = 'smpl-2026-b-020';
UPDATE billings SET amount = 35000 WHERE id = 'smpl-2026-b-021';
UPDATE billings SET amount = 66000 WHERE id = 'smpl-2026-b-022';

-- Reid -- $375,211 YTD / $71,000 in July; one March deal shared with Joe.
UPDATE billings SET amount = 45000 WHERE id = 'smpl-2026-b-029';
UPDATE billings SET amount = 48000 WHERE id = 'smpl-2026-b-030';
UPDATE billings SET amount = 50375, team = ARRAY['Reid','Joe'] WHERE id = 'smpl-2026-b-031';
UPDATE billings SET amount = 52000 WHERE id = 'smpl-2026-b-032';
UPDATE billings SET amount = 53000 WHERE id = 'smpl-2026-b-033';
UPDATE billings SET amount = 55836 WHERE id = 'smpl-2026-b-034';
UPDATE billings SET amount = 71000 WHERE id = 'smpl-2026-b-035';

-- Matt -- $145,125 YTD / $20,000 in July; January and July stay solo
-- ($33,750 Personal YTD), the four deals in between are shared with Joe.
UPDATE billings SET amount = 13750 WHERE id = 'smpl-2026-b-041';
UPDATE billings SET amount = 20000, team = ARRAY['Matt','Joe'] WHERE id = 'smpl-2026-b-042';
UPDATE billings SET amount = 25000, team = ARRAY['Matt','Joe'] WHERE id = 'smpl-2026-b-043';
UPDATE billings SET amount = 20000, team = ARRAY['Matt','Joe'] WHERE id = 'smpl-2026-b-044';
UPDATE billings SET amount = 23000, team = ARRAY['Matt','Joe'] WHERE id = 'smpl-2026-b-045';
UPDATE billings SET amount = 23375, team = ARRAY['Matt','Joe'] WHERE id = 'smpl-2026-b-046';
UPDATE billings SET amount = 20000 WHERE id = 'smpl-2026-b-047';

-- Keep the linked send-out entries in sync with the billings they mirror.
UPDATE pipeline_entries SET team = ARRAY['Reid','Joe'] WHERE id = 'smpl-2026-e-020';
UPDATE pipeline_entries SET team = ARRAY['Matt','Joe']
  WHERE id IN ('smpl-2026-e-026','smpl-2026-e-027','smpl-2026-e-028','smpl-2026-e-029','smpl-2026-e-030');

-- Seed the 2026 goal so Reports/Billings show the whiteboard's numbers
-- ($1,300,000/yr, $108,333/mo) without a manual Settings entry first.
INSERT INTO production_goals (year, yearly_goal, monthly_goal) VALUES (2026, 1300000, 108333)
ON CONFLICT (year) DO NOTHING;

-- New July send-outs still in progress (not yet billed) -- every other
-- entry in the sample set is already 'placed', so Send-Outs had nothing
-- active to show for the current month.
INSERT INTO pipeline_entries (id, date, candidate, company, role, interview_type, round, team, stage, stage_history, declined, declined_reason, notes, added_by, first_time) VALUES
  ('smpl-2026-e-039', '2026-07-02', 'Lucas Bennett', 'Fenwick Data Systems', 'Sales Manager', 'Video', 1, ARRAY['Brad'], 'interview', '[{"stage":"sent","date":"2026-07-02"},{"stage":"interview","date":"2026-07-09"}]', false, NULL, 'Sample data', 'Brad', true),
  ('smpl-2026-e-040', '2026-07-08', 'Renata Kim', 'Ashcroft Wealth Partners', 'Client Success Manager', 'Phone', 1, ARRAY['Joe'], 'sent', '[{"stage":"sent","date":"2026-07-08"}]', false, NULL, 'Sample data', 'Joe', false),
  ('smpl-2026-e-041', '2026-06-30', 'Peter Osei', 'Cascade Freight Partners', 'Regional Sales Director', 'Face-to-Face', 2, ARRAY['Reid'], 'offer', '[{"stage":"sent","date":"2026-06-30"},{"stage":"interview","date":"2026-07-07"},{"stage":"offer","date":"2026-07-16"}]', false, NULL, 'Sample data', 'Reid', true),
  ('smpl-2026-e-042', '2026-07-14', 'Grace Lindqvist', 'Palermo Consulting Group', 'Operations Analyst', 'Video', 1, ARRAY['Matt'], 'interview', '[{"stage":"sent","date":"2026-07-14"},{"stage":"interview","date":"2026-07-21"}]', false, NULL, 'Sample data', 'Matt', true),
  ('smpl-2026-e-043', '2026-07-20', 'Idris Farrow', 'Norling Biotech', 'QA Manager', 'Phone', 1, ARRAY['Justice'], 'sent', '[{"stage":"sent","date":"2026-07-20"}]', false, NULL, 'Sample data', 'Justice', true)
ON CONFLICT (id) DO NOTHING;
