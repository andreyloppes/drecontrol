import { useState, useEffect, useMemo, useCallback } from 'react';
import { Transaction, MonthlyData, PaymentStatus } from '@/types/finance';
import { addDays, format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, addMonths } from 'date-fns';
import { useSupabase } from '@/context/SupabaseContext';
import { toast } from 'sonner';

const STORAGE_KEY = 'dre-transactions';

export function useFinance() {
  const { client, isConnected } = useSupabase();
  const [localTransactions, setLocalTransactions] = useState<Transaction[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    try {
      const parsed = JSON.parse(stored);
      return parsed.map((t: Transaction) => ({
        ...t,
        status: t.status || 'recebido',
        category: t.category || 'Geral',
      }));
    } catch {
      return [];
    }
  });

  const [remoteTransactions, setRemoteTransactions] = useState<Transaction[]>([]);

  const transactions = useMemo(() => isConnected ? remoteTransactions : localTransactions, [isConnected, localTransactions, remoteTransactions]);

  const [selectedMonth, setSelectedMonth] = useState(() =>
    new Date().toISOString().substring(0, 7)
  );

  // Sync Log (Local)
  useEffect(() => {
    if (!isConnected) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(localTransactions));
    }
  }, [localTransactions, isConnected]);

  // Fetch Remote Data
  useEffect(() => {
    async function fetchTransactions() {
      if (!client || !isConnected) return;

      const { data, error } = await client
        .from('transactions')
        .select('*');

      if (error) {
        toast.error('Erro ao buscar transações do banco.');
        console.error(error);
      } else {
        setRemoteTransactions(data || []);
      }
    }

    fetchTransactions();
  }, [client, isConnected]);

  const addTransaction = async (transaction: Omit<Transaction, 'id' | 'month'>) => {
    const month = transaction.date.substring(0, 7);
    const amount = transaction.type === 'despesa' ? -Math.abs(transaction.amount) : Math.abs(transaction.amount);

    const newTransactionBase = {
      ...transaction,
      month,
      amount,
      // Default to "recebido" but respect what was passed (e.g. from Forecast logic in future) if needed
      // Actually the logic above for amount is fine.
    };

    if (isConnected && client) {
      const { data, error } = await client
        .from('transactions')
        .insert([newTransactionBase])
        .select()
        .single();

      if (error) {
        toast.error(`Erro ao salvar: ${error.message || error.details || 'Erro desconhecido'}`);
        console.error(error);
      } else if (data) {
        setRemoteTransactions(prev => [...prev, data]);
        toast.success('Salvo no Banco de Dados');
      }
    } else {
      const newTransaction: Transaction = {
        ...newTransactionBase,
        id: crypto.randomUUID(),
      };
      setLocalTransactions((prev) => [...prev, newTransaction]);
      toast.success('Salvo localmente');
    }
  };

  const deleteTransaction = async (id: string) => {
    if (isConnected && client) {
      const { error } = await client.from('transactions').delete().eq('id', id);
      if (error) {
        toast.error(`Erro ao apagar: ${error.message}`);
      } else {
        setRemoteTransactions(prev => prev.filter(t => t.id !== id));
        toast.success('Apagado do Banco de Dados');
      }
    } else {
      setLocalTransactions((prev) => prev.filter((t) => t.id !== id));
      toast.success('Apagado localmente');
    }
  };

  const editTransaction = async (id: string, updates: Partial<Transaction>) => {
    // Recalculate 'amount' if needed based on type (handled by form usually, but good to be safe if updates contains amount/type)
    // For simplicity, we assume 'updates' comes prepared properly OR we don't mess with sign here if not needed.
    // However, AddTransactionForm logic regarding negative sign for expenses is important.
    // Let's assume the form passes the absolute amount and the type, so we might need to adjust sign if `amount` is present.

    let processedUpdates = { ...updates };
    if (updates.amount !== undefined && updates.type !== undefined) {
      processedUpdates.amount = updates.type === 'despesa' ? -Math.abs(updates.amount) : Math.abs(updates.amount);
    } else if (updates.amount !== undefined) {
      // If type isn't changing but amount is, we need to know the current type to sign it correctly?
      // This gets tricky. It's better if the Form sends the FINAL signed amount or we find the transaction.
      // For safety, let's look up the transaction to check type if not in updates.
      const target = transactions.find(t => t.id === id);
      if (target) {
        const type = updates.type || target.type;
        processedUpdates.amount = type === 'despesa' ? -Math.abs(updates.amount) : Math.abs(updates.amount);
      }
    }

    // Also update month if date changed
    if (updates.date) {
      processedUpdates.month = updates.date.substring(0, 7);
    }

    if (isConnected && client) {
      const { error } = await client.from('transactions').update(processedUpdates).eq('id', id);
      if (error) {
        toast.error(`Erro ao editar: ${error.message}`);
      } else {
        setRemoteTransactions(prev => prev.map(t => t.id === id ? { ...t, ...processedUpdates } : t));
        toast.success('Transação atualizada');
      }
    } else {
      setLocalTransactions(prev => prev.map(t => t.id === id ? { ...t, ...processedUpdates } : t));
      toast.success('Editado localmente');
    }
  };

  const updateTransactionStatus = async (id: string, status: PaymentStatus) => {
    if (isConnected && client) {
      const { error } = await client.from('transactions').update({ status }).eq('id', id);
      if (error) {
        toast.error('Erro ao atualizar status');
      } else {
        setRemoteTransactions(prev => prev.map(t => t.id === id ? { ...t, status } : t));
      }
    } else {
      setLocalTransactions((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status } : t))
      );
    }
  };

  // Available months from transactions
  const availableMonths = useMemo(() => {
    const months = new Set(transactions.map((t) => t.month));
    const currentParams = new Date();

    // Always include current month and next 12 months
    for (let i = 0; i <= 12; i++) {
      months.add(format(addMonths(new Date(), i), 'yyyy-MM'));
    }

    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [transactions]);

  // Filtered transactions by selected month
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => t.month === selectedMonth);
  }, [transactions, selectedMonth]);

  const monthlyData = useMemo((): MonthlyData[] => {
    const grouped: Record<string, MonthlyData> = {};

    transactions
      // .filter((t) => t.status === 'recebido') // Removed filter to include projected/pending for the monthly summary Forecast
      .forEach((t) => {
        if (!grouped[t.month]) {
          grouped[t.month] = { month: t.month, projetos: 0, recorrencia: 0, receita: 0, despesas: 0, total: 0, saldo: 0 };
        }

        const amount = Number(t.amount); // Ensure number type
        const absAmount = Math.abs(amount);

        // Sum Revenues (Positive values from projects or recurring, or anything not Expense)
        if (t.type !== 'despesa') {
          grouped[t.month].receita += amount;
        }

        if (t.type === 'projeto') {
          grouped[t.month].projetos += amount;
        } else if (t.type === 'recorrencia') {
          grouped[t.month].recorrencia += amount;
        } else if (t.type === 'despesa') {
          grouped[t.month].despesas += absAmount; // Storing as positive number for "Total Expense" column
        }

        // Logic for Total/Saldo in the table:
        // Current logic: total includes expenses as negative. 
        // User asked for "Resultado Esperado" -> Net Result.

        grouped[t.month].total += amount;
        grouped[t.month].saldo += amount;
      });

    return Object.values(grouped).sort((a, b) => b.month.localeCompare(a.month));
  }, [transactions]);

  // Total cash (all time, only received)
  const totalCaixa = useMemo(() => {
    return transactions
      .filter((t) => t.status === 'recebido')
      .reduce((acc, t) => acc + Number(t.amount), 0);
  }, [transactions]);

  // Stats for selected month
  const getMonthStats = useCallback((month: string) => {
    const monthTransactions = transactions.filter((t) => t.month === month);

    return {
      recebido: monthTransactions
        .filter((t) => t.status === 'recebido' && t.type !== 'despesa')
        .reduce((acc, t) => acc + Number(t.amount), 0),
      pendente: monthTransactions
        .filter((t) => t.status === 'pendente' && t.type !== 'despesa')
        .reduce((acc, t) => acc + Math.abs(Number(t.amount)), 0),
      previsto: monthTransactions
        .filter((t) => t.status === 'previsto' && t.type !== 'despesa')
        .reduce((acc, t) => acc + Math.abs(Number(t.amount)), 0),
      projetos: monthTransactions
        .filter((t) => t.type === 'projeto' && t.status === 'recebido')
        .reduce((acc, t) => acc + Number(t.amount), 0),
      recorrencia: monthTransactions
        .filter((t) => t.type === 'recorrencia' && t.status === 'recebido')
        .reduce((acc, t) => acc + Number(t.amount), 0),
      despesas: monthTransactions
        .filter((t) => t.type === 'despesa' && t.status === 'recebido')
        .reduce((acc, t) => acc + Math.abs(Number(t.amount)), 0),
      despesasPrevistas: monthTransactions
        .filter((t) => t.type === 'despesa' && (t.status === 'previsto' || t.status === 'pendente'))
        .reduce((acc, t) => acc + Math.abs(Number(t.amount)), 0),
    };
  }, [transactions]);

  const selectedMonthStats = useMemo(() => {
    return getMonthStats(selectedMonth);
  }, [selectedMonth, getMonthStats]);

  // Daily Cash Flow (DFC) Logic
  const getDailyCashFlow = useCallback(() => {
    // Determine range
    const start = parseISO(`${selectedMonth}-01`);
    const end = endOfMonth(start);
    const days = eachDayOfInterval({ start, end });
    const currentMonth = new Date().toISOString().substring(0, 7);

    // Initial balance calculation 
    // If selected month is in the future, we need to assume everything from now until then happened as planned
    // If selected month is past/present, we stick to realized for 'runningBalance' base, 
    // BUT user wants to see projection.

    // Strategy: 
    // Base Balance = All 'recebido' transactions strictly BEFORE the selected month.
    // PLUS: If selectedMonth > currentMonth, we add 'previsto'/'pendente' from (Current Month) up to (Selected Month - 1).

    let runningBalance = 0;

    // 1. Realized Base (Always count realized stuff from the past)
    runningBalance += transactions
      .filter(t => t.status === 'recebido' && t.month < selectedMonth)
      .reduce((acc, t) => acc + Number(t.amount), 0);

    // 2. Projected Gap (If viewing future, add projected income/expense from intervening months)
    if (selectedMonth > currentMonth) {
      // We need to simulate the flow for the gap months
      const gapTransactions = transactions.filter(t =>
        t.month >= currentMonth &&
        t.month < selectedMonth &&
        (t.status === 'pendente' || t.status === 'previsto')
      );

      runningBalance += gapTransactions.reduce((acc, t) => acc + Number(t.amount), 0);
    }

    return days.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayTransactions = transactions.filter(t => t.date === dateStr);

      // For the CHART display of the selected month:
      // We accept 'recebido' OR 'previsto' OR 'pendente' to show the projection
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
  }, [transactions, selectedMonth]);

  const dfcData = useMemo(() => getDailyCashFlow(), [getDailyCashFlow]);

  return {
    transactions,
    filteredTransactions,
    selectedMonth,
    setSelectedMonth,
    availableMonths,
    addTransaction,
    deleteTransaction,
    updateTransactionStatus,
    monthlyData,
    totalCaixa,
    selectedMonthStats,
    dfcData,
  };
}
