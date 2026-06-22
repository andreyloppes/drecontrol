import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Transaction, MonthlyData, PaymentStatus } from '@/types/finance';
import { format, parseISO, endOfMonth, eachDayOfInterval, addMonths } from 'date-fns';
import { useSupabase } from '@/context/SupabaseContext';
import { toast } from 'sonner';

const TABLE = 'transactions';
const OPENING_BALANCES_TABLE = 'opening_balances';
const OPENING_BALANCES_LS_KEY = 'drecontroll_opening_balances';

export function useFinance() {
  const { client } = useSupabase();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Keep a ref in sync with `transactions` so stable callbacks can read the
  // latest state without being recreated on every update.
  const transactionsRef = useRef<Transaction[]>([]);
  useEffect(() => { transactionsRef.current = transactions; }, [transactions]);

  const [selectedMonth, setSelectedMonth] = useState(() =>
    new Date().toISOString().substring(0, 7)
  );

  // Saldo anterior editável por mês.
  // Persistido no Supabase (cross-device); localStorage só é usado como
  // seed inicial enquanto o fetch remoto não chegou e como migração one-shot
  // na primeira carga em que a tabela remota existir vazia.
  const [openingBalanceOverrides, setOpeningBalanceOverrides] = useState<Record<string, number>>(() => {
    try {
      const stored = localStorage.getItem(OPENING_BALANCES_LS_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // Carrega do Supabase + migra localStorage se tabela remota estiver vazia.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await client
        .from(OPENING_BALANCES_TABLE)
        .select('month, value');

      if (cancelled) return;

      if (error) {
        // Tabela ainda não foi criada no Supabase — mantém só localStorage.
        // Silencioso (não polui UI enquanto usuário não roda a migration).
        console.warn('[opening_balances] fallback pra localStorage:', error.message);
        return;
      }

      const map: Record<string, number> = {};
      (data || []).forEach((row: { month: string; value: number | string }) => {
        map[row.month] = Number(row.value);
      });

      // Migração one-shot: se remoto vazio e local tem dados → empurra pro Supabase.
      if ((data?.length ?? 0) === 0) {
        try {
          const stored = localStorage.getItem(OPENING_BALANCES_LS_KEY);
          if (stored) {
            const local: Record<string, number> = JSON.parse(stored);
            const rows = Object.entries(local).map(([month, value]) => ({ month, value }));
            if (rows.length > 0) {
              await client.from(OPENING_BALANCES_TABLE).upsert(rows);
              rows.forEach(r => { map[r.month] = Number(r.value); });
            }
          }
        } catch (e) {
          console.warn('[opening_balances] migração localStorage falhou:', e);
        }
      }

      setOpeningBalanceOverrides(map);
    })();
    return () => { cancelled = true; };
  }, [client]);

  // Fetch all transactions from Supabase
  const fetchTransactions = useCallback(async () => {
    const { data, error } = await client
      .from(TABLE)
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      toast.error('Erro ao buscar transações do banco.');
      console.error(error);
    } else {
      setTransactions(data || []);
    }
    setLoading(false);
  }, [client]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const addTransaction = useCallback(async (transaction: Omit<Transaction, 'id' | 'month'>): Promise<boolean> => {
    const month = transaction.date.substring(0, 7);
    const amount = transaction.type === 'despesa' ? -Math.abs(transaction.amount) : Math.abs(transaction.amount);

    const newEntry = {
      ...transaction,
      month,
      amount,
    };

    const { data, error } = await client
      .from(TABLE)
      .insert([newEntry])
      .select()
      .single();

    if (error) {
      toast.error(`Erro ao salvar: ${error.message}`);
      console.error(error);
      return false;
    }
    if (data) {
      setTransactions(prev => [data, ...prev]);
      toast.success('Transação salva!');
      return true;
    }
    return false;
  }, [client]);

  /**
   * Cria N transações de parcela em um único insert.
   * - Descrição: "X (i/N)" pra cada parcela
   * - installment_id compartilhado (UUID client-side)
   * - 1 parcela por mês; ancorada em dayOfMonth (capada ao último dia do mês)
   */
  const addInstallment = useCallback(async (params: {
    description: string;
    amountPerInstallment: number;
    type: Transaction['type'];
    category: string;
    status: PaymentStatus;
    startDate: string; // YYYY-MM-DD
    totalInstallments: number;
    dayOfMonth: number;
  }): Promise<boolean> => {
    const { description, amountPerInstallment, type, category, status, startDate, totalInstallments, dayOfMonth } = params;
    if (totalInstallments < 1) return false;

    const installmentId = crypto.randomUUID();
    const [y, m] = startDate.substring(0, 7).split('-').map(Number);

    const rows = Array.from({ length: totalInstallments }).map((_, i) => {
      const monthDate = new Date(Date.UTC(y, m - 1 + i, 1));
      const mm = String(monthDate.getUTCMonth() + 1).padStart(2, '0');
      const yyyy = monthDate.getUTCFullYear();
      const monthStr = `${yyyy}-${mm}`;
      const lastDay = new Date(Date.UTC(yyyy, monthDate.getUTCMonth() + 1, 0)).getUTCDate();
      const safeDay = String(Math.min(Math.max(dayOfMonth, 1), lastDay)).padStart(2, '0');
      const signedAmount = type === 'despesa' ? -Math.abs(amountPerInstallment) : Math.abs(amountPerInstallment);
      return {
        description: `${description} (${i + 1}/${totalInstallments})`,
        amount: signedAmount,
        type,
        category,
        status,
        date: `${monthStr}-${safeDay}`,
        month: monthStr,
        installment_id: installmentId,
        installment_index: i + 1,
        installment_total: totalInstallments,
      };
    });

    const { data, error } = await client.from(TABLE).insert(rows).select();
    if (error) {
      toast.error(`Erro ao criar parcelas: ${error.message}`);
      return false;
    }
    if (data) {
      setTransactions(prev => [...(data as Transaction[]), ...prev]);
      toast.success(`${data.length} parcelas criadas.`);
      return true;
    }
    return false;
  }, [client]);

  const deleteTransaction = useCallback(async (id: string) => {
    const deleted = transactionsRef.current.find(t => t.id === id);
    if (!deleted) return;

    const { error } = await client.from(TABLE).delete().eq('id', id);
    if (error) {
      toast.error(`Erro ao apagar: ${error.message}`);
      return;
    }

    setTransactions(prev => prev.filter(t => t.id !== id));

    toast.success('Transação apagada', {
      action: {
        label: 'Desfazer',
        onClick: async () => {
          const { id: _discard, ...rest } = deleted;
          const { data, error: restoreError } = await client
            .from(TABLE)
            .insert(rest)
            .select()
            .single();
          if (restoreError || !data) {
            toast.error('Não foi possível restaurar.');
            return;
          }
          setTransactions(prev => [data, ...prev]);
          toast.success('Transação restaurada.');
        },
      },
      duration: 6000,
    });
  }, [client]);

  // Uses functional updater to avoid closing over `transactions` — keeps reference stable.
  const editTransaction = useCallback(async (id: string, updates: Partial<Transaction>) => {
    let processedUpdates: Partial<Transaction> = { ...updates };

    const finalize = async (final: Partial<Transaction>) => {
      const { error } = await client.from(TABLE).update(final).eq('id', id);
      if (error) {
        toast.error(`Erro ao editar: ${error.message}`);
      } else {
        setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...final } : t));
        toast.success('Transação atualizada!');
      }
    };

    if (updates.amount !== undefined && updates.type !== undefined) {
      processedUpdates.amount = updates.type === 'despesa' ? -Math.abs(updates.amount) : Math.abs(updates.amount);
    } else if (updates.amount !== undefined) {
      const target = transactionsRef.current.find(t => t.id === id);
      if (target) {
        const type = updates.type || target.type;
        processedUpdates.amount = type === 'despesa' ? -Math.abs(updates.amount) : Math.abs(updates.amount);
      }
    } else if (updates.type !== undefined) {
      const target = transactionsRef.current.find(t => t.id === id);
      if (target) {
        processedUpdates.amount = updates.type === 'despesa' ? -Math.abs(target.amount) : Math.abs(target.amount);
      }
    }

    if (updates.date) {
      processedUpdates.month = updates.date.substring(0, 7);
    }

    await finalize(processedUpdates);
  }, [client]);

  const replicateRecurringToNextMonth = useCallback(async (): Promise<number> => {
    const currentMonth = new Date().toISOString().substring(0, 7);
    const [yyyy, mm] = currentMonth.split('-').map(Number);
    const nextDate = new Date(Date.UTC(yyyy, mm, 1));
    const nextMonth = format(nextDate, 'yyyy-MM');

    const source = transactionsRef.current.filter(
      t => t.month === currentMonth && t.status !== 'cancelado' &&
        (t.type === 'recorrencia' || t.type === 'despesa')
    );

    if (source.length === 0) {
      toast.info('Nenhuma recorrência no mês atual para replicar.');
      return 0;
    }

    const existingInNext = new Set(
      transactionsRef.current
        .filter(t => t.month === nextMonth)
        .map(t => `${t.description.trim().toLowerCase()}|${Math.abs(Number(t.amount)).toFixed(2)}`)
    );

    const toCreate = source
      .filter(t => {
        const key = `${t.description.trim().toLowerCase()}|${Math.abs(Number(t.amount)).toFixed(2)}`;
        return !existingInNext.has(key);
      })
      .map(t => {
        const day = t.date.substring(8, 10);
        const lastDayOfNext = new Date(Date.UTC(yyyy, mm + 1, 0)).getUTCDate();
        const safeDay = Math.min(Number(day), lastDayOfNext).toString().padStart(2, '0');
        return {
          description: t.description,
          amount: t.type === 'despesa' ? -Math.abs(Number(t.amount)) : Math.abs(Number(t.amount)),
          type: t.type,
          category: t.category,
          status: 'previsto' as PaymentStatus,
          date: `${nextMonth}-${safeDay}`,
          month: nextMonth,
        };
      });

    if (toCreate.length === 0) {
      toast.info('Recorrências do próximo mês já estão geradas.');
      return 0;
    }

    const { data, error } = await client.from(TABLE).insert(toCreate).select();
    if (error) {
      toast.error(`Erro ao replicar: ${error.message}`);
      return 0;
    }
    if (data) {
      setTransactions(prev => [...data, ...prev]);
      toast.success(`${data.length} recorrência${data.length > 1 ? 's' : ''} gerada${data.length > 1 ? 's' : ''} para ${nextMonth}`);
      return data.length;
    }
    return 0;
  }, [client]);

  const bulkImport = useCallback(async (entries: Omit<Transaction, 'id'>[]) => {
    // Insert in batches of 50
    const batchSize = 50;
    const allInserted: Transaction[] = [];

    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize);
      const { data, error } = await client
        .from(TABLE)
        .insert(batch)
        .select();

      if (error) {
        toast.error(`Erro no lote ${Math.floor(i / batchSize) + 1}: ${error.message}`);
        console.error(error);
        break;
      }
      if (data) allInserted.push(...data);
    }

    if (allInserted.length > 0) {
      setTransactions(prev => [...allInserted, ...prev]);
    }
  }, [client]);

  const updateTransactionStatus = useCallback(async (id: string, status: PaymentStatus) => {
    const { error } = await client.from(TABLE).update({ status }).eq('id', id);
    if (error) {
      toast.error('Erro ao atualizar status');
    } else {
      setTransactions(prev => prev.map(t => t.id === id ? { ...t, status } : t));
    }
  }, [client]);

  // Bulk: atualiza status de várias transações de uma vez.
  // Optimistic update + revert on failure.
  const bulkUpdateStatus = useCallback(async (ids: string[], status: PaymentStatus): Promise<void> => {
    if (ids.length === 0) return;

    const idSet = new Set(ids);
    // Snapshot pra eventual rollback.
    const snapshot = transactionsRef.current.filter(t => idSet.has(t.id));

    // Optimistic
    setTransactions(prev => prev.map(t => idSet.has(t.id) ? { ...t, status } : t));

    const { error } = await client.from(TABLE).update({ status }).in('id', ids);
    if (error) {
      // Revert otimismo
      const prevById = new Map(snapshot.map(t => [t.id, t]));
      setTransactions(prev => prev.map(t => prevById.get(t.id) ?? t));
      toast.error(`Erro ao atualizar status: ${error.message}`);
      return;
    }

    toast.success(`${ids.length} ${ids.length === 1 ? 'transação atualizada' : 'transações atualizadas'}`);
  }, [client]);

  // Bulk: apaga várias transações de uma vez, com undo.
  const bulkDelete = useCallback(async (ids: string[]): Promise<void> => {
    if (ids.length === 0) return;

    const idSet = new Set(ids);
    // Snapshot COMPLETO das linhas pra permitir restore.
    const deletedRows = transactionsRef.current.filter(t => idSet.has(t.id));
    if (deletedRows.length === 0) return;

    // Optimistic remove
    setTransactions(prev => prev.filter(t => !idSet.has(t.id)));

    const { error } = await client.from(TABLE).delete().in('id', ids);
    if (error) {
      // Revert: re-inject snapshot
      setTransactions(prev => [...deletedRows, ...prev]);
      toast.error(`Erro ao apagar: ${error.message}`);
      return;
    }

    toast.success(
      `${ids.length} ${ids.length === 1 ? 'transação apagada' : 'transações apagadas'}`,
      {
        action: {
          label: 'Desfazer',
          onClick: async () => {
            // Re-insert em lote (sem o id pra deixar o supabase gerar um novo).
            // Como temos RLS/uuid, preservar o id permite manter referências;
            // tentamos inserir com id original.
            const rowsToRestore = deletedRows.map(({ ...rest }) => rest);
            const { data, error: restoreError } = await client
              .from(TABLE)
              .insert(rowsToRestore)
              .select();
            if (restoreError || !data) {
              toast.error('Não foi possível restaurar as transações.');
              return;
            }
            setTransactions(prev => [...data, ...prev]);
            toast.success(`${data.length} ${data.length === 1 ? 'transação restaurada' : 'transações restauradas'}`);
          },
        },
        duration: 6000,
      }
    );
  }, [client]);

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'entradas' | 'saidas'>('all');

  const availableMonths = useMemo(() => {
    const months = new Set(transactions.map((t) => t.month));
    for (let i = 0; i <= 12; i++) {
      months.add(format(addMonths(new Date(), i), 'yyyy-MM'));
    }
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    let base = transactions.filter((t) => t.month === selectedMonth);

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      base = base.filter(t =>
        t.description.toLowerCase().includes(lowerSearch) ||
        (t.category || '').toLowerCase().includes(lowerSearch) ||
        t.type.toLowerCase().includes(lowerSearch)
      );
    }

    if (typeFilter === 'entradas') {
      base = base.filter(t => t.type !== 'despesa');
    } else if (typeFilter === 'saidas') {
      base = base.filter(t => t.type === 'despesa');
    }

    return base;
  }, [transactions, selectedMonth, searchTerm, typeFilter]);

  const monthlyData = useMemo((): MonthlyData[] => {
    const grouped: Record<string, MonthlyData> = {};

    transactions
      .filter((t) => t.status !== 'cancelado')
      .forEach((t) => {
        if (!grouped[t.month]) {
          grouped[t.month] = { month: t.month, projetos: 0, recorrencia: 0, receita: 0, despesas: 0, total: 0, saldo: 0 };
        }

        const amount = Number(t.amount);
        const absAmount = Math.abs(amount);

        if (t.type !== 'despesa') {
          grouped[t.month].receita += amount;
        }

        if (t.type === 'projeto') {
          grouped[t.month].projetos += amount;
        } else if (t.type === 'recorrencia') {
          grouped[t.month].recorrencia += amount;
        } else if (t.type === 'despesa') {
          grouped[t.month].despesas += absAmount;
        }

        grouped[t.month].total += amount;
        grouped[t.month].saldo += amount;
      });

    return Object.values(grouped).sort((a, b) => b.month.localeCompare(a.month));
  }, [transactions]);

  const totalCaixa = useMemo(() => {
    return transactions
      .filter((t) => t.status === 'recebido')
      .reduce((acc, t) => acc + Number(t.amount), 0);
  }, [transactions]);

  const getMonthStats = useCallback((month: string) => {
    const monthTransactions = transactions.filter((t) => t.month === month);
    const nonCanceled = monthTransactions.filter(t => t.status !== 'cancelado');

    const totalReceita = nonCanceled
      .filter(t => t.type !== 'despesa')
      .reduce((acc, t) => acc + Number(t.amount), 0);

    const totalDespesa = nonCanceled
      .filter(t => t.type === 'despesa')
      .reduce((acc, t) => acc + Math.abs(Number(t.amount)), 0);

    return {
      recebido: nonCanceled
        .filter((t) => t.status === 'recebido' && t.type !== 'despesa')
        .reduce((acc, t) => acc + Number(t.amount), 0),
      pendente: nonCanceled
        .filter((t) => t.status === 'pendente' && t.type !== 'despesa')
        .reduce((acc, t) => acc + Math.abs(Number(t.amount)), 0),
      previsto: nonCanceled
        .filter((t) => t.status === 'previsto' && t.type !== 'despesa')
        .reduce((acc, t) => acc + Math.abs(Number(t.amount)), 0),
      totalReceita,
      totalDespesa,
      projetos: nonCanceled
        .filter((t) => t.type === 'projeto' && t.status === 'recebido')
        .reduce((acc, t) => acc + Number(t.amount), 0),
      recorrencia: nonCanceled
        .filter((t) => t.type === 'recorrencia' && t.status === 'recebido')
        .reduce((acc, t) => acc + Number(t.amount), 0),
      despesas: nonCanceled
        .filter((t) => t.type === 'despesa' && t.status === 'recebido')
        .reduce((acc, t) => acc + Math.abs(Number(t.amount)), 0),
      despesasPrevistas: nonCanceled
        .filter((t) => t.type === 'despesa' && (t.status === 'previsto' || t.status === 'pendente'))
        .reduce((acc, t) => acc + Math.abs(Number(t.amount)), 0),
    };
  }, [transactions]);

  const selectedMonthStats = useMemo(() => {
    return getMonthStats(selectedMonth);
  }, [selectedMonth, getMonthStats]);

  // Saldo anterior: override manual ou auto-calculado
  const openingBalance = useMemo(() => {
    if (openingBalanceOverrides[selectedMonth] !== undefined) {
      return openingBalanceOverrides[selectedMonth];
    }
    const currentMonth = new Date().toISOString().substring(0, 7);
    let balance = transactions
      .filter(t => t.status === 'recebido' && t.month < selectedMonth)
      .reduce((acc, t) => acc + Number(t.amount), 0);
    if (selectedMonth > currentMonth) {
      balance += transactions
        .filter(t => t.month >= currentMonth && t.month < selectedMonth && (t.status === 'pendente' || t.status === 'previsto'))
        .reduce((acc, t) => acc + Number(t.amount), 0);
    }
    return balance;
  }, [selectedMonth, openingBalanceOverrides, transactions]);

  const setOpeningBalance = useCallback(async (month: string, value: number | null) => {
    // Update otimista (UI responde imediatamente).
    let nextState: Record<string, number> = {};
    setOpeningBalanceOverrides(prev => {
      nextState = { ...prev };
      if (value === null) delete nextState[month];
      else nextState[month] = value;
      return nextState;
    });

    // Mantém localStorage como cache offline.
    try {
      localStorage.setItem(OPENING_BALANCES_LS_KEY, JSON.stringify(nextState));
    } catch {}

    // Sincroniza com Supabase.
    if (value === null) {
      const { error } = await client
        .from(OPENING_BALANCES_TABLE)
        .delete()
        .eq('month', month);
      if (error) {
        console.error(error);
        toast.error('Saldo salvo local, mas falhou ao sincronizar.');
      }
    } else {
      const { error } = await client
        .from(OPENING_BALANCES_TABLE)
        .upsert({ month, value, updated_at: new Date().toISOString() });
      if (error) {
        console.error(error);
        toast.error('Saldo salvo local, mas falhou ao sincronizar.');
      }
    }
  }, [client]);

  const getDailyCashFlow = useCallback(() => {
    const start = parseISO(`${selectedMonth}-01`);
    const end = endOfMonth(start);
    const days = eachDayOfInterval({ start, end });

    let runningBalance = openingBalance;

    return days.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayTransactions = transactions.filter(t => t.date === dateStr);

      const dayIncome = dayTransactions
        .filter(t => (t.status === 'recebido' || t.status === 'previsto' || t.status === 'pendente') && t.type !== 'despesa')
        .reduce((acc, t) => acc + Number(t.amount), 0);

      const dayExpense = dayTransactions
        .filter(t => (t.status === 'recebido' || t.status === 'previsto' || t.status === 'pendente') && t.type === 'despesa')
        .reduce((acc, t) => acc + Math.abs(Number(t.amount)), 0);

      const netChange = dayIncome - dayExpense;
      runningBalance += netChange;

      return {
        date: dateStr,
        income: dayIncome,
        expense: dayExpense,
        balance: runningBalance,
      };
    });
  }, [transactions, selectedMonth, openingBalance]);

  const dfcData = useMemo(() => getDailyCashFlow(), [getDailyCashFlow]);

  return {
    transactions,
    filteredTransactions,
    selectedMonth,
    setSelectedMonth,
    availableMonths,
    addTransaction,
    addInstallment,
    deleteTransaction,
    updateTransactionStatus,
    editTransaction,
    bulkImport,
    bulkUpdateStatus,
    bulkDelete,
    replicateRecurringToNextMonth,
    searchTerm,
    setSearchTerm,
    typeFilter,
    setTypeFilter,
    monthlyData,
    totalCaixa,
    selectedMonthStats,
    dfcData,
    loading,
    openingBalance,
    setOpeningBalance,
  };
}
