export type TransactionType = 'projeto' | 'recorrencia' | 'despesa';

export type PaymentStatus = 'previsto' | 'pendente' | 'recebido' | 'cancelado';

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  status: PaymentStatus;
  date: string;
  month: string; // format: "YYYY-MM"
}

export interface MonthlyData {
  month: string;
  projetos: number;
  recorrencia: number;
  despesas: number;
  total: number;
  saldo: number;
}
