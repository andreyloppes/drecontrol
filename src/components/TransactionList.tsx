import { Transaction } from '@/types/finance';
import { Button } from '@/components/ui/button';
import { Trash2, Briefcase, RefreshCw } from 'lucide-react';

interface TransactionListProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
}

export function TransactionList({ transactions, onDelete }: TransactionListProps) {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const sortedTransactions = [...transactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  if (transactions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {sortedTransactions.slice(0, 10).map((t) => (
        <div
          key={t.id}
          className="border-2 border-foreground p-4 flex items-center justify-between hover:shadow-sm transition-shadow"
        >
          <div className="flex items-center gap-4">
            <div className={`p-2 border-2 border-foreground ${
              t.type === 'projeto' ? 'bg-secondary' : 'bg-foreground text-background'
            }`}>
              {t.type === 'projeto' ? (
                <Briefcase className="w-4 h-4" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </div>
            <div>
              <p className="font-medium">{t.description}</p>
              <p className="text-sm text-muted-foreground">
                {formatDate(t.date)} • {t.type === 'projeto' ? 'Projeto' : 'Recorrência'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-mono font-bold text-lg">{formatCurrency(t.amount)}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(t.id)}
              className="border-2 border-foreground hover:bg-destructive hover:text-destructive-foreground"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
