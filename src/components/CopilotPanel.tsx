import { memo, useMemo, useState } from 'react';
import { LifeBuoy, PiggyBank, Receipt, AlertTriangle, Coins, Landmark, Pencil, Plus } from 'lucide-react';
import { useFinanceContext } from '@/context/FinanceContext';
import { formatCurrency } from '@/lib/format';
import { maskBRCurrency, parseMaskedBRNumber, formatNumberToMask } from '@/lib/currency-mask';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { Transaction } from '@/types/finance';

/**
 * CopilotPanel (Onda 2) — agora ancorado no SALDO REAL da conta informado pelo usuário.
 *  • Pode gastar / dia (Safe-to-Spend) — honesto, parte do saldo real
 *  • Fôlego (runway) — meses que o saldo real cobre o custo de vida
 *  • Reserva (meses cobertos) e Custo de vida médio
 *  • Saldo na conta — editável, é a âncora de tudo
 */

const MESES_ALVO_RESERVA = 6;
const isReserva = (t: Transaction) => (t.category || '').toLowerCase().includes('reserva');
const pad = (n: number) => String(n).padStart(2, '0');
const brl0 = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);

export const CopilotPanel = memo(function CopilotPanel() {
  const { transactions, selectedMonth, openingBalance, realBalance, setRealBalance } = useFinanceContext();
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState('');

  const d = useMemo(() => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
    const isCurrentMonth = selectedMonth === currentMonth;
    const diasNoMes = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const diasRestantes = Math.max(1, diasNoMes - now.getDate() + 1);

    const shift = (m: string, delta: number) => {
      const [y, mm] = m.split('-').map(Number);
      const x = new Date(Date.UTC(y, mm - 1 + delta, 1));
      return `${x.getUTCFullYear()}-${pad(x.getUTCMonth() + 1)}`;
    };

    // Custo de vida = MEDIANA dos últimos 6 meses com movimento (mediana é robusta
    // a meses atípicos, ex: um mês com gasto pontual altíssimo não distorce).
    const meses6 = [-6, -5, -4, -3, -2, -1].map((k) => shift(selectedMonth, k));
    const custos = meses6
      .map((m) =>
        transactions
          .filter((t) => t.month === m && t.type === 'despesa' && t.status !== 'cancelado' && !isReserva(t))
          .reduce((a, t) => a + Math.abs(Number(t.amount)), 0)
      )
      .filter((v) => v > 0)
      .sort((a, b) => a - b);
    const custoMedio = custos.length
      ? custos.length % 2
        ? custos[(custos.length - 1) / 2]
        : (custos[custos.length / 2 - 1] + custos[custos.length / 2]) / 2
      : 0;

    // Reserva já guardada (aportes realizados)
    const reservaGuardada = transactions
      .filter((t) => isReserva(t) && t.status === 'recebido')
      .reduce((a, t) => a + Math.abs(Number(t.amount)), 0);

    // Fôlego/runway = saldo real (ou opening como fallback) + reserva / custo
    const liquidez = (realBalance ?? openingBalance) + reservaGuardada;
    const runway = custoMedio > 0 ? liquidez / custoMedio : null;

    const mesesCobertos = custoMedio > 0 ? reservaGuardada / custoMedio : 0;
    const pctReserva = Math.min(100, (mesesCobertos / MESES_ALVO_RESERVA) * 100);

    // Safe-to-Spend — só com saldo real informado e no mês corrente
    let safeToSpend: number | null = null;
    if (realBalance !== null && isCurrentMonth) {
      const naoPagas = transactions.filter(
        (t) => t.month === currentMonth && (t.status === 'previsto' || t.status === 'pendente')
      );
      const despesasFuturas = naoPagas.filter((t) => t.type === 'despesa').reduce((a, t) => a + Math.abs(Number(t.amount)), 0);
      const receitasFuturas = naoPagas.filter((t) => t.type !== 'despesa').reduce((a, t) => a + Number(t.amount), 0);
      const folga = realBalance + receitasFuturas - despesasFuturas;
      safeToSpend = folga / diasRestantes;
    }

    return { isCurrentMonth, diasRestantes, custoMedio, reservaGuardada, runway, mesesCobertos, pctReserva, safeToSpend };
  }, [transactions, selectedMonth, openingBalance, realBalance]);

  const runway = d.runway;
  const runwayCor = runway === null ? 'text-muted-foreground' : runway >= 6 ? 'text-emerald-400' : runway >= 3 ? 'text-amber-400' : 'text-red-400';
  const sts = d.safeToSpend;
  const stsPos = sts !== null && sts >= 0;

  const openEditor = () => {
    setInput(realBalance !== null ? formatNumberToMask(realBalance) : '');
    setEditing(true);
  };
  const commit = () => {
    const parsed = parseMaskedBRNumber(input);
    if (!isNaN(parsed)) {
      setRealBalance(parsed);
      setEditing(false);
    }
  };

  return (
    <section aria-labelledby="copilot-title" className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="h-1 w-8 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full" />
        <h2 id="copilot-title" className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
          Copiloto
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* PROTAGONISTA — Safe-to-Spend ou CTA de saldo */}
        {realBalance === null ? (
          <button
            type="button"
            onClick={openEditor}
            className="col-span-2 glass rounded-3xl p-5 border border-cyan-500/30 text-left hover:border-cyan-500/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
          >
            <div className="flex items-center gap-2 mb-2">
              <Plus className="w-4 h-4 text-cyan-400" aria-hidden="true" />
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Ative o copiloto</span>
            </div>
            <p className="text-lg font-bold tracking-tight">Informe quanto você tem na conta hoje</p>
            <p className="text-xs text-muted-foreground mt-1.5">É a âncora pra calcular quanto pode gastar por dia e seu fôlego real. Toque pra começar.</p>
          </button>
        ) : sts !== null ? (
          <div className={`col-span-2 glass rounded-3xl p-5 border ${stsPos ? 'border-emerald-500/20' : 'border-red-500/25'}`}>
            <div className="flex items-center gap-2 mb-2">
              <Coins className={`w-4 h-4 ${stsPos ? 'text-emerald-400' : 'text-red-400'}`} aria-hidden="true" />
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
                {stsPos ? 'Você pode gastar por dia' : 'Você está no vermelho por dia'}
              </span>
            </div>
            <p className={`text-4xl font-bold tracking-tight ${stsPos ? 'text-emerald-400' : 'text-red-400'}`}>
              {stsPos ? '' : '-'}{formatCurrency(Math.abs(sts))}
              <span className="text-base text-muted-foreground font-normal">/dia</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1.5">
              {stsPos
                ? `Livre pra gastar nos ${d.diasRestantes} dias restantes, partindo do seu saldo real e já descontando todas as contas e a reserva previstas.`
                : `Faltam recursos pra cobrir as contas previstas até o fim do mês. Reveja gastos ou antecipe receita.`}
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={openEditor}
            className="col-span-2 glass rounded-3xl p-5 border border-white/5 text-left hover:border-white/15 transition-colors"
          >
            <p className="text-sm text-muted-foreground">Safe-to-spend aparece no mês atual. Saldo informado: <strong className="text-foreground">{formatCurrency(realBalance)}</strong></p>
          </button>
        )}

        {/* Fôlego (runway) */}
        <div className="glass rounded-3xl p-5 border border-white/5">
          <div className="flex items-center gap-2 mb-2">
            <LifeBuoy className="w-4 h-4 text-cyan-400" aria-hidden="true" />
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Fôlego</span>
          </div>
          {runway === null ? (
            <p className="text-3xl font-bold tracking-tight text-muted-foreground">—</p>
          ) : (
            <p className={`text-3xl font-bold tracking-tight ${runwayCor}`}>
              {runway < 1 ? (
                <>{'<'}1<span className="text-sm text-muted-foreground font-normal"> mês</span></>
              ) : (
                <>{runway.toFixed(1).replace('.0', '')}<span className="text-sm text-muted-foreground font-normal"> {runway < 2 ? 'mês' : 'meses'}</span></>
              )}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-1.5 flex items-start gap-1">
            {runway !== null && runway < 3 && <AlertTriangle className="w-3 h-3 text-red-400 mt-0.5 shrink-0" aria-hidden="true" />}
            <span>se a renda parar</span>
          </p>
        </div>

        {/* Reserva */}
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
            <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-500 to-cyan-400 transition-all duration-500" style={{ width: `${d.pctReserva}%` }} />
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">{d.reservaGuardada > 0 ? `${brl0(d.reservaGuardada)} guardados` : 'meses cobertos'}</p>
        </div>

        {/* Saldo na conta (editável) */}
        <button
          type="button"
          onClick={openEditor}
          className="glass rounded-3xl p-5 border border-white/5 text-left hover:border-white/15 transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Landmark className="w-4 h-4 text-foreground/70" aria-hidden="true" />
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Saldo na conta</span>
            </div>
            <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
          </div>
          <p className="text-2xl font-bold tracking-tight">
            {realBalance !== null ? formatCurrency(realBalance) : <span className="text-muted-foreground text-base">Informar →</span>}
          </p>
          <p className="text-xs text-muted-foreground mt-2.5">{realBalance !== null ? 'Toque pra atualizar' : 'quanto você tem agora'}</p>
        </button>

        {/* Custo de vida */}
        <div className="glass rounded-3xl p-5 border border-white/5">
          <div className="flex items-center gap-2 mb-2">
            <Receipt className="w-4 h-4 text-amber-400" aria-hidden="true" />
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Custo de vida</span>
          </div>
          <p className="text-2xl font-bold tracking-tight">
            {d.custoMedio > 0 ? brl0(d.custoMedio) : '—'}
            <span className="text-sm text-muted-foreground font-normal">/mês</span>
          </p>
          <p className="text-xs text-muted-foreground mt-2.5">{d.custoMedio > 0 ? 'média dos últimos 3 meses' : 'sem histórico ainda'}</p>
        </div>
      </div>

      {/* Dialog de saldo real */}
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="sm:max-w-md glass border-white/10">
          <DialogHeader>
            <DialogTitle>Saldo na conta hoje</DialogTitle>
            <DialogDescription>
              Quanto você tem disponível na conta agora (somando todas as contas líquidas). É a base pra calcular quanto pode gastar por dia e seu fôlego real.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="real-balance" className="text-xs uppercase tracking-wide">Valor (R$)</Label>
            <Input
              id="real-balance"
              value={input}
              onChange={(e) => setInput(maskBRCurrency(e.target.value))}
              onKeyDown={(e) => { if (e.key === 'Enter') commit(); }}
              placeholder="2.085,00"
              inputMode="decimal"
              className="bg-background/50 border-white/10 rounded-xl text-lg"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button size="sm" onClick={commit} className="rounded-xl">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
});
