import { memo, useMemo } from 'react';
import { TrendingUp, Target, PiggyBank, Percent } from 'lucide-react';
import { useFinanceContext } from '@/context/FinanceContext';
import { formatCurrency } from '@/lib/format';
import type { Transaction } from '@/types/finance';

/** Shifts a "YYYY-MM" string by N months. UTC para evitar drift de fuso. */
function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Label pt-BR curto "abr/25" */
function shortMonthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1, 1));
  return d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit', timeZone: 'UTC' }).replace('.', '');
}

function recebidoNoMes(transactions: Transaction[], month: string): number {
  return transactions
    .filter((t) => t.month === month && t.status !== 'cancelado' && t.type !== 'despesa' && t.status === 'recebido')
    .reduce((acc, t) => acc + Number(t.amount), 0);
}

export const AnalyticsPanel = memo(function AnalyticsPanel() {
  const { transactions, selectedMonth } = useFinanceContext();

  // 1. Top categoria de despesa do mês
  const topExpenseCategories = useMemo(() => {
    const map = new Map<string, number>();
    transactions
      .filter((t) => t.month === selectedMonth && t.type === 'despesa' && t.status !== 'cancelado')
      .forEach((t) => {
        const key = (t.category || 'Sem categoria').trim() || 'Sem categoria';
        map.set(key, (map.get(key) || 0) + Math.abs(Number(t.amount)));
      });
    return Array.from(map.entries())
      .map(([category, value]) => ({ category, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [transactions, selectedMonth]);

  // 2. Média móvel de receita recebida (3 meses)
  const movingAverage = useMemo(() => {
    const months = [shiftMonth(selectedMonth, -2), shiftMonth(selectedMonth, -1), selectedMonth];
    const values = months.map((m) => recebidoNoMes(transactions, m));
    return { average: values.reduce((a, v) => a + v, 0) / 3, months };
  }, [transactions, selectedMonth]);

  // 3. Taxa de poupança do mês = (receita - despesa) / receita
  const savings = useMemo(() => {
    const mes = transactions.filter((t) => t.month === selectedMonth && t.status !== 'cancelado');
    const receita = mes.filter((t) => t.type !== 'despesa').reduce((a, t) => a + Number(t.amount), 0);
    const despesa = mes.filter((t) => t.type === 'despesa').reduce((a, t) => a + Math.abs(Number(t.amount)), 0);
    const saldo = receita - despesa;
    return { receita, saldo, rate: receita > 0 ? (saldo / receita) * 100 : null };
  }, [transactions, selectedMonth]);

  // 4. Quanto foi guardado em Reserva no mês (categoria "Reserva")
  const reserva = useMemo(() => {
    return transactions
      .filter((t) => t.month === selectedMonth && t.status !== 'cancelado' && (t.category || '').toLowerCase().includes('reserva'))
      .reduce((a, t) => a + Math.abs(Number(t.amount)), 0);
  }, [transactions, selectedMonth]);

  const topCategory = topExpenseCategories[0];

  return (
    <section className="glass rounded-3xl p-6 border border-white/5" aria-labelledby="analytics-panel-title">
      <div className="flex items-center gap-2 mb-6">
        <div className="h-1 w-8 bg-cyan-500 rounded-full" />
        <h2 id="analytics-panel-title" className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
          Indicadores do Mês
        </h2>
      </div>

      <div className="divide-y divide-white/5">
        {/* 1 — Top categoria */}
        <StatRow
          icon={<Target className="w-4 h-4 text-amber-400" aria-hidden="true" />}
          label="Maior categoria de gasto"
          value={topCategory ? `${topCategory.category} · ${formatCurrency(topCategory.value)}` : 'Sem despesas'}
          context={
            topExpenseCategories.length > 1
              ? `Seguida por: ${topExpenseCategories.slice(1, 4).map((c) => c.category).join(', ')}`
              : 'Única categoria do mês'
          }
        />

        {/* 2 — Média móvel de receita */}
        <StatRow
          icon={<TrendingUp className="w-4 h-4 text-emerald-400" aria-hidden="true" />}
          label="Média de receita (3 meses)"
          value={formatCurrency(movingAverage.average)}
          context={`Base: ${movingAverage.months.map((m) => shortMonthLabel(m)).join(' · ')}`}
        />

        {/* 3 — Taxa de poupança */}
        <StatRow
          icon={<Percent className="w-4 h-4 text-cyan-400" aria-hidden="true" />}
          label="Taxa de poupança do mês"
          value={
            savings.rate === null ? (
              'Sem receita'
            ) : (
              <span className={savings.rate >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                {savings.rate.toFixed(0)}%
              </span>
            )
          }
          context={savings.rate === null ? 'Cadastre a receita do mês' : `Sobrou ${formatCurrency(savings.saldo)} da receita`}
        />

        {/* 4 — Reserva guardada */}
        <StatRow
          icon={<PiggyBank className="w-4 h-4 text-purple-400" aria-hidden="true" />}
          label="Guardado em reserva"
          value={
            reserva > 0 ? (
              <span className="text-purple-400">{formatCurrency(reserva)}</span>
            ) : (
              'Nada este mês'
            )
          }
          context={reserva > 0 ? 'Aporte na reserva de emergência' : 'Crie um lançamento na categoria Reserva'}
        />
      </div>
    </section>
  );
});

interface StatRowProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  context: React.ReactNode;
}

function StatRow({ icon, label, value, context }: StatRowProps) {
  return (
    <div className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
      <div className="flex-shrink-0 w-9 h-9 rounded-xl glass border border-white/5 flex items-center justify-center">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] md:text-xs uppercase tracking-wide text-muted-foreground mb-1 font-semibold">
          {label}
        </p>
        <p className="text-sm md:text-base font-bold tracking-tight truncate">{value}</p>
      </div>
      <div className="hidden sm:block flex-shrink-0 text-right max-w-[40%]">
        <p className="text-[10px] md:text-xs text-muted-foreground truncate">{context}</p>
      </div>
    </div>
  );
}
