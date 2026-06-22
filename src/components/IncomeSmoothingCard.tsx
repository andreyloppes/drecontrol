import { memo, useMemo } from 'react';
import { Banknote, ArrowUpRight, ArrowDownRight, Waves } from 'lucide-react';
import { useFinanceContext } from '@/context/FinanceContext';
import { formatCurrency } from '@/lib/format';
import type { Transaction } from '@/types/finance';

const pad = (n: number) => String(n).padStart(2, '0');
const brl0 = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);
const FATOR_SALARIO = 0.8; // se paga 80% da média; o resto é colchão pros meses fracos

/**
 * IncomeSmoothingCard (Onda 6) — "salário que você se paga".
 * Para renda volátil: calcula a média dos últimos 6 meses e sugere um salário-base fixo
 * (80% da média). Nos meses bons você guarda o excedente; nos fracos, saca do colchão.
 * É o método dos autônomos pra parar de viver na montanha-russa.
 */
export const IncomeSmoothingCard = memo(function IncomeSmoothingCard() {
  const { transactions, selectedMonth, selectedMonthStats } = useFinanceContext();

  const d = useMemo(() => {
    const shift = (m: string, k: number) => {
      const [y, mm] = m.split('-').map(Number);
      const x = new Date(Date.UTC(y, mm - 1 + k, 1));
      return `${x.getUTCFullYear()}-${pad(x.getUTCMonth() + 1)}`;
    };
    const recebidoNoMes = (m: string) =>
      transactions
        .filter((t: Transaction) => t.month === m && t.type !== 'despesa' && t.status === 'recebido')
        .reduce((a, t) => a + Number(t.amount), 0);

    const meses = [-5, -4, -3, -2, -1, 0].map((k) => shift(selectedMonth, k));
    const valores = meses.map(recebidoNoMes).filter((v) => v > 0);
    if (valores.length < 2) return null;

    const media = valores.reduce((a, v) => a + v, 0) / valores.length;
    const min = Math.min(...valores);
    const max = Math.max(...valores);
    const salarioBase = media * FATOR_SALARIO;
    const esteMes = selectedMonthStats.recebido;
    const diff = esteMes - salarioBase;

    return { media, min, max, salarioBase, esteMes, diff, n: valores.length };
  }, [transactions, selectedMonth, selectedMonthStats]);

  if (!d) return null;

  const guardar = d.diff >= 0;

  return (
    <section className="glass rounded-3xl p-6 border border-white/5" aria-labelledby="salario-title">
      <div className="flex items-center gap-2 mb-5">
        <div className="h-1 w-8 bg-cyan-500 rounded-full" />
        <h2 id="salario-title" className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
          Seu salário-base · renda variável
        </h2>
      </div>

      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-1">Pague-se por mês</p>
          <p className="text-4xl font-bold tracking-tight text-cyan-300">{brl0(d.salarioBase)}</p>
          <p className="text-xs text-muted-foreground mt-1.5">80% da sua média ({brl0(d.media)}/mês). O resto é colchão.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground glass rounded-2xl px-3 py-2 border border-white/5">
          <Waves className="w-4 h-4 text-purple-400" aria-hidden="true" />
          <span>Variou de <strong className="text-foreground">{brl0(d.min)}</strong> a <strong className="text-foreground">{brl0(d.max)}</strong> em {d.n} meses</span>
        </div>
      </div>

      <div className={`mt-5 rounded-2xl p-4 flex items-center gap-3 ${guardar ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-amber-500/10 border border-amber-500/20'}`}>
        {guardar ? <ArrowUpRight className="w-5 h-5 text-emerald-400 shrink-0" aria-hidden="true" /> : <ArrowDownRight className="w-5 h-5 text-amber-400 shrink-0" aria-hidden="true" />}
        <div>
          <p className="text-sm font-bold">
            {guardar
              ? `Mês bom: guarde ${formatCurrency(Math.abs(d.diff))} no colchão`
              : `Mês fraco: complete ${formatCurrency(Math.abs(d.diff))} do colchão`}
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Banknote className="w-3.5 h-3.5" aria-hidden="true" />
            Você recebeu {formatCurrency(d.esteMes)} este mês {guardar ? 'acima' : 'abaixo'} do seu salário-base.
          </p>
        </div>
      </div>
    </section>
  );
});
