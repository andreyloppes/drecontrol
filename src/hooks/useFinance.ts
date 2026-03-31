import { useState, useEffect, useMemo, useCallback } from 'react';
import { Transaction, MonthlyData, PaymentStatus } from '@/types/finance';
import { format, parseISO, endOfMonth, eachDayOfInterval, addMonths } from 'date-fns';
import { useSupabase } from '@/context/SupabaseContext';
import { toast } from 'sonner';

const TABLE = 'transactions';

export function useFinance() {
  const { client } = useSupabase();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedMonth, setSelectedMonth] = useState(() =>
    new Date().toISOString().substring(0, 7)
  );

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

  const addTransaction = async (transaction: Omit<Transaction, 'id' | 'month'>) => {
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
    } else if (data) {
      setTransactions(prev => [data, ...prev]);
      toast.success('Transação salva!');
    }
  };

  const deleteTransaction = async (id: string) => {
    const { error } = await client.from(TABLE).delete().eq('id', id);
    if (error) {
      toast.error(`Erro ao apagar: ${error.message}`);
    } else {
      setTransactions(prev => prev.filter(t => t.id !== id));
      toast.success('Transação apagada!');
    }
  };

  const editTransaction = async (id: string, updates: Partial<Transaction>) => {
    let processedUpdates = { ...updates };

    if (updates.amount !== undefined && updates.type !== undefined) {
      processedUpdates.amount = updates.type === 'despesa' ? -Math.abs(updates.amount) : Math.abs(updates.amount);
    } else if (updates.amount !== undefined) {
      const target = transactions.find(t => t.id === id);
      if (target) {
        const type = updates.type || target.type;
        processedUpdates.amount = type === 'despesa' ? -Math.abs(updates.amount) : Math.abs(updates.amount);
      }
    } else if (updates.type !== undefined) {
      // Type changed without amount — recalculate sign of existing amount
      const target = transactions.find(t => t.id === id);
      if (target) {
        processedUpdates.amount = updates.type === 'despesa' ? -Math.abs(target.amount) : Math.abs(target.amount);
      }
    }

    if (updates.date) {
      processedUpdates.month = updates.date.substring(0, 7);
    }

    const { error } = await client.from(TABLE).update(processedUpdates).eq('id', id);
    if (error) {
      toast.error(`Erro ao editar: ${error.message}`);
    } else {
      setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...processedUpdates } : t));
      toast.success('Transação atualizada!');
    }
  };

  const bulkImport = async (entries: Omit<Transaction, 'id'>[]) => {
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
  };

  const updateTransactionStatus = async (id: string, status: PaymentStatus) => {
    const { error } = await client.from(TABLE).update({ status }).eq('id', id);
    if (error) {
      toast.error('Erro ao atualizar status');
    } else {
      setTransactions(prev => prev.map(t => t.id === id ? { ...t, status } : t));
    }
  };

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
    let base = transactions;
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      base = base.filter(t =>
        t.description.toLowerCase().includes(lowerSearch) ||
        (t.category || '').toLowerCase().includes(lowerSearch) ||
        t.type.toLowerCase().includes(lowerSearch)
      );
    } else {
      base = base.filter((t) => t.month === selectedMonth);
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

  const getDailyCashFlow = useCallback(() => {
    const start = parseISO(`${selectedMonth}-01`);
    const end = endOfMonth(start);
    const days = eachDayOfInterval({ start, end });
    const currentMonth = new Date().toISOString().substring(0, 7);

    let runningBalance = 0;

    runningBalance += transactions
      .filter(t => t.status === 'recebido' && t.month < selectedMonth)
      .reduce((acc, t) => acc + Number(t.amount), 0);

    if (selectedMonth > currentMonth) {
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
    editTransaction,
    bulkImport,
    searchTerm,
    setSearchTerm,
    typeFilter,
    setTypeFilter,
    monthlyData,
    totalCaixa,
    selectedMonthStats,
    dfcData,
    loading,
  };
}
