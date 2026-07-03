-- Reframe Brad's book as house accounts: the firm's own client
-- relationships, always worked together with a helper (Reid, and/or
-- Joe/Matt). Brad has no personal figure of his own -- every one of his
-- rows has a helper on it, so his Personal naturally computes to $0
-- under the existing "solo only" rule, with his ~$545k all showing as
-- Total. Reid never owns a search of his own either -- his whole YTD is
-- helper credit off Brad's rows, so his prior standalone rows (and
-- Matt's old Joe-shared rows, which served the same purpose before) are
-- no longer needed. Justice billed $0 all year.
--
-- Billed YTD = Joe's own ~$290,875 + Matt's own ~$33,750 + Brad's ~$545k
-- house pool -- Reid and Justice add nothing extra on top, since their
-- whole contribution already lives inside Brad's number. No code change
-- needed: Personal/Total/company-total all already compute correctly
-- from the `team` array alone.

-- Matt's previous Joe-shared rows are superseded by Brad's rows below.
DELETE FROM billings WHERE id IN ('smpl-2026-b-042','smpl-2026-b-043','smpl-2026-b-044','smpl-2026-b-045','smpl-2026-b-046');
DELETE FROM pipeline_entries WHERE id IN ('smpl-2026-e-026','smpl-2026-e-027','smpl-2026-e-028','smpl-2026-e-029','smpl-2026-e-030');

-- Reid no longer owns any searches of his own -- all his credit comes
-- from helping on Brad's house-account rows below.
DELETE FROM billings WHERE id IN ('smpl-2026-b-029','smpl-2026-b-030','smpl-2026-b-031','smpl-2026-b-032','smpl-2026-b-033','smpl-2026-b-034','smpl-2026-b-035');
DELETE FROM pipeline_entries WHERE id IN ('smpl-2026-e-018','smpl-2026-e-019','smpl-2026-e-020','smpl-2026-e-021','smpl-2026-e-022','smpl-2026-e-023','smpl-2026-e-024');

-- Justice billed $0 all year (he still has one active, unbilled send-out).
DELETE FROM billings WHERE id IN ('smpl-2026-b-053','smpl-2026-b-054','smpl-2026-b-055','smpl-2026-b-056','smpl-2026-b-057','smpl-2026-b-058','smpl-2026-b-059');
DELETE FROM pipeline_entries WHERE id IN ('smpl-2026-e-032','smpl-2026-e-033','smpl-2026-e-034','smpl-2026-e-035','smpl-2026-e-036','smpl-2026-e-037','smpl-2026-e-038');

-- Brad's rows become house accounts, always shared with a helper.
UPDATE billings SET amount = 85000, team = ARRAY['Brad','Reid'] WHERE id = 'smpl-2026-b-001';
UPDATE billings SET amount = 80000, team = ARRAY['Brad','Reid'] WHERE id = 'smpl-2026-b-002';
UPDATE billings SET amount = 40000, team = ARRAY['Brad','Reid'] WHERE id = 'smpl-2026-b-003';
UPDATE billings SET amount = 70000, team = ARRAY['Brad','Reid','Joe'] WHERE id = 'smpl-2026-b-004';
UPDATE billings SET amount = 90000, team = ARRAY['Brad','Joe'] WHERE id = 'smpl-2026-b-005';
UPDATE billings SET amount = 60000, team = ARRAY['Brad','Matt'] WHERE id = 'smpl-2026-b-006';
UPDATE billings SET amount = 50000, team = ARRAY['Brad','Matt'] WHERE id = 'smpl-2026-b-007';
UPDATE billings SET amount = 60000, team = ARRAY['Brad','Reid'] WHERE id = 'smpl-2026-b-008';
UPDATE billings SET amount = 10000, team = ARRAY['Brad','Reid'] WHERE id = 'smpl-2026-b-009';

-- Keep the linked send-outs in sync with who actually shares each deal.
UPDATE pipeline_entries SET team = ARRAY['Brad','Reid']
  WHERE id IN ('smpl-2026-e-001','smpl-2026-e-002','smpl-2026-e-003','smpl-2026-e-008','smpl-2026-e-009');
UPDATE pipeline_entries SET team = ARRAY['Brad','Reid','Joe'] WHERE id = 'smpl-2026-e-004';
UPDATE pipeline_entries SET team = ARRAY['Brad','Joe'] WHERE id = 'smpl-2026-e-005';
UPDATE pipeline_entries SET team = ARRAY['Brad','Matt'] WHERE id IN ('smpl-2026-e-006','smpl-2026-e-007');

-- Reid is never solo elsewhere either.
UPDATE pipeline_entries SET team = ARRAY['Reid','Joe'] WHERE id = 'smpl-2026-e-041';
