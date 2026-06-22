-- Templates de transações recorrentes (aluguel, salário fixo, assinaturas).
-- Geração automática: ao abrir um mês >= start_month e <= end_month (ou sem fim),
-- o cliente cria a Transaction correspondente com status='previsto' se ainda não existir.
-- Execute no Supabase Dashboard > SQL Editor.

CREATE TABLE IF NOT EXISTS recurring_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('projeto', 'recorrencia', 'despesa')),
  category TEXT NOT NULL DEFAULT '',
  day_of_month INT NOT NULL CHECK (day_of_month BETWEEN 1 AND 31),
  start_month TEXT NOT NULL,
  end_month TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS recurring_templates_active_idx
  ON recurring_templates (active, start_month);

-- Se você habilitou RLS na `transactions`, replique aqui:
--   ALTER TABLE recurring_templates ENABLE ROW LEVEL SECURITY;
--   CREATE POLICY "recurring_templates_all" ON recurring_templates FOR ALL USING (true) WITH CHECK (true);
