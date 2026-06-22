import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSupabase } from '@/context/SupabaseContext';
import { toast } from 'sonner';
import { Transaction, TransactionType } from '@/types/finance';
import { workingDaysInMonth } from '@/lib/working-days';

const PLANS_TABLE = 'budget_plans';
const GOALS_TABLE = 'budget_goals';

export type CalcMode = 'fixed' | 'per_workday' | 'percent_income';

export interface BudgetPlan {
  id: string;
  month: string;
  category: string;
  type: TransactionType;
  planned_amount: number;
  calc_mode: CalcMode;
  rate: number;
  section?: string | null;
  note?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type NewBudgetPlan = Omit<BudgetPlan, 'id' | 'created_at' | 'updated_at'>;

export interface BudgetGoals {
  month: string;
  reserve_pct: number;
  tithe_pct: number;
  note?: string | null;
}

export interface CategoryHistoryStat {
  category: string;
  type: TransactionType;
  avg: number;
  max: number;
  min: number;
  count: number;
  lastMonthAmount: number;
}

export interface BudgetHealthTip {
  id: string;
  severity: 'info' | 'warn' | 'ok';
  message: string;
}

export interface BudgetHealthReport {
  plannedIncome: number;
  plannedExpense: number;
  plannedBalance: number;
  /** Só transações com status = 'recebido' (efetivamente realizadas). */
  realizedIncome: number;
  realizedExpense: number;
  realizedBalance: number;
  /** Transações 'previsto' + 'pendente' — lançadas mas ainda não confirmadas. */
  forecastIncome: number;
  forecastExpense: number;
  forecastBalance: number;
  reserveTarget: number;
  titheTarget: number;
  /** Reserva baseada no realizado (recebido - pago). */
  reserveActual: number;
  titheGap: number;
  overBudget: Array<{ category: string; planned: number; actual: number; pct: number }>;
  underBudget: Array<{ category: string; planned: number; actual: number; pct: number }>;
  tips: BudgetHealthTip[];
  workingDays: number;
}

const DEFAULT_GOALS: BudgetGoals = { month: '', reserve_pct: 20, tithe_pct: 10 };

const MIN_AVG_TO_PLAN = 50;

const SECTION_KEYWORDS: Array<{ section: string; words: RegExp }> = [
  { section: 'Moradia', words: /(morad|alug|condom|iptu|luz|energia|água|agua|internet|gás|gas)/i },
  { section: 'Alimentação', words: /(mercado|aliment|superm|feira|padar|restaur|ifood|comida|lanche)/i },
  { section: 'Transporte', words: /(uber|99|taxi|gasolin|combust|ônibus|onibus|metrô|metro|transporte|desloc|estac)/i },
  { section: 'Trabalho', words: /(coworking|escrit|ferramenta|software|saas|material de trab|empresa)/i },
  { section: 'Saúde', words: /(saúde|saude|medic|farm|remed|plano de saude|dent|consulta|exame)/i },
  { section: 'Lazer', words: /(lazer|cinema|assinat|stream|netflix|spotify|prime|viagem|hotel|passe)/i },
  { section: 'Família', words: /(famil|fam[ií]lia|filho|escola|mesada|animal|pet)/i },
];

function inferSection(category: string): string | null {
  const hit = SECTION_KEYWORDS.find(s => s.words.test(category));
  return hit?.section ?? null;
}

function prevMonths(month: string, count: number): string[] {
  const [y, m] = month.split('-').map(Number);
  const out: string[] = [];
  for (let i = 1; i <= count; i++) {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    out.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  }
  return out;
}

/**
 * Valor final de um plano considerando o modo de cálculo.
 * - fixed: planned_amount direto
 * - per_workday: rate × dias úteis do mês
 * - percent_income: (rate / 100) × receita planejada (soma dos planos de receita já calculados)
 */
export function computePlannedAmount(
  plan: Pick<BudgetPlan, 'planned_amount' | 'calc_mode' | 'rate'>,
  ctx: { workingDays: number; plannedIncome: number }
): number {
  const mode = plan.calc_mode ?? 'fixed';
  const rate = Number(plan.rate ?? 0);
  if (mode === 'per_workday') return Math.round(rate * ctx.workingDays * 100) / 100;
  if (mode === 'percent_income') return Math.round(((rate / 100) * ctx.plannedIncome) * 100) / 100;
  return Number(plan.planned_amount ?? 0);
}

/**
 * Calcula receita planejada somando planos NÃO-despesa no modo fixed.
 * (receita em per_workday/percent é atípica e ignorada no denominador pra evitar loop)
 */
function computePlannedIncome(plans: BudgetPlan[], workingDays: number): number {
  return plans
    .filter(p => p.type !== 'despesa')
    .reduce((acc, p) => {
      if (p.calc_mode === 'per_workday') return acc + Number(p.rate) * workingDays;
      if (p.calc_mode === 'percent_income') return acc; // ignorado pra evitar loop
      return acc + Number(p.planned_amount);
    }, 0);
}

export function useBudgetPlans(month: string) {
  const { client } = useSupabase();
  const [plans, setPlans] = useState<BudgetPlan[]>([]);
  const [goals, setGoals] = useState<BudgetGoals>({ ...DEFAULT_GOALS, month });
  const [loading, setLoading] = useState(true);
  const [tableExists, setTableExists] = useState<boolean | null>(null);

  const workingDays = useMemo(() => workingDaysInMonth(month), [month]);

  useEffect(() => {
    setGoals(prev => ({ ...prev, month }));
  }, [month]);

  const fetch = useCallback(async () => {
    setLoading(true);
    const [plansRes, goalsRes] = await Promise.all([
      client.from(PLANS_TABLE).select('*').eq('month', month),
      client.from(GOALS_TABLE).select('*').eq('month', month).maybeSingle(),
    ]);

    if (plansRes.error || goalsRes.error) {
      console.warn('[budget_plans] fallback:', plansRes.error?.message || goalsRes.error?.message);
      setTableExists(false);
      setLoading(false);
      return;
    }

    setTableExists(true);
    setPlans((plansRes.data || []) as BudgetPlan[]);
    if (goalsRes.data) {
      setGoals(goalsRes.data as BudgetGoals);
    } else {
      setGoals({ ...DEFAULT_GOALS, month });
    }
    setLoading(false);
  }, [client, month]);

  useEffect(() => { fetch(); }, [fetch]);

  const upsertPlan = useCallback(async (plan: NewBudgetPlan): Promise<boolean> => {
    const payload = {
      ...plan,
      calc_mode: plan.calc_mode ?? 'fixed',
      rate: plan.rate ?? 0,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await client
      .from(PLANS_TABLE)
      .upsert(payload, { onConflict: 'month,category,type' })
      .select()
      .single();

    if (error) {
      toast.error(`Erro ao salvar plano: ${error.message}`);
      return false;
    }
    if (data) {
      setPlans(prev => {
        const row = data as BudgetPlan;
        const idx = prev.findIndex(p => p.month === row.month && p.category === row.category && p.type === row.type);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = row;
          return next;
        }
        return [row, ...prev];
      });
      return true;
    }
    return false;
  }, [client]);

  const deletePlan = useCallback(async (id: string): Promise<boolean> => {
    const { error } = await client.from(PLANS_TABLE).delete().eq('id', id);
    if (error) {
      toast.error(`Erro ao apagar: ${error.message}`);
      return false;
    }
    setPlans(prev => prev.filter(p => p.id !== id));
    return true;
  }, [client]);

  const upsertGoals = useCallback(async (next: Partial<BudgetGoals>): Promise<boolean> => {
    const merged: BudgetGoals = { ...goals, ...next, month };
    setGoals(merged);
    const { error } = await client.from(GOALS_TABLE).upsert({
      ...merged,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      toast.error(`Erro ao salvar metas: ${error.message}`);
      return false;
    }
    return true;
  }, [client, goals, month]);

  /**
   * Analisa média/máx por (tipo, categoria) nos últimos N meses.
   */
  const analyzeHistory = useCallback((transactions: Transaction[], months = 3): CategoryHistoryStat[] => {
    const windowMonths = prevMonths(month, months);
    const windowSet = new Set(windowMonths);
    const lastMonth = windowMonths[0];

    const perMonth = new Map<string, Map<string, number>>();
    for (const t of transactions) {
      if (!windowSet.has(t.month)) continue;
      if (t.status === 'cancelado') continue;
      const key = `${t.type}|${(t.category || 'Geral').trim() || 'Geral'}`;
      if (!perMonth.has(key)) perMonth.set(key, new Map());
      const m = perMonth.get(key)!;
      m.set(t.month, (m.get(t.month) ?? 0) + Math.abs(Number(t.amount)));
    }

    const result: CategoryHistoryStat[] = [];
    perMonth.forEach((monthly, key) => {
      const [type, category] = key.split('|') as [TransactionType, string];
      const amounts = Array.from(monthly.values());
      const filled = [...amounts];
      while (filled.length < months) filled.push(0);
      const sum = filled.reduce((a, b) => a + b, 0);
      const avg = sum / months;
      const max = Math.max(...filled, 0);
      const min = Math.min(...filled, 0);
      const lastMonthAmount = monthly.get(lastMonth) ?? 0;
      result.push({ category, type, avg, max, min, count: amounts.length, lastMonthAmount });
    });

    return result.sort((a, b) => b.avg - a.avg);
  }, [month]);

  /**
   * Gera planos do histórico:
   * - Dedup case-insensitive (mantém maior valor como canônico, título capitalizado)
   * - Descarta categorias < R$ 50 (ruído)
   * - Auto-sugere "section" via keywords (Moradia/Alimentação/Transporte/...)
   */
  const generateFromHistory = useCallback(async (
    transactions: Transaction[],
    opts: { months: number; strategy: 'avg' | 'max' } = { months: 3, strategy: 'avg' }
  ): Promise<number> => {
    const stats = analyzeHistory(transactions, opts.months);

    // Consolida por (type + category normalizada), somando valores duplicados case-insensitive.
    const consolidated = new Map<string, { type: TransactionType; category: string; value: number }>();
    for (const s of stats) {
      const raw = (s.category || 'Geral').trim();
      if (!raw || raw.toLowerCase() === 'geral') continue;
      const normalized = raw.toLowerCase();
      const key = `${s.type}|${normalized}`;
      const baseValue = opts.strategy === 'avg' ? s.avg : s.max;
      const canonical = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
      const existingRow = consolidated.get(key);
      if (existingRow) {
        existingRow.value += baseValue;
      } else {
        consolidated.set(key, { type: s.type, category: canonical, value: baseValue });
      }
    }

    const existing = new Set(plans.map(p => `${p.type}|${p.category.trim().toLowerCase()}`));

    const toInsert: NewBudgetPlan[] = Array.from(consolidated.entries())
      .filter(([key, row]) => !existing.has(key) && row.value >= MIN_AVG_TO_PLAN)
      .map(([, row]) => ({
        month,
        category: row.category,
        type: row.type,
        planned_amount: Math.round(row.value * 100) / 100,
        calc_mode: 'fixed' as CalcMode,
        rate: 0,
        section: inferSection(row.category),
        note: `Histórico ${opts.months}m · ${opts.strategy}`,
      }));

    if (toInsert.length === 0) {
      toast.info('Sem categorias relevantes no histórico (mínimo R$ 50).');
      return 0;
    }

    const { data, error } = await client.from(PLANS_TABLE).insert(toInsert).select();
    if (error) {
      toast.error(`Erro ao gerar: ${error.message}`);
      return 0;
    }
    if (data) {
      setPlans(prev => [...(data as BudgetPlan[]), ...prev]);
      toast.success(`${data.length} ${data.length === 1 ? 'plano criado' : 'planos criados'} do histórico`);
      return data.length;
    }
    return 0;
  }, [analyzeHistory, client, month, plans]);

  const deleteAllPlans = useCallback(async (): Promise<boolean> => {
    if (plans.length === 0) return true;
    const { error } = await client.from(PLANS_TABLE).delete().eq('month', month);
    if (error) {
      toast.error(`Erro ao apagar: ${error.message}`);
      return false;
    }
    setPlans([]);
    toast.success('Todos os planos do mês foram apagados.');
    return true;
  }, [client, month, plans.length]);

  /**
   * Saúde mensal considerando computed values (modes de cálculo aplicados).
   */
  const buildHealthReport = useCallback((transactions: Transaction[]): BudgetHealthReport => {
    const monthTx = transactions.filter(t => t.month === month && t.status !== 'cancelado');

    const plannedIncomeBase = computePlannedIncome(plans, workingDays);

    const computedByPlan = plans.map(p => ({
      plan: p,
      computed: computePlannedAmount(p, { workingDays, plannedIncome: plannedIncomeBase }),
    }));

    const plannedIncome = computedByPlan
      .filter(x => x.plan.type !== 'despesa')
      .reduce((acc, x) => acc + x.computed, 0);
    const plannedExpense = computedByPlan
      .filter(x => x.plan.type === 'despesa')
      .reduce((acc, x) => acc + x.computed, 0);

    const realizedTx = monthTx.filter(t => t.status === 'recebido');
    const forecastTx = monthTx.filter(t => t.status === 'previsto' || t.status === 'pendente');

    const sumByType = (txs: Transaction[], kind: 'income' | 'expense') =>
      txs
        .filter(t => (kind === 'income' ? t.type !== 'despesa' : t.type === 'despesa'))
        .reduce((acc, t) => acc + Math.abs(Number(t.amount)), 0);

    const realizedIncome = sumByType(realizedTx, 'income');
    const realizedExpense = sumByType(realizedTx, 'expense');
    const forecastIncome = sumByType(forecastTx, 'income');
    const forecastExpense = sumByType(forecastTx, 'expense');

    // Categoria compara com o planejado incluindo previsto/pendente — consumo real do orçamento
    // do mês inclui compromissos já lançados (cartão de crédito, recorrências agendadas etc.).
    const actualByCategory = new Map<string, number>();
    monthTx.forEach(t => {
      const key = `${t.type}|${(t.category || 'Geral').trim().toLowerCase()}`;
      actualByCategory.set(key, (actualByCategory.get(key) ?? 0) + Math.abs(Number(t.amount)));
    });

    const overBudget: BudgetHealthReport['overBudget'] = [];
    const underBudget: BudgetHealthReport['underBudget'] = [];

    computedByPlan.forEach(({ plan: p, computed: planned }) => {
      if (p.type !== 'despesa') return;
      const key = `${p.type}|${p.category.trim().toLowerCase()}`;
      const actual = actualByCategory.get(key) ?? 0;
      if (planned <= 0) return;
      const pct = (actual / planned) * 100;
      if (pct > 100) {
        overBudget.push({ category: p.category, planned, actual, pct });
      } else if (pct < 50 && actual > 0) {
        underBudget.push({ category: p.category, planned, actual, pct });
      }
    });
    overBudget.sort((a, b) => b.pct - a.pct);

    const reserveTarget = plannedIncome * (goals.reserve_pct / 100);
    const titheTarget = plannedIncome * (goals.tithe_pct / 100);
    const reserveActual = realizedIncome - realizedExpense;
    const titheGap = titheTarget - reserveActual;

    const tips: BudgetHealthTip[] = [];

    if (plannedIncome > 0 && plannedExpense >= plannedIncome) {
      tips.push({
        id: 'expense-over-income',
        severity: 'warn',
        message: `Despesas planejadas (${plannedExpense.toFixed(2)}) consomem 100%+ da receita. Sem folga pra reserva/dízimo.`,
      });
    }

    if (reserveTarget > 0 && reserveActual < reserveTarget) {
      const gap = reserveTarget - reserveActual;
      tips.push({
        id: 'reserve-gap',
        severity: 'warn',
        message: `Reserva abaixo da meta em R$ ${gap.toFixed(2)}. Meta ${goals.reserve_pct}% = R$ ${reserveTarget.toFixed(2)}.`,
      });
    } else if (reserveTarget > 0) {
      tips.push({
        id: 'reserve-ok',
        severity: 'ok',
        message: `Reserva atingida: R$ ${reserveActual.toFixed(2)} (meta ${goals.reserve_pct}%).`,
      });
    }

    if (titheTarget > 0 && titheGap > 0) {
      tips.push({
        id: 'tithe-info',
        severity: 'info',
        message: `Dízimo (${goals.tithe_pct}% da receita): R$ ${titheTarget.toFixed(2)}/mês.`,
      });
    }

    overBudget.slice(0, 3).forEach(ob => {
      tips.push({
        id: `over-${ob.category}`,
        severity: 'warn',
        message: `${ob.category}: R$ ${ob.actual.toFixed(2)} (${ob.pct.toFixed(0)}% do planejado R$ ${ob.planned.toFixed(2)}).`,
      });
    });

    if (realizedExpense > 0 && realizedIncome > 0) {
      const savingsRate = ((realizedIncome - realizedExpense) / realizedIncome) * 100;
      if (savingsRate >= 30) {
        tips.push({ id: 'savings-great', severity: 'ok', message: `Taxa de poupança: ${savingsRate.toFixed(0)}%. Excelente.` });
      } else if (savingsRate < 10) {
        tips.push({ id: 'savings-low', severity: 'warn', message: `Taxa de poupança baixa: ${savingsRate.toFixed(0)}%. Mire em 20-30%.` });
      }
    }

    return {
      plannedIncome,
      plannedExpense,
      plannedBalance: plannedIncome - plannedExpense,
      realizedIncome,
      realizedExpense,
      realizedBalance: realizedIncome - realizedExpense,
      forecastIncome,
      forecastExpense,
      forecastBalance: forecastIncome - forecastExpense,
      reserveTarget,
      titheTarget,
      reserveActual,
      titheGap,
      overBudget,
      underBudget,
      tips,
      workingDays,
    };
  }, [goals, month, plans, workingDays]);

  /**
   * Cria N transações de parcela num único insert.
   */
  const createInstallment = useCallback(async (params: {
    description: string;
    category: string;
    type: TransactionType;
    totalInstallments: number;
    amountPerInstallment: number;
    startMonth: string;
    dayOfMonth: number;
  }): Promise<{ ok: boolean; count: number }> => {
    const { description, category, type, totalInstallments, amountPerInstallment, startMonth, dayOfMonth } = params;
    if (totalInstallments < 1) return { ok: false, count: 0 };

    // Gera installment_id pelo PostgreSQL. Fazemos via RPC? Simples: deixa o cliente enviar UUID.
    const installmentId = crypto.randomUUID();
    const [y, m] = startMonth.split('-').map(Number);

    const rows = Array.from({ length: totalInstallments }).map((_, i) => {
      const monthDate = new Date(Date.UTC(y, m - 1 + i, 1));
      const mm = String(monthDate.getUTCMonth() + 1).padStart(2, '0');
      const yyyy = monthDate.getUTCFullYear();
      const monthStr = `${yyyy}-${mm}`;
      const lastDay = new Date(Date.UTC(yyyy, monthDate.getUTCMonth() + 1, 0)).getUTCDate();
      const safeDay = String(Math.min(dayOfMonth, lastDay)).padStart(2, '0');
      const signedAmount = type === 'despesa' ? -Math.abs(amountPerInstallment) : Math.abs(amountPerInstallment);
      return {
        description: `${description} (${i + 1}/${totalInstallments})`,
        amount: signedAmount,
        type,
        category,
        status: 'previsto' as const,
        date: `${monthStr}-${safeDay}`,
        month: monthStr,
        installment_id: installmentId,
        installment_index: i + 1,
        installment_total: totalInstallments,
      };
    });

    const { data, error } = await client.from('transactions').insert(rows).select();
    if (error) {
      toast.error(`Erro ao criar parcelas: ${error.message}`);
      return { ok: false, count: 0 };
    }
    toast.success(`${data?.length ?? 0} parcelas criadas.`);
    return { ok: true, count: data?.length ?? 0 };
  }, [client]);

  return {
    plans,
    goals,
    loading,
    tableExists,
    workingDays,
    upsertPlan,
    deletePlan,
    deleteAllPlans,
    upsertGoals,
    analyzeHistory,
    generateFromHistory,
    buildHealthReport,
    createInstallment,
  };
}
