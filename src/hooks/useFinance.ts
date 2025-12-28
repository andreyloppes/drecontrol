import { useState, useEffect, useMemo, useCallback } from 'react';
import { Transaction, MonthlyData, PaymentStatus } from '@/types/finance';

const STORAGE_KEY = 'dre-transactions';

export function useFinance() {
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    // Migration: add status field to old transactions
    return parsed.map((t: Transaction) => ({
      ...t,
      status: t.status || 'recebido',
    }));
  });

  const [selectedMonth, setSelectedMonth] = useState(() => 
    new Date().toISOString().substring(0, 7)
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  }, [transactions]);

  const addTransaction = (transaction: Omit<Transaction, 'id' | 'month'>) => {
    const month = transaction.date.substring(0, 7);
    const newTransaction: Transaction = {
      ...transaction,
      id: crypto.randomUUID(),
      month,
    };
    setTransactions((prev) => [...prev, newTransaction]);
  };

  const deleteTransaction = (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const updateTransactionStatus = (id: string, status: PaymentStatus) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status } : t))
    );
  };

  // Available months from transactions
  const availableMonths = useMemo(() => {
    const months = new Set(transactions.map((t) => t.month));
    months.add(new Date().toISOString().substring(0, 7)); // Always include current month
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [transactions]);

  // Filtered transactions by selected month
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => t.month === selectedMonth);
  }, [transactions, selectedMonth]);

  const monthlyData = useMemo((): MonthlyData[] => {
    const grouped: Record<string, MonthlyData> = {};

    transactions
      .filter((t) => t.status === 'recebido')
      .forEach((t) => {
        if (!grouped[t.month]) {
          grouped[t.month] = { month: t.month, projetos: 0, recorrencia: 0, total: 0 };
        }
        if (t.type === 'projeto') {
          grouped[t.month].projetos += t.amount;
        } else {
          grouped[t.month].recorrencia += t.amount;
        }
        grouped[t.month].total += t.amount;
      });

    return Object.values(grouped).sort((a, b) => b.month.localeCompare(a.month));
  }, [transactions]);

  // Total cash (all time, only received)
  const totalCaixa = useMemo(() => {
    return transactions
      .filter((t) => t.status === 'recebido')
      .reduce((acc, t) => acc + t.amount, 0);
  }, [transactions]);

  // Stats for selected month
  const getMonthStats = useCallback((month: string) => {
    const monthTransactions = transactions.filter((t) => t.month === month);
    
    return {
      recebido: monthTransactions
        .filter((t) => t.status === 'recebido')
        .reduce((acc, t) => acc + t.amount, 0),
      pendente: monthTransactions
        .filter((t) => t.status === 'pendente')
        .reduce((acc, t) => acc + t.amount, 0),
      previsto: monthTransactions
        .filter((t) => t.status === 'previsto')
        .reduce((acc, t) => acc + t.amount, 0),
      projetos: monthTransactions
        .filter((t) => t.type === 'projeto' && t.status === 'recebido')
        .reduce((acc, t) => acc + t.amount, 0),
      recorrencia: monthTransactions
        .filter((t) => t.type === 'recorrencia' && t.status === 'recebido')
        .reduce((acc, t) => acc + t.amount, 0),
    };
  }, [transactions]);

  const selectedMonthStats = useMemo(() => {
    return getMonthStats(selectedMonth);
  }, [selectedMonth, getMonthStats]);

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
  };
}
