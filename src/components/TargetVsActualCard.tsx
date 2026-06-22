import { memo, useMemo } from 'react';
import { TrendingUp, TrendingDown, Wallet, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useFinanceContext } from '@/context/FinanceContext';
import { formatCurrency } from '@/lib/format';

/**
 * ResultadoDoMesCard
 * Responde a pergunta central de quem controla caixa: "vou sobrar ou faltar este mês?"
 * Mostra o saldo projetado do mês (receita - despesa), o status (fecha no azul/vermelho)
 * e o detalhamento já recebido vs. ainda a receber. Sem jargão, sem métrica de vaidade.
 */
export const TargetVsActualCard = memo(function TargetVsActualCard() {
  const { selectedMonthStats } = useFinanceContext();

  const { recebido, pendente, previsto, totalReceita, totalDespesa } = selectedMonthStats;
  const aReceber = pendente + previsto;

  const { saldo, isPositive, pctReceitaParaDespesa } = useMemo(() => {
    const s = totalReceita - totalDespesa;
    return {
      saldo: s,
      isPositive: s >= 0,
      // quanto da receita do mês já está comprometida com despesa (0–100+)
      pctReceitaParaDespesa: totalReceita > 0 ? Math.min(100, (totalDespesa / totalReceita) * 100) : 0,
    };
  }, [totalReceita, totalDespesa]);

  const isEmpty = totalReceita === 0 && totalDespesa === 0;

  return (
    <section
      className="glass rounded-3xl p-6 border border-white/5"
      aria-labelledby="resultado-mes-title"
    >
      <div className="flex items-center gap-2 mb-6">
        <div className={`h-1 w-8 rounded-full ${isPositive ? 'bg-emerald-500' : 'bg-red-500'}`} />
        <h2
          id="resultado-mes-title"
          className="text-xs uppercase tracking-wide text-muted-foreground font-semibold"
        >
          Resultado do Mês
        </h2>
      </div>

      {isEmpty ? (
        <div className="py-8 text-center">
          <Wallet
            className="w-8 h-8 mx-auto mb-3 text-muted-foreground opacity-50"
            aria-hidden="true"
          />
          <p className="text-sm text-muted-foreground">
            Nenhum lançamento neste mês ainda
          </p>
        </div>
      ) : (
        <>
          {/* Saldo projetado — o número que importa */}
          <div className="flex items-center gap-3 mb-1">
            <span
              className={`text-4xl md:text-5xl font-bold tracking-tight ${
                isPositive ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {saldo >= 0 ? '+' : ''}{formatCurrency(saldo)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mb-5">
            {isPositive ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" aria-hidden="true" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-400" aria-hidden="true" />
            )}
            <p className="text-sm text-muted-foreground">
              {isPositive
                ? 'O mês fecha no positivo'
                : 'Atenção: o mês fecha no vermelho'}
            </p>
          </div>

          {/* Barra: quanto da receita já foi comprometida com despesa */}
          <div
            role="progressbar"
            aria-label={`${Math.round(pctReceitaParaDespesa)}% da receita comprometida com despesas`}
            aria-valuenow={Math.round(pctReceitaParaDespesa)}
            aria-valuemin={0}
            aria-valuemax={100}
            className="relative h-3 w-full rounded-full bg-white/5 overflow-hidden mb-2"
          >
            <div
              className={`absolute inset-y-0 left-0 transition-all duration-500 ease-out ${
                pctReceitaParaDespesa >= 100 ? 'bg-red-500' : 'bg-gradient-to-r from-emerald-500 to-cyan-400'
              }`}
              style={{ width: `${pctReceitaParaDespesa}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mb-6">
            {Math.round(pctReceitaParaDespesa)}% da receita comprometida com despesas
          </p>

          {/* Detalhamento: já recebido / ainda a receber / despesa */}
          <div className="grid grid-cols-3 gap-3">
            <div className="glass rounded-2xl p-3 border border-emerald-500/20">
              <div className="flex items-center gap-1.5 mb-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                <span className="text-[10px] uppercase tracking-wide text-emerald-400 font-semibold">
                  Já recebido
                </span>
              </div>
              <p className="text-sm md:text-base font-bold truncate" title={formatCurrency(recebido)}>
                {formatCurrency(recebido)}
              </p>
            </div>

            <div className="glass rounded-2xl p-3 border border-amber-500/20">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Wallet className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                <span className="text-[10px] uppercase tracking-wide text-amber-400 font-semibold">
                  A receber
                </span>
              </div>
              <p className="text-sm md:text-base font-bold truncate" title={formatCurrency(aReceber)}>
                {formatCurrency(aReceber)}
              </p>
            </div>

            <div className="glass rounded-2xl p-3 border border-red-500/20">
              <div className="flex items-center gap-1.5 mb-1.5">
                <TrendingDown className="w-3.5 h-3.5 text-red-400" aria-hidden="true" />
                <span className="text-[10px] uppercase tracking-wide text-red-400 font-semibold">
                  Despesas
                </span>
              </div>
              <p className="text-sm md:text-base font-bold truncate" title={formatCurrency(totalDespesa)}>
                {formatCurrency(totalDespesa)}
              </p>
            </div>
          </div>
        </>
      )}
    </section>
  );
});
