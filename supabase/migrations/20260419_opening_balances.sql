-- Saldos iniciais editáveis por mês, sincronizados entre dispositivos.
-- Execute no Supabase Dashboard > SQL Editor.

CREATE TABLE IF NOT EXISTS opening_balances (
  month TEXT PRIMARY KEY,
  value NUMERIC NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Manter comportamento atual (mesmo stance de RLS da tabela `transactions`).
-- Se você habilitou RLS na `transactions`, replique aqui:
--
--   ALTER TABLE opening_balances ENABLE ROW LEVEL SECURITY;
--   CREATE POLICY "opening_balances_all" ON opening_balances FOR ALL USING (true) WITH CHECK (true);
