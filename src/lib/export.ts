import type { Transaction } from '@/types/finance';

const STATUS_LABEL: Record<Transaction['status'], string> = {
  recebido: 'Recebido/Pago',
  pendente: 'Pendente',
  previsto: 'Previsto',
  cancelado: 'Cancelado',
};

const TYPE_LABEL: Record<Transaction['type'], string> = {
  projeto: 'Projeto',
  recorrencia: 'Recorrência',
  despesa: 'Despesa',
};

function escapeCSV(value: string): string {
  if (/[",;\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatBRL(n: number): string {
  return n.toFixed(2).replace('.', ',');
}

export function transactionsToCSV(transactions: Transaction[]): string {
  const header = ['Data', 'Descrição', 'Tipo', 'Categoria', 'Status', 'Valor (R$)'];
  const lines = [header.map(escapeCSV).join(';')];

  for (const t of transactions) {
    const row = [
      t.date,
      t.description,
      TYPE_LABEL[t.type] ?? t.type,
      t.category || '',
      STATUS_LABEL[t.status] ?? t.status,
      formatBRL(Number(t.amount)),
    ];
    lines.push(row.map(escapeCSV).join(';'));
  }

  return lines.join('\r\n');
}

export function downloadCSV(filename: string, csv: string): void {
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportTransactionsCSV(transactions: Transaction[], month?: string): void {
  const csv = transactionsToCSV(transactions);
  const suffix = month ? `-${month}` : '';
  downloadCSV(`drecontrol${suffix}.csv`, csv);
}
