-- Planejamento mensal por categoria + metas de reserva/dízimo.
-- Uma linha por (month, category, type). Upsert-friendly.

CREATE TABLE IF NOT EXISTS budget_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month TEXT NOT NULL,
  category TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('projeto', 'recorrencia', 'despesa')),
  planned_amount NUMERIC NOT NULL DEFAULT 0,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (month, category, type)
);

CREATE INDEX IF NOT EXISTS budget_plans_month_idx ON budget_plans (month);

-- Metas por mês (reserva, dízimo). Uma linha por mês.
CREATE TABLE IF NOT EXISTS budget_goals (
  month TEXT PRIMARY KEY,
  reserve_pct NUMERIC NOT NULL DEFAULT 0,
  tithe_pct NUMERIC NOT NULL DEFAULT 0,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
