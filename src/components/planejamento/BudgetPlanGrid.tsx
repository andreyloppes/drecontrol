import { useMemo, useState } from 'react';
import { BudgetPlan, CalcMode, CategoryHistoryStat, NewBudgetPlan, computePlannedAmount } from '@/hooks/useBudgetPlans';
import { Transaction, TransactionType } from '@/types/finance';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/format';
import { maskBRCurrency, parseMaskedBRNumber } from '@/lib/currency-mask';
import { Plus, Trash2, Save, X, Calculator, TrendingUp, Percent } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  month: string;
  plans: BudgetPlan[];
  history: CategoryHistoryStat[];
  transactions: Transaction[];
  workingDays: number;
  plannedIncome: number;
  onSave: (plan: NewBudgetPlan) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}

const TYPE_LABEL: Record<TransactionType, string> = {
  projeto: 'Projeto',
  recorrencia: 'Receita Rec.',
  despesa: 'Despesa',
};

const MODE_LABEL: Record<CalcMode, string> = {
  fixed: 'Fixo',
  per_workday: 'R$/dia útil',
  percent_income: '% da receita',
};

const MODE_ICON: Record<CalcMode, React.ReactNode> = {
  fixed: <Calculator className="w-3 h-3" aria-hidden />,
  per_workday: <TrendingUp className="w-3 h-3" aria-hidden />,
  percent_income: <Percent className="w-3 h-3" aria-hidden />,
};

const SECTION_SUGGESTIONS = ['Moradia', 'Alimentação', 'Trabalho', 'Transporte', 'Saúde', 'Lazer', 'Família', 'Outros'];

