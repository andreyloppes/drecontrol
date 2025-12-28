import { useState, useEffect, useMemo } from 'react';
import { Transaction, MonthlyData } from '@/types/finance';

const STORAGE_KEY = 'dre-transactions';

export function useFinance() {
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  });

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

  const monthlyData = useMemo((): MonthlyData[] => {
    const grouped: Record<string, MonthlyData> = {};

    transactions.forEach((t) => {
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

  const totalCaixa = useMemo(() => {
    return transactions.reduce((acc, t) => acc + t.amount, 0);
  }, [transactions]);

  const currentMonthTotal = useMemo(() => {
    const currentMonth = new Date().toISOString().substring(0, 7);
    return transactions
      .filter((t) => t.month === currentMonth)
      .reduce((acc, t) => acc + t.amount, 0);
  }, [transactions]);

  const currentMonthProjetos = useMemo(() => {
    const currentMonth = new Date().toISOString().substring(0, 7);
    return transactions
      .filter((t) => t.month === currentMonth && t.type === 'projeto')
      .reduce((acc, t) => acc + t.amount, 0);
  }, [transactions]);

  const currentMonthRecorrencia = useMemo(() => {
    const currentMonth = new Date().toISOString().substring(0, 7);
    return transactions
      .filter((t) => t.month === currentMonth && t.type === 'recorrencia')
      .reduce((acc, t) => acc + t.amount, 0);
  }, [transactions]);

  return {
    transactions,
    addTransaction,
    deleteTransaction,
    monthlyData,
    totalCaixa,
    currentMonthTotal,
    currentMonthProjetos,
    currentMonthRecorrencia,
  };
}
