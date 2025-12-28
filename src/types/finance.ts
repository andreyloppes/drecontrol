export type TransactionType = 'projeto' | 'recorrencia';

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  date: string;
  month: string; // format: "YYYY-MM"
}

export interface MonthlyData {
  month: string;
  projetos: number;
  recorrencia: number;
  total: number;
}
