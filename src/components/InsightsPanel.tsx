import { memo, useMemo } from 'react';
import { AlertTriangle, TrendingDown, TrendingUp, PiggyBank, CalendarClock, Flame, Info } from 'lucide-react';
import { useFinanceContext } from '@/context/FinanceContext';
import { formatCurrency } from '@/lib/format';
import type { Transaction } from '@/types/finance';

type Sev = 'alerta' | 'atencao' | 'info' | 'bom';
interface Insight { id: string; sev: Sev; icon: React.ReactNode; text: React.ReactNode; prio: number; }

const isReserva = (t: Transaction) => (t.category || '').toLowerCase().includes('reserva');
const pad = (n: number) => String(n).padStart(2, '0');

const SEV_STYLE: Record<Sev, string> = {
  alerta: 'border-red-500/25 bg-red-500/5',
  atencao: 'border-amber-500/20 bg-amber-500/5',
  info: 'border-white/5',
  bom: 'border-emerald-500/20 bg-emerald-500/5',
};

/**
 * InsightsPanel (Onda 5) — avisos proativos e determinísticos sobre o mês.
 * Sem IA: regras claras sobre os dados. Mostra só os 3 mais relevantes.
 */
export const InsightsPanel = memo(function InsightsPanel() {
  const { transactions, selectedMonth, selectedMonthStats } = useFinanceContext();

  const insights = useMemo(() => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
    const out: Insight[] = [];
    const mes = transactions.filter((t) => t.month === selectedMonth && t.status !== 'cancelado');

    const { totalReceita, totalDespesa, recebido } = selectedMonthStats;
    const saldo = totalReceita - totalDespesa;

    // 1. Gasta mais do que ganha
    if (totalDespesa > totalReceita && totalReceita > 0) {
      out.push({
        id: 'deficit', sev: 'alerta', prio: 100,
        icon: <TrendingDown className="w-4 h-4 text-red-400" aria-hidden="true" />,
        text: <>Este mês você gasta <strong>{formatCurrency(totalDespesa - totalReceita)}</strong> a mais do que recebe.</>,
      });
    } else if (saldo > 0 && totalReceita > 0) {
      out.push({
        id: 'sobra', sev: 'bom', prio: 30,
        icon: <TrendingUp className="w-4 h-4 text-emerald-400" aria-hidden="true" />,
        text: <>No ritmo atual, sobram <strong>{formatCurrency(saldo)}</strong> este mês.</>,
      });
    }

    // 2. Próxima conta grande (despesa prevista não paga, data futura)
    const proximas = mes
      .filter((t) => t.type === 'despesa' && (t.status === 'previsto' || t.status === 'pendente'))
      .sort((a, b) => Math.abs(Number(b.amount)) - Math.abs(Number(a.amount)));
    if (proximas[0]) {
      const c = proximas[0];
      const dia = c.date.slice(8, 10);
      out.push({
        id: 'proxima', sev: 'atencao', prio: 70,
        icon: <CalendarClock className="w-4 h-4 text-amber-400" aria-hidden="true" />,
        text: <><strong>{c.description}</strong> de {formatCurrency(Math.abs(Number(c.amount)))} ainda vai sair {selectedMonth === currentMonth ? `(dia ${dia})` : 'este mês'}.</>,
      });
    }

    // 3. Reserva do mês
    const aporteReserva = mes.filter(isReserva);
    const reservaPrevista = aporteReserva.filter((t) => t.status !== 'recebido').reduce((a, t) => a + Math.abs(Number(t.amount)), 0);
    const reservaFeita = aporteReserva.filter((t) => t.status === 'recebido').reduce((a, t) => a + Math.abs(Number(t.amount)), 0);
    if (reservaPrevista > 0) {
      out.push({
        id: 'reserva-falta', sev: 'atencao', prio: 60,
        icon: <PiggyBank className="w-4 h-4 text-purple-400" aria-hidden="true" />,
        text: <>Falta separar <strong>{formatCurrency(reservaPrevista)}</strong> pra reserva este mês.</>,
      });
    } else if (reservaFeita > 0) {
      out.push({
        id: 'reserva-ok', sev: 'bom', prio: 25,
        icon: <PiggyBank className="w-4 h-4 text-emerald-400" aria-hidden="true" />,
        text: <>Você já guardou <strong>{formatCurrency(reservaFeita)}</strong> pra reserva. 👏</>,
      });
    } else {
      out.push({
        id: 'reserva-zero', sev: 'atencao', prio: 50,
        icon: <PiggyBank className="w-4 h-4 text-amber-400" aria-hidden="true" />,
        text: <>Nenhum aporte de reserva este mês. Pague-se primeiro.</>,
      });
    }

    // 4. Maior categoria de gasto
    const cat = new Map<string, number>();
    mes.filter((t) => t.type === 'despesa' && !isReserva(t)).forEach((t) => {
      const k = (t.category || 'Sem categoria').trim() || 'Sem categoria';
      cat.set(k, (cat.get(k) || 0) + Math.abs(Number(t.amount)));
    });
    const top = [...cat.entries()].sort((a, b) => b[1] - a[1])[0];
    if (top && totalDespesa > 0) {
      const pct = Math.round((top[1] / totalDespesa) * 100);
      if (pct >= 25) {
        out.push({
          id: 'concentracao', sev: 'info', prio: 40,
          icon: <Flame className="w-4 h-4 text-orange-400" aria-hidden="true" />,
          text: <><strong>{top[0]}</strong> é {pct}% dos seus gastos ({formatCurrency(top[1])}).</>,
        });
      }
    }

    // 5. Receita ainda a receber
    const aReceber = selectedMonthStats.pendente + selectedMonthStats.previsto;
    if (aReceber > 0 && recebido > 0) {
      out.push({
        id: 'a-receber', sev: 'info', prio: 20,
        icon: <Info className="w-4 h-4 text-cyan-400" aria-hidden="true" />,
        text: <>Ainda entram <strong>{formatCurrency(aReceber)}</strong> este mês (se confirmar).</>,
      });
    }

    return out.sort((a, b) => b.prio - a.prio).slice(0, 3);
  }, [transactions, selectedMonth, selectedMonthStats]);

  if (insights.length === 0) return null;

  return (
    <section aria-labelledby="insights-title" className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="h-1 w-8 bg-amber-500 rounded-full" />
        <h2 id="insights-title" className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
          Pra você ficar de olho
        </h2>
      </div>
      <div className="grid gap-2">
        {insights.map((i) => (
          <div key={i.id} className={`glass rounded-2xl px-4 py-3 border flex items-center gap-3 ${SEV_STYLE[i.sev]}`}>
            <span className="shrink-0">{i.icon}</span>
            <p className="text-sm leading-snug">{i.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
});
