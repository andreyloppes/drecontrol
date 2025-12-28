export type TransactionType = 'projeto' | 'recorrencia';

export type PaymentStatus = 'previsto' | 'pendente' | 'recebido' | 'cancelado';

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  status: PaymentStatus;
  date: string;
  month: string; // format: "YYYY-MM"
}

export interface MonthlyData {
  month: string;
  projetos: number;
  recorrencia: number;
  total: number;
}
