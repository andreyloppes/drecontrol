import { memo, useMemo } from 'react';
import { LifeBuoy, PiggyBank, Receipt, AlertTriangle } from 'lucide-react';
import { useFinanceContext } from '@/context/FinanceContext';
import { formatCurrency } from '@/lib/format';
import type { Transaction } from '@/types/finance';

/**
 * CopilotPanel — os números PROSPECTIVOS que faltavam (a home era só "retrovisor").
 * Mostra apenas o que é honesto com os dados atuais:
 *  1. Fôlego (runway)        — se a renda parar, quantos meses você aguenta
 *  2. Reserva (meses)        — quantos meses de custo já estão cobertos (meta: 6)
 *  3. Custo de vida médio    — quanto seu mês realmente custa (base de tudo)
 *
 * NÃO mostra "safe-to-spend / pode gastar por dia": esse número exige o SALDO REAL
 * da conta, que o app ainda não captura de forma confiável (openingBalance é manual).
 * Dar um "pode gastar R$X" sobre dado impreciso seria irresponsável — fica pra próxima onda.
 */

const MESES_ALVO_RESERVA = 6;
const isReserva = (t: Transaction) => (t.category || '').toLowerCase().includes('reserva');

export const CopilotPanel = memo(function CopilotPanel() {
  const { transactions, selectedMonth, openingBalance } = useFinanceContext();

  const d = useMemo(() => {
    const shift = (m: string, delta: number) => {
      const [y, mm] = m.split('-').map(Number);
      const x = new Date(Date.UTC(y, mm - 1 + delta, 1));
      return `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, '0')}`;
    };

    // Custo de vida médio = despesas (sem aportes de reserva) dos 3 meses anteriores
    const meses3 = [shift(selectedMonth, -3), shift(selectedMonth, -2), shift(selectedMonth, -1)];
    const custos = meses3
      .map((m) =>
        transactions
          .filter((t) => t.month === m && t.type === 'despesa' && t.status !== 'cancelado' && !isReserva(t))
          .reduce((a, t) => a + Math.abs(Number(t.amount)), 0)
      )
      .filter((v) => v > 0);
    const custoMedio = custos.length ? custos.reduce((a, v) => a + v, 0) / custos.length : 0;

    // Reserva já guardada = aportes realizados na categoria Reserva
    const reservaGuardada = transactions
      .filter((t) => isReserva(t) && t.status === 'recebido')
      .reduce((a, t) => a + Math.abs(Number(t.amount)), 0);

    // Fôlego / runway = liquidez (caixa + reserva) / custo médio
    const liquidez = openingBalance + reservaGuardada;
    const runway = custoMedio > 0 ? liquidez / custoMedio : null;

    const mesesCobertos = custoMedio > 0 ? reservaGuardada / custoMedio : 0;
    const pctReserva = Math.min(100, (mesesCobertos / MESES_ALVO_RESERVA) * 100);

    return { custoMedio, reservaGuardada, runway, mesesCobertos, pctReserva };
  }, [transactions, selectedMonth, openingBalance]);

  const runway = d.runway;
  const runwayCor = runway === null ? 'text-muted-foreground' : runway >= 6 ? 'text-emerald-400' : runway >= 3 ? 'text-amber-400' : 'text-red-400';
  const runwayBorda = runway !== null && runway < 1 ? 'border-red-500/25' : runway !== null && runway < 3 ? 'border-amber-500/20' : 'border-white/5';

  return (
    <section aria-labelledby="copilot-title" className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="h-1 w-8 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full" />
        <h2 id="copilot-title" className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
          Copiloto · onde você está
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Fôlego (runway) — protagonista */}
        <div className={`col-span-2 glass rounded-3xl p-5 border ${runwayBorda} relative overflow-hidden`}>
          <div className="flex items-center gap-2 mb-2">
            <LifeBuoy className="w-4 h-4 text-cyan-400" aria-hidden="true" />
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
              Fôlego — se a renda parar hoje
            </span>
          </div>
          {runway === null ? (
            <>
              <p className="text-4xl font-bold tracking-tight text-muted-foreground">—</p>
              <p className="text-xs text-muted-foreground mt-1.5">Sem histórico de custo suficiente ainda</p>
            </>
          ) : (
            <>
              <p className={`text-4xl font-bold tracking-tight ${runwayCor}`}>
                {runway < 1 ? (
                  <>menos de 1<span className="text-lg text-muted-foreground font-normal"> mês</span></>
                ) : (
                  <>{runway.toFixed(1).replace('.0', '')}<span className="text-lg text-muted-foreground font-normal"> {runway < 2 ? 'mês' : 'meses'}</span></>
                )}
              </p>
              <p className="text-xs text-muted-foreground mt-1.5 flex items-start gap-1.5">
                {runway < 3 && <AlertTriangle className="w-3.5 h-3.5 text-red-400 mt-px shrink-0" aria-hidden="true" />}
                <span>
                  {runway < 3
                    ? 'Você sobreviveria pouco tempo sem renda. Sua prioridade nº1 é a reserva.'
                    : 'Quanto tempo seu caixa + reserva cobrem o custo de vida.'}
                </span>
              </p>
            </>
          )}
        </div>

        {/* Reserva em meses cobertos */}
        <div className="glass rounded-3xl p-5 border border-white/5">
          <div className="flex items-center gap-2 mb-2">
            <PiggyBank className="w-4 h-4 text-purple-400" aria-hidden="true" />
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Reserva</span>
          </div>
          <p className="text-3xl font-bold tracking-tight text-purple-300">
            {d.mesesCobertos.toFixed(1).replace('.0', '')}
            <span className="text-sm text-muted-foreground font-normal">/{MESES_ALVO_RESERVA}</span>
          </p>
          <div className="relative h-2 w-full rounded-full bg-white/5 overflow-hidden mt-2.5">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-500 to-cyan-400 transition-all duration-500"
              style={{ width: `${d.pctReserva}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">
            {d.reservaGuardada > 0 ? `${formatCurrency(d.reservaGuardada)} guardados` : 'Comece a guardar'}
          </p>
        </div>

        {/* Custo de vida médio */}
        <div className="glass rounded-3xl p-5 border border-white/5">
          <div className="flex items-center gap-2 mb-2">
            <Receipt className="w-4 h-4 text-amber-400" aria-hidden="true" />
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Custo de vida</span>
          </div>
          <p className="text-2xl font-bold tracking-tight">
            {d.custoMedio > 0
              ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(d.custoMedio)
              : '—'}
            <span className="text-sm text-muted-foreground font-normal">/mês</span>
          </p>
          <p className="text-xs text-muted-foreground mt-2.5">
            {d.custoMedio > 0 ? 'Quanto seu mês realmente custa (média 3 meses)' : 'Sem histórico ainda'}
          </p>
        </div>
      </div>
    </section>
  );
});
