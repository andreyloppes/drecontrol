-- 2026-06-21
-- (1) Corrige bug: recurring_templates e budget_plans estavam com RLS ligado
--     SEM policy de INSERT/UPDATE -> criar template/plano pela UI falhava.
--     Replica o mesmo stance permissivo da tabela transactions.
-- (2) Insere os 3 lançamentos recorrentes de trabalho (reembolso + tetos).
-- Rodar no Supabase Dashboard > SQL Editor (projeto rupqnxyohuekhdfhiplx).

-- ---- (1) Policies permissivas (igual transactions) ----
ALTER TABLE recurring_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "recurring_templates_all" ON recurring_templates;
CREATE POLICY "recurring_templates_all" ON recurring_templates
  FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE budget_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "budget_plans_all" ON budget_plans;
CREATE POLICY "budget_plans_all" ON budget_plans
  FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE budget_goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "budget_goals_all" ON budget_goals;
CREATE POLICY "budget_goals_all" ON budget_goals
  FOR ALL USING (true) WITH CHECK (true);

-- ---- (2) Templates recorrentes de trabalho (a partir de ago/2026) ----
-- Julho/2026 já está lançado manualmente; start_month = 2026-08 evita duplicar.
INSERT INTO recurring_templates (description, amount, type, category, day_of_month, start_month, active)
VALUES
  ('Reembolso MÁXIMO — teto R$1.452/mês (comida R$660 + transporte R$792, 22 dias úteis). Só reembolsa o que gastar até o teto',
     1452, 'recorrencia', 'Reembolso',    5, '2026-08', true),
  ('Transporte trabalho — TETO R$36/dia = R$792/mês (22 dias). Tudo ACIMA sai do bolso',
     -792, 'despesa',     'Transporte',   5, '2026-08', true),
  ('Alimentação trabalho — TETO R$30/dia = R$660/mês (marmita). Acima sai do bolso',
     -660, 'despesa',     'Alimentação',  5, '2026-08', true);
