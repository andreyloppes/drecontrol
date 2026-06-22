-- Adiciona modos de cálculo em budget_plans + agrupamento por seção.
-- Adiciona installment_id em transactions para agrupar parcelas.

ALTER TABLE budget_plans
  ADD COLUMN IF NOT EXISTS calc_mode TEXT NOT NULL DEFAULT 'fixed'
    CHECK (calc_mode IN ('fixed', 'per_workday', 'percent_income')),
  ADD COLUMN IF NOT EXISTS rate NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS section TEXT;

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS installment_id UUID,
  ADD COLUMN IF NOT EXISTS installment_total INT,
  ADD COLUMN IF NOT EXISTS installment_index INT;

CREATE INDEX IF NOT EXISTS transactions_installment_idx
  ON transactions (installment_id) WHERE installment_id IS NOT NULL;
