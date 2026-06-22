import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FinanceProvider, useFinanceContext } from '@/context/FinanceContext';
import { useBudgetPlans, computePlannedAmount } from '@/hooks/useBudgetPlans';
import { MonthFilter } from '@/components/MonthFilter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BudgetPlanGrid } from '@/components/planejamento/BudgetPlanGrid';
import { BudgetHealthPanel } from '@/components/planejamento/BudgetHealthPanel';
import { ParcelasSection } from '@/components/planejamento/ParcelasSection';
import { ArrowLeft, Wand2, Target, HelpCircle, Trash2 } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { toast } from 'sonner';

function PlanejamentoInner() {
  const navigate = useNavigate();
  const { transactions, selectedMonth, setSelectedMonth, availableMonths } = useFinanceContext();
  const {
    plans, goals, loading, tableExists, workingDays,
    upsertPlan, deletePlan, deleteAllPlans, upsertGoals,
    analyzeHistory, generateFromHistory, buildHealthReport, createInstallment,
  } = useBudgetPlans(selectedMonth);

  const [historyMonths, setHistoryMonths] = useState<3 | 6>(3);
  const [strategy, setStrategy] = useState<'avg' | 'max'>('avg');
  const [reservePctInput, setReservePctInput] = useState(String(goals.reserve_pct));
  const [tithePctInput, setTithePctInput] = useState(String(goals.tithe_pct));
  const [showHelp, setShowHelp] = useState(false);

  const history = useMemo(() => analyzeHistory(transactions, historyMonths), [transactions, analyzeHistory, historyMonths]);
  const report = useMemo(() => buildHealthReport(transactions), [transactions, buildHealthReport]);

  // Receita planejada (considerando modos) para passar ao grid.
  const plannedIncomeForGrid = useMemo(() => {
    return plans
      .filter(p => p.type !== 'despesa')
      .reduce((acc, p) => {
        if (p.calc_mode === 'per_workday') return acc + Number(p.rate) * workingDays;
        if (p.calc_mode === 'percent_income') return acc;
        return acc + Number(p.planned_amount);
      }, 0);
  }, [plans, workingDays]);

  const handleGoalSave = async () => {
    const reserve = Number(reservePctInput.replace(',', '.')) || 0;
    const tithe = Number(tithePctInput.replace(',', '.')) || 0;
    const ok = await upsertGoals({ reserve_pct: reserve, tithe_pct: tithe });
    if (ok) toast.success('Metas atualizadas.');
  };

  const handleGenerate = async () => {
    await generateFromHistory(transactions, { months: historyMonths, strategy });
  };

  const handleDeleteAll = async () => {
    if (plans.length === 0) {
      toast.info('Não há planos para apagar.');
      return;
    }
    const ok = window.confirm(`Apagar todos os ${plans.length} planos de ${selectedMonth}? Essa ação não pode ser desfeita.`);
    if (!ok) return;
    await deleteAllPlans();
  };

  if (tableExists === false) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="glass rounded-3xl p-6 border border-amber-500/30 max-w-lg text-sm space-y-3">
          <div className="text-amber-400 font-bold uppercase text-xs tracking-widest">Migração pendente</div>
          <p>
            Rode <code className="font-mono text-xs">supabase/migrations/20260419_budget_plans.sql</code> e{' '}
            <code className="font-mono text-xs">supabase/migrations/20260419_budget_calc_modes.sql</code> no Supabase.
          </p>
          <Button variant="ghost" onClick={() => navigate('/dashboard')} className="rounded-xl">
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <a
        href="#plan-main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-cyan-600 focus:text-white focus:rounded-lg focus:shadow-xl focus:outline-none focus:ring-2 focus:ring-cyan-300"
      >
        Pular para o conteúdo principal
      </a>

      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full animate-float" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-500/10 blur-[120px] rounded-full animate-float" style={{ animationDelay: '-3s' }} />
        <div className="absolute inset-0 cyber-grid opacity-[0.03] dark:opacity-[0.05]" />
      </div>

      <header className="sticky top-0 z-50 glass border-b border-white/10">
        <div className="container py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Voltar para o dashboard"
              onClick={() => navigate('/dashboard')}
              className="h-10 w-10 rounded-xl border border-white/10 focus-visible:ring-2 focus-visible:ring-cyan-500"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tighter">Planejamento</h1>
              <p className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-widest font-mono">
                Orçamento mensal <span className="text-purple-400" aria-hidden="true">•</span> saúde financeira
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowHelp(!showHelp)}
              aria-label="Ajuda"
              aria-expanded={showHelp}
              className="h-10 w-10 rounded-xl border border-white/10"
            >
              <HelpCircle className="w-4 h-4" />
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main id="plan-main" className="container relative z-10 py-6 md:py-8 space-y-6">
        {showHelp && (
          <section className="glass rounded-2xl p-4 border border-cyan-500/20 text-xs space-y-2">
            <h2 className="text-xs font-bold text-cyan-400 uppercase tracking-widest">Como usar</h2>
            <ul className="space-y-1.5 list-disc list-inside text-muted-foreground">
              <li><span className="text-foreground">Gerar do histórico</span> importa categorias dos últimos meses como "Fixo" — ajuste o modo se precisar.</li>
              <li><span className="text-foreground">Modo Fixo</span>: valor direto (ex: Moradia 2.800).</li>
              <li><span className="text-foreground">Modo R$/dia útil</span>: rate × {workingDays} dias úteis deste mês. Ideal pra deslocamento e alimentação no trabalho.</li>
              <li><span className="text-foreground">Modo % da receita</span>: percentual sobre a receita planejada (ex: 15% pra variados).</li>
              <li><span className="text-foreground">Parcelas</span>: cria N transações futuras (uma por mês) com status "previsto" — ideal pra compra em Nx.</li>
              <li><span className="text-foreground">Análise IA</span>: usa sua chave Groq da tela inicial pra gerar análise profunda do plano.</li>
            </ul>
          </section>
        )}

        {/* Controles topo */}
        <section className="flex flex-col lg:flex-row gap-3 lg:items-center justify-between">
          <div className="glass p-1 rounded-2xl w-fit">
            <MonthFilter
              selectedMonth={selectedMonth}
              onMonthChange={setSelectedMonth}
              availableMonths={availableMonths}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div role="radiogroup" aria-label="Janela de histórico" className="glass rounded-xl p-1 flex">
              {([3, 6] as const).map(m => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={historyMonths === m}
                  onClick={() => setHistoryMonths(m)}
                  className={`px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider rounded-lg transition-colors ${
                    historyMonths === m ? 'bg-white/10 text-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {m}m
                </button>
              ))}
            </div>

            <div role="radiogroup" aria-label="Estratégia" className="glass rounded-xl p-1 flex">
              {(['avg', 'max'] as const).map(s => (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={strategy === s}
                  onClick={() => setStrategy(s)}
                  className={`px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider rounded-lg transition-colors ${
                    strategy === s ? 'bg-white/10 text-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {s === 'avg' ? 'Média' : 'Máximo'}
                </button>
              ))}
            </div>

            <Button
              onClick={handleGenerate}
              size="sm"
              className="h-10 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-mono uppercase tracking-wider"
            >
              <Wand2 className="w-3.5 h-3.5 mr-1.5" /> Gerar do histórico
            </Button>

            {plans.length > 0 && (
              <Button
                onClick={handleDeleteAll}
                size="sm"
                variant="ghost"
                className="h-10 rounded-xl border border-red-500/20 text-red-300 hover:bg-red-500/10 text-xs font-mono uppercase tracking-wider"
                aria-label={`Apagar todos os ${plans.length} planos do mês`}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Apagar todos ({plans.length})
              </Button>
            )}
          </div>
        </section>

        {/* Metas */}
        <section className="glass rounded-3xl p-5 border border-white/5">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-4 h-4 text-emerald-400" />
            <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Metas do mês</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="reserve-pct" className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                Reserva (% da receita)
              </label>
              <Input
                id="reserve-pct"
                type="number"
                min={0}
                max={100}
                step={1}
                value={reservePctInput}
                onChange={e => setReservePctInput(e.target.value)}
                onBlur={handleGoalSave}
                className="mt-1 rounded-xl bg-white/5 border-white/10 font-mono"
              />
            </div>
            <div>
              <label htmlFor="tithe-pct" className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                Dízimo (% da receita)
              </label>
              <Input
                id="tithe-pct"
                type="number"
                min={0}
                max={100}
                step={1}
                value={tithePctInput}
                onChange={e => setTithePctInput(e.target.value)}
                onBlur={handleGoalSave}
                className="mt-1 rounded-xl bg-white/5 border-white/10 font-mono"
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleGoalSave}
                size="sm"
                variant="ghost"
                className="h-10 rounded-xl border border-white/10 text-xs font-mono uppercase tracking-wider"
              >
                Salvar metas
              </Button>
            </div>
          </div>
        </section>

        {/* Parcelas */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="h-1 w-8 bg-amber-500 rounded-full" />
            <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Parcelas</h2>
          </div>
          <ParcelasSection
            currentMonth={selectedMonth}
            transactions={transactions}
            onCreate={createInstallment}
          />
        </section>

        {/* Grid */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="h-1 w-8 bg-emerald-500 rounded-full" />
            <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Planejamento por Categoria</h2>
          </div>
          {loading ? (
            <div className="text-sm text-muted-foreground">Carregando planos…</div>
          ) : (
            <BudgetPlanGrid
              month={selectedMonth}
              plans={plans}
              history={history}
              transactions={transactions}
              workingDays={workingDays}
              plannedIncome={plannedIncomeForGrid}
              onSave={upsertPlan}
              onDelete={deletePlan}
            />
          )}
        </section>

        {/* Saúde (após planejar, faz sentido) */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="h-1 w-8 bg-cyan-500 rounded-full" />
            <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Saúde Financeira</h2>
          </div>
          <BudgetHealthPanel
            report={report}
            reservePct={goals.reserve_pct}
            tithePct={goals.tithe_pct}
          />
        </section>

      </main>
    </div>
  );
}

export default function Planejamento() {
  return (
    <FinanceProvider>
      <PlanejamentoInner />
    </FinanceProvider>
  );
}
