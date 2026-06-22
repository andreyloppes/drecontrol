import { memo, useMemo } from 'react';
import { Area, AreaChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { parseISO, addDays, eachDayOfInterval, format, isSameDay, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useFinanceContext } from '@/context/FinanceContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { AlertTriangle, TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/lib/format';

const abbrev = (v: number): string => {
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(1).replace('.0', '')}K`;
  return String(Math.round(v));
};
const brl0 = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);

/**
 * ForecastChart (Onda 3) — projeção do saldo nos próximos 90 dias.
 * Parte do saldo REAL de hoje e acumula todos os lançamentos futuros (previstos/recorrentes
 * já materializados). Mostra a linha de saldo com a linha de perigo no zero e destaca o
 * pior dia (menor saldo) — responde "vou ter dinheiro até lá?".
 */
export const ForecastChart = memo(function ForecastChart() {
  const { transactions, realBalance, openingBalance } = useFinanceContext();
  const isMobile = useIsMobile();

  const { serie, menor, saldoFinal, saldoInicial, temDado } = useMemo(() => {
    const hoje = startOfDay(new Date());
    const fim = addDays(hoje, 90);
    const saldoInicial = realBalance ?? openingBalance;

    const eventos = transactions
      .filter((t) => {
        if (t.status === 'cancelado') return false;
        const dt = parseISO(t.date);
        return dt >= hoje && dt <= fim;
      })
      .map((t) => ({ dt: parseISO(t.date), amount: Number(t.amount) }));

    const dias = eachDayOfInterval({ start: hoje, end: fim });
    let saldo = saldoInicial;
    let menor = { saldo: saldoInicial, date: hoje };
    const serie = dias.map((dia) => {
      const doDia = eventos.filter((e) => isSameDay(e.dt, dia));
      saldo += doDia.reduce((a, e) => a + e.amount, 0);
      if (saldo < menor.saldo) menor = { saldo, date: dia };
      return {
        date: format(dia, 'yyyy-MM-dd'),
        label: format(dia, 'dd/MM', { locale: ptBR }),
        saldo: Math.round(saldo * 100) / 100,
      };
    });

    return {
      serie,
      menor,
      saldoFinal: saldo,
      saldoInicial,
      temDado: eventos.length > 0,
    };
  }, [transactions, realBalance, openingBalance]);

  const ficaNegativo = menor.saldo < 0;
  const corLinha = ficaNegativo ? '#f87171' : '#34d399';

  return (
    <div className="glass rounded-3xl p-5 border border-white/5 space-y-4">
      <div>
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-cyan-400" aria-hidden="true" />
          <h3 className="text-base font-bold tracking-tight">Projeção — próximos 90 dias</h3>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Seu saldo daqui pra frente, a partir de {formatCurrency(saldoInicial)} hoje.
        </p>
      </div>

      {!temDado ? (
        <div className="py-10 text-center text-sm text-muted-foreground">
          Sem lançamentos futuros pra projetar. Cadastre recorrências ou previstos.
        </div>
      ) : (
        <>
          {/* Destaque: pior dia e saldo final */}
          <div className="grid grid-cols-2 gap-3">
            <div className={`rounded-2xl p-3 border ${ficaNegativo ? 'border-red-500/25 bg-red-500/5' : 'border-white/5'}`}>
              <div className="flex items-center gap-1.5 mb-1">
                {ficaNegativo && <AlertTriangle className="w-3.5 h-3.5 text-red-400" aria-hidden="true" />}
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Pior dia</span>
              </div>
              <p className={`text-lg font-bold ${ficaNegativo ? 'text-red-400' : 'text-foreground'}`}>{brl0(menor.saldo)}</p>
              <p className="text-[11px] text-muted-foreground">{format(menor.date, "dd 'de' MMM", { locale: ptBR })}</p>
            </div>
            <div className="rounded-2xl p-3 border border-white/5">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Em 90 dias</span>
              <p className={`text-lg font-bold ${saldoFinal >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{brl0(saldoFinal)}</p>
              <p className="text-[11px] text-muted-foreground">se nada mudar</p>
            </div>
          </div>

          <div style={{ height: isMobile ? 200 : 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={serie} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="forecastFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={corLinha} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={corLinha} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: isMobile ? 9 : 11 }}
                  interval={isMobile ? 20 : 13}
                  dy={8}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: isMobile ? 9 : 11 }}
                  tickFormatter={abbrev}
                  width={isMobile ? 38 : 52}
                />
                <ReferenceLine y={0} stroke="#f87171" strokeWidth={1.5} strokeDasharray="4 4" />
                <Tooltip
                  contentStyle={{ backgroundColor: 'rgba(3,7,18,0.9)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.1)' }}
                  labelStyle={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}
                  formatter={(v: number) => [formatCurrency(v), 'Saldo projetado']}
                  labelFormatter={(l) => `Dia ${l}`}
                />
                <Area type="monotone" dataKey="saldo" stroke={corLinha} strokeWidth={2.5} fill="url(#forecastFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {ficaNegativo && (
            <p className="text-xs text-red-300/90 flex items-start gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 mt-px shrink-0" aria-hidden="true" />
              Seu saldo cruza o zero em {format(menor.date, "dd/MM", { locale: ptBR })}. Antecipe receita ou segure gastos antes dessa data.
            </p>
          )}
        </>
      )}
    </div>
  );
});
