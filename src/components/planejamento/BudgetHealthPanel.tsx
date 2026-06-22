import { BudgetHealthReport } from '@/hooks/useBudgetPlans';
import { formatCurrency } from '@/lib/format';
import { AlertTriangle, CheckCircle2, Info, TrendingDown, TrendingUp } from 'lucide-react';

interface Props {
  report: BudgetHealthReport;
  reservePct: number;
  tithePct: number;
}

export function BudgetHealthPanel({ report, reservePct, tithePct }: Props) {
  const {
    plannedIncome, plannedExpense, plannedBalance,
    realizedIncome, realizedExpense, realizedBalance,
    forecastIncome, forecastExpense, forecastBalance,
    reserveTarget, titheTarget, overBudget, tips,
  } = report;

  const plannedSavingsRate = plannedIncome > 0 ? (plannedBalance / plannedIncome) * 100 : 0;
  const realizedSavingsRate = realizedIncome > 0 ? (realizedBalance / realizedIncome) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Metric
          label="Receita Planejada"
          value={plannedIncome}
          realized={realizedIncome}
          forecast={forecastIncome}
          tone="positive"
        />
        <Metric
          label="Despesa Planejada"
          value={plannedExpense}
          realized={realizedExpense}
          forecast={forecastExpense}
          tone="negative"
        />
        <Metric
          label="Saldo Planejado"
          value={plannedBalance}
          realized={realizedBalance}
          forecast={forecastBalance}
          tone={plannedBalance >= 0 ? 'positive' : 'negative'}
          signed
        />
        <div className="glass rounded-2xl p-4 border border-white/5">
          <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Taxa de Poupança</div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold tabular-nums">{plannedSavingsRate.toFixed(0)}%</span>
            <span className="text-xs text-muted-foreground">plan</span>
          </div>
          <div className="text-xs mt-1 text-muted-foreground">
            Realizada: <span className="font-mono">{realizedSavingsRate.toFixed(0)}%</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <GoalCard
          label={`Reserva (${reservePct}%)`}
          target={reserveTarget}
          actual={realizedBalance}
          icon={<TrendingUp className="w-4 h-4 text-emerald-400" />}
        />
        <GoalCard
          label={`Dízimo (${tithePct}%)`}
          target={titheTarget}
          actual={0}
          icon={<Info className="w-4 h-4 text-cyan-400" />}
          neutral
        />
      </div>

      {tips.length > 0 && (
        <div className="glass rounded-2xl p-4 border border-white/5 space-y-2">
          <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">
            Insights Automáticos
          </div>
          {tips.map(t => (
            <div
              key={t.id}
              className={`flex gap-2 text-xs px-3 py-2 rounded-xl border ${
                t.severity === 'warn'
                  ? 'bg-amber-500/5 border-amber-500/20 text-amber-200'
                  : t.severity === 'ok'
                  ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-200'
                  : 'bg-cyan-500/5 border-cyan-500/20 text-cyan-200'
              }`}
            >
              {t.severity === 'warn' ? <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" /> :
                t.severity === 'ok' ? <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" /> :
                <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />}
              <span>{t.message}</span>
            </div>
          ))}
        </div>
      )}

      {overBudget.length > 0 && (
        <div className="glass rounded-2xl p-4 border border-white/5">
          <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
            <TrendingDown className="w-3.5 h-3.5 text-red-400" /> Acima do planejado
          </div>
          <div className="space-y-2">
            {overBudget.slice(0, 5).map(ob => (
              <div key={ob.category} className="flex items-center justify-between text-xs">
                <span className="font-mono truncate">{ob.category}</span>
                <span className="text-red-300 tabular-nums">
                  {formatCurrency(ob.actual)} / {formatCurrency(ob.planned)} · {ob.pct.toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  realized,
  forecast,
  tone,
  signed = false,
}: {
  label: string;
  value: number;
  realized: number;
  forecast: number;
  tone: 'positive' | 'negative';
  signed?: boolean;
}) {
  // Barra mostra realizado (sólido) + previsto (tracejado) relativo ao planejado.
  const denom = Math.abs(value) || 0;
  const realizedPct = denom > 0 ? Math.min((Math.abs(realized) / denom) * 100, 100) : 0;
  const forecastPct = denom > 0 ? Math.min((Math.abs(forecast) / denom) * 100, 100 - realizedPct) : 0;
  const tint = tone === 'positive' ? 'text-emerald-400' : 'text-red-400';
  const barSolid = tone === 'positive' ? 'bg-emerald-400/70' : 'bg-red-400/70';
  const barForecast = tone === 'positive' ? 'bg-emerald-400/25' : 'bg-red-400/25';
  const fmt = (n: number) => (signed && n !== 0 ? (n > 0 ? '+' : '') : '') + formatCurrency(n);
  return (
    <div className="glass rounded-2xl p-4 border border-white/5">
      <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-2 text-xl font-bold tabular-nums">{formatCurrency(value)}</div>
      <div className="text-xs mt-1 space-y-0.5">
        <div className="text-muted-foreground">
          Realizado: <span className={`font-mono ${tint}`}>{fmt(realized)}</span>
        </div>
        <div className="text-muted-foreground">
          Previsto: <span className="font-mono text-muted-foreground">{fmt(forecast)}</span>
        </div>
      </div>
      <div className="flex h-1 rounded-full bg-white/5 mt-2 overflow-hidden">
        <div className={`h-full ${barSolid}`} style={{ width: `${realizedPct}%` }} />
        <div className={`h-full ${barForecast}`} style={{ width: `${forecastPct}%` }} />
      </div>
    </div>
  );
}

function GoalCard({ label, target, actual, icon, neutral = false }: { label: string; target: number; actual: number; icon: React.ReactNode; neutral?: boolean }) {
  const rawPct = target > 0 ? (actual / target) * 100 : 0;
  const displayPct = Math.min(Math.max(rawPct, 0), 100);
  const reached = actual >= target && target > 0;
  return (
    <div className="glass rounded-2xl p-4 border border-white/5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{label}</span>
        </div>
        {!neutral && reached && (
          <span className="text-[10px] font-mono text-emerald-400 uppercase">Atingido</span>
        )}
      </div>
      <div className="text-xl font-bold tabular-nums">{formatCurrency(target)}</div>
      {!neutral && (
        <>
          <div className="text-xs text-muted-foreground mt-1">
            Atual: <span className="font-mono">{formatCurrency(Math.max(actual, 0))}</span>
            {reached ? (
              <span className="ml-1 text-emerald-400">· meta batida</span>
            ) : (
              <span> · {displayPct.toFixed(0)}%</span>
            )}
          </div>
          <div className="h-1 rounded-full bg-white/5 mt-2 overflow-hidden">
            <div className="h-full bg-emerald-400/60" style={{ width: `${displayPct}%` }} />
          </div>
        </>
      )}
    </div>
  );
}