export function BudgetPlanGrid({ month, plans, history, transactions, workingDays, plannedIncome, onSave, onDelete }: Props) {
  const [adding, setAdding] = useState(false);
  const [newCat, setNewCat] = useState('');
  const [newType, setNewType] = useState<TransactionType>('despesa');
  const [newMode, setNewMode] = useState<CalcMode>('fixed');
  const [newSection, setNewSection] = useState<string>('');
  const [newAmount, setNewAmount] = useState('');
  const [newRate, setNewRate] = useState('');

  // Valores realizados no mês
  const realizedMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of transactions) {
      if (t.month !== month) continue;
      if (t.status === 'cancelado') continue;
      const key = `${t.type}|${(t.category || 'Geral').trim().toLowerCase()}`;
      m.set(key, (m.get(key) ?? 0) + Math.abs(Number(t.amount)));
    }
    return m;
  }, [transactions, month]);

  const historyMap = useMemo(() => {
    const m = new Map<string, CategoryHistoryStat>();
    history.forEach(h => m.set(`${h.type}|${h.category.trim().toLowerCase()}`, h));
    return m;
  }, [history]);

  // Agrupa por seção. Sem seção → usa TYPE_LABEL como fallback.
  const grouped = useMemo(() => {
    const g = new Map<string, BudgetPlan[]>();
    plans.forEach(p => {
      const section = (p.section || TYPE_LABEL[p.type]).trim();
      if (!g.has(section)) g.set(section, []);
      g.get(section)!.push(p);
    });
    const sorted = Array.from(g.entries()).sort(([a], [b]) => a.localeCompare(b, 'pt-BR'));
    sorted.forEach(([, items]) => items.sort((a, b) => b.planned_amount - a.planned_amount));
    return sorted;
  }, [plans]);

  const handleAdd = async () => {
    const trimmed = newCat.trim();
    if (!trimmed) { toast.error('Informe a categoria.'); return; }
    const amount = parseMaskedBRNumber(newAmount);
    const rate = Number(newRate.replace(',', '.')) || 0;

    const ok = await onSave({
      month,
      category: trimmed,
      type: newType,
      planned_amount: newMode === 'fixed' ? amount : 0,
      calc_mode: newMode,
      rate: newMode === 'fixed' ? 0 : rate,
      section: newSection.trim() || null,
      note: null,
    });
    if (ok) {
      setNewCat(''); setNewAmount(''); setNewRate(''); setNewSection(''); setNewMode('fixed'); setAdding(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold tracking-tight">Categorias Planejadas</h3>
          <p className="text-[10px] text-muted-foreground font-mono">
            {workingDays} dias úteis no mês · clique no valor pra editar
          </p>
        </div>
        {!adding && (
          <Button
            size="sm"
            onClick={() => setAdding(true)}
            className="h-9 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-mono uppercase tracking-wider"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Nova
          </Button>
        )}
      </div>

      {adding && (
        <div className="glass rounded-2xl p-4 border border-white/10 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-4">
              <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Categoria</label>
              <Input
                value={newCat}
                onChange={e => setNewCat(e.target.value)}
                placeholder="Ex: Alimentação empresa"
                className="mt-1 rounded-xl bg-white/5 border-white/10"
                autoFocus
              />
            </div>

            <div className="sm:col-span-3">
              <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Seção (grupo)</label>
              <Input
                list="section-suggestions"
                value={newSection}
                onChange={e => setNewSection(e.target.value)}
                placeholder="Ex: Trabalho"
                className="mt-1 rounded-xl bg-white/5 border-white/10"
              />
              <datalist id="section-suggestions">
                {SECTION_SUGGESTIONS.map(s => <option key={s} value={s} />)}
              </datalist>
            </div>

            <div className="sm:col-span-5">
              <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Tipo</label>
              <div role="radiogroup" aria-label="Tipo" className="mt-1 grid grid-cols-3 gap-1">
                {(['projeto', 'recorrencia', 'despesa'] as TransactionType[]).map(t => (
                  <button
                    key={t}
                    type="button"
                    role="radio"
                    aria-checked={newType === t}
                    onClick={() => setNewType(t)}
                    className={`min-h-[40px] text-[10px] font-mono uppercase tracking-wider rounded-xl border transition-colors px-2 ${
                      newType === t
                        ? 'border-purple-500/50 bg-purple-500/10 text-foreground'
                        : 'border-white/10 text-muted-foreground hover:border-white/20'
                    }`}
                  >
                    {TYPE_LABEL[t]}
                  </button>
                ))}
              </div>
            </div>

            <div className="sm:col-span-12">
              <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Modo de cálculo</label>
              <div role="radiogroup" aria-label="Modo de cálculo" className="mt-1 grid grid-cols-3 gap-1">
                {(['fixed', 'per_workday', 'percent_income'] as CalcMode[]).map(m => (
                  <button
                    key={m}
                    type="button"
                    role="radio"
                    aria-checked={newMode === m}
                    onClick={() => setNewMode(m)}
                    className={`min-h-[40px] text-[10px] font-mono uppercase tracking-wider rounded-xl border transition-colors px-2 flex items-center justify-center gap-1.5 ${
                      newMode === m
                        ? 'border-cyan-500/50 bg-cyan-500/10 text-foreground'
                        : 'border-white/10 text-muted-foreground hover:border-white/20'
                    }`}
                  >
                    {MODE_ICON[m]}
                    {MODE_LABEL[m]}
                  </button>
                ))}
              </div>
            </div>

            <div className="sm:col-span-8">
              {newMode === 'fixed' ? (
                <>
                  <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Valor planejado (R$)</label>
                  <Input
                    value={newAmount}
                    onChange={e => setNewAmount(maskBRCurrency(e.target.value))}
                    inputMode="numeric"
                    placeholder="0,00"
                    className="mt-1 rounded-xl bg-white/5 border-white/10 font-mono"
                  />
                </>
              ) : newMode === 'per_workday' ? (
                <>
                  <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                    R$ por dia útil · {workingDays} dias este mês → preview: {formatCurrency((Number(newRate.replace(',', '.')) || 0) * workingDays)}
                  </label>
                  <Input
                    value={newRate}
                    onChange={e => setNewRate(e.target.value.replace(/[^\d.,]/g, ''))}
                    inputMode="decimal"
                    placeholder="Ex: 35 (para R$ 35/dia)"
                    className="mt-1 rounded-xl bg-white/5 border-white/10 font-mono"
                  />
                </>
              ) : (
                <>
                  <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                    % da receita planejada · receita atual: {formatCurrency(plannedIncome)} → preview: {formatCurrency(((Number(newRate.replace(',', '.')) || 0) / 100) * plannedIncome)}
                  </label>
                  <Input
                    value={newRate}
                    onChange={e => setNewRate(e.target.value.replace(/[^\d.,]/g, ''))}
                    inputMode="decimal"
                    placeholder="Ex: 15"
                    className="mt-1 rounded-xl bg-white/5 border-white/10 font-mono"
                  />
                </>
              )}
            </div>

            <div className="sm:col-span-4 flex items-end gap-1">
              <Button size="sm" onClick={handleAdd} className="h-10 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-mono uppercase flex-1">
                <Save className="w-3.5 h-3.5 mr-1" /> Salvar
              </Button>
              <Button size="icon" variant="ghost" onClick={() => { setAdding(false); setNewCat(''); setNewAmount(''); setNewRate(''); setNewSection(''); }} aria-label="Cancelar" className="h-10 w-10 rounded-xl">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {grouped.map(([section, items]) => {
        const sectionTotal = items.reduce((acc, p) => acc + computePlannedAmount(p, { workingDays, plannedIncome }), 0);
        const sectionRealized = items.reduce((acc, p) => {
          const key = `${p.type}|${p.category.trim().toLowerCase()}`;
          return acc + (realizedMap.get(key) ?? 0);
        }, 0);
        return (
          <div key={section} className="space-y-2">
            <div className="flex items-center justify-between pl-1">
              <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                {section}
              </div>
              <div className="text-[10px] font-mono text-muted-foreground tabular-nums">
                Total: <span className="text-foreground">{formatCurrency(sectionTotal)}</span> · Real: <span className={sectionRealized > sectionTotal ? 'text-red-300' : 'text-foreground'}>{formatCurrency(sectionRealized)}</span>
              </div>
            </div>
            <div className="space-y-2">
              {items.map(p => {
                const key = `${p.type}|${p.category.trim().toLowerCase()}`;
                const realized = realizedMap.get(key) ?? 0;
                const histStat = historyMap.get(key);
                const computed = computePlannedAmount(p, { workingDays, plannedIncome });
                const pct = computed > 0 ? (realized / computed) * 100 : 0;
                const over = pct > 100;
                return (
                  <PlanRow
                    key={p.id}
                    plan={p}
                    computed={computed}
                    realized={realized}
                    pct={pct}
                    over={over}
                    histAvg={histStat?.avg}
                    workingDays={workingDays}
                    plannedIncome={plannedIncome}
                    onSave={onSave}
                    onDelete={onDelete}
                  />
                );
              })}
            </div>
          </div>
        );
      })}

      {plans.length === 0 && !adding && (
        <div className="glass rounded-2xl p-6 border border-white/10 text-center text-sm text-muted-foreground">
          Nenhum plano criado para {month}. Use <span className="text-foreground font-medium">"Gerar do histórico"</span> ou clique em <span className="text-foreground font-medium">"Nova"</span>.
        </div>
      )}
    </div>
  );
}

function PlanRow({ plan, computed, realized, pct, over, histAvg, workingDays, plannedIncome, onSave, onDelete }: {
  plan: BudgetPlan;
  computed: number;
  realized: number;
  pct: number;
  over: boolean;
  histAvg?: number;
  workingDays: number;
  plannedIncome: number;
  onSave: (p: NewBudgetPlan) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(() => plan.calc_mode === 'fixed'
    ? String(plan.planned_amount).replace('.', ',')
    : String(plan.rate).replace('.', ','));

  const handleSave = async () => {
    let amount = plan.planned_amount;
    let rate = plan.rate;
    if (plan.calc_mode === 'fixed') {
      amount = parseMaskedBRNumber(value);
    } else {
      rate = Number(value.replace(',', '.')) || 0;
    }
    const ok = await onSave({
      month: plan.month,
      category: plan.category,
      type: plan.type,
      planned_amount: amount,
      calc_mode: plan.calc_mode,
      rate,
      section: plan.section ?? null,
      note: plan.note ?? null,
    });
    if (ok) {
      setEditing(false);
      toast.success('Atualizado.');
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Apagar plano "${plan.category}"?`)) return;
    await onDelete(plan.id);
  };

  const explain = plan.calc_mode === 'per_workday'
    ? `${formatCurrency(plan.rate)} × ${workingDays} dias`
    : plan.calc_mode === 'percent_income'
      ? `${plan.rate}% de ${formatCurrency(plannedIncome)}`
      : null;

  return (
    <div className="glass rounded-2xl p-4 border border-white/5 hover:border-white/10 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium truncate">{plan.category}</span>
            <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border border-cyan-500/30 text-cyan-300 flex items-center gap-1">
              {MODE_ICON[plan.calc_mode]}
              {MODE_LABEL[plan.calc_mode]}
            </span>
            {typeof histAvg === 'number' && histAvg > 0 && (
              <span className="text-[10px] font-mono text-muted-foreground">
                hist: {formatCurrency(histAvg)}
              </span>
            )}
          </div>

          {explain && (
            <div className="text-[10px] font-mono text-muted-foreground mt-0.5">
              = {explain}
            </div>
          )}

          <div className="h-1 rounded-full bg-white/5 mt-2 overflow-hidden">
            <div
              className={`h-full ${over ? 'bg-red-400/70' : 'bg-emerald-400/60'}`}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
          <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
            <span>Plan: <span className="font-mono text-foreground">{formatCurrency(computed)}</span></span>
            <span>·</span>
            <span>Real: <span className={`font-mono ${over ? 'text-red-300' : 'text-foreground'}`}>{formatCurrency(realized)}</span></span>
            <span>·</span>
            <span className={over ? 'text-red-300' : ''}>{pct.toFixed(0)}%</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {editing ? (
            <>
              <Input
                value={value}
                onChange={e => setValue(plan.calc_mode === 'fixed' ? maskBRCurrency(e.target.value) : e.target.value.replace(/[^\d.,]/g, ''))}
                inputMode={plan.calc_mode === 'fixed' ? 'numeric' : 'decimal'}
                className="w-24 rounded-xl bg-white/5 border-white/10 font-mono h-9 text-sm"
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleSave()}
              />
              <Button size="icon" onClick={handleSave} aria-label="Salvar" className="h-9 w-9 rounded-xl bg-purple-600 hover:bg-purple-500 text-white">
                <Save className="w-3.5 h-3.5" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => { setEditing(false); }} aria-label="Cancelar" className="h-9 w-9 rounded-xl">
                <X className="w-3.5 h-3.5" />
              </Button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="text-right font-mono text-sm min-h-[44px] px-2 py-1 rounded-lg hover:bg-white/5 transition-colors"
                aria-label={`Editar ${plan.category}`}
              >
                {plan.calc_mode === 'fixed'
                  ? formatCurrency(plan.planned_amount)
                  : plan.calc_mode === 'per_workday'
                    ? `${formatCurrency(plan.rate)}/d`
                    : `${plan.rate}%`}
              </button>
              <Button
                size="icon"
                variant="ghost"
                onClick={handleDelete}
                aria-label={`Apagar ${plan.category}`}
                className="h-9 w-9 rounded-xl text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
