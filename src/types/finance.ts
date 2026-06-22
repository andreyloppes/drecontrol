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
  installment_id?: string | null;
  installment_index?: number | null;
  installment_total?: number | null;
}

export interface MonthlyData {
  month: string;
  projetos: number;
  recorrencia: number;
  receita: number;
  despesas: number;
  total: number;
  saldo: number;
}

export interface MonthStats {
  recebido: number;
  pendente: number;
  previsto: number;
  totalReceita: number;
  totalDespesa: number;
  projetos: number;
  recorrencia: number;
  despesas: number;
  despesasPrevistas: number;
}

export interface DailyCashFlow {
  date: string;
  income: number;
  expense: number;
  balance: number;
}

export type TypeFilter = 'all' | 'entradas' | 'saidas';
