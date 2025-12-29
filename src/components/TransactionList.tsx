import { useState } from 'react';
import { Transaction, PaymentStatus } from '@/types/finance';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Briefcase, RefreshCw, Check, Clock, Calendar, X, Pencil } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AddTransactionForm } from './AddTransactionForm';

interface TransactionListProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
  onUpdateStatus: (id: string, status: PaymentStatus) => void;
  onEdit: (id: string, updates: Partial<Transaction>) => void;
}

const statusConfig: Record<PaymentStatus, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive'; icon: React.ReactNode; className: string }> = {
  recebido: { label: 'Recebido', variant: 'default', icon: <Check className="w-3 h-3" />, className: 'bg-chart-2 hover:bg-chart-2/80 text-foreground' },
  pendente: { label: 'Pendente', variant: 'secondary', icon: <Clock className="w-3 h-3" />, className: 'bg-chart-4 hover:bg-chart-4/80 text-foreground' },
  previsto: { label: 'Previsto', variant: 'outline', icon: <Calendar className="w-3 h-3" />, className: 'bg-chart-5 hover:bg-chart-5/80 text-foreground' },
  cancelado: { label: 'Cancelado', variant: 'destructive', icon: <X className="w-3 h-3" />, className: 'bg-destructive hover:bg-destructive/80 text-destructive-foreground' },
};

export function TransactionList({ transactions, onDelete, onUpdateStatus, onEdit }: TransactionListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Transação</DialogTitle>
          </DialogHeader>
          {editingId && (
            <AddTransactionForm
              initialData={transactions.find(t => t.id === editingId)}
              onAdd={(updates) => {
                onEdit(editingId, updates);
                setIsDialogOpen(false);
                setEditingId(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {sortedTransactions.map((t) => {
        const config = statusConfig[t.status];
        return (
          <div
            key={t.id}
            className="border-2 border-foreground p-4 flex items-center justify-between hover:shadow-sm transition-shadow"
          >
            <div className="flex items-center gap-4">
              <div className={`p-2 border-2 border-foreground ${t.type === 'projeto' ? 'bg-secondary' : 'bg-foreground text-background'
                }`}>
                {t.type === 'projeto' ? (
                  <Briefcase className="w-4 h-4" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
              </div>
              <div>
                <p className="font-medium">{t.description}</p>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  {formatDate(t.date)} • {t.type === 'projeto' ? 'Projeto' : 'Recorrência'}
                  {t.category && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-muted text-muted-foreground border">
                      {t.category}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {(t.status === 'pendente' || t.status === 'previsto') && (
                <Button
                  variant="outline"
                  size="icon"
                  className="border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50 h-8 w-8"
                  title="Marcar como Recebido/Pago"
                  onClick={() => onUpdateStatus(t.id, 'recebido')}
                >
                  <Check className="w-4 h-4" />
                </Button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Badge className={`cursor-pointer gap-1 ${config.className}`}>
                    {config.icon}
                    {config.label}
                  </Badge>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {(Object.keys(statusConfig) as PaymentStatus[]).map((status) => (
                    <DropdownMenuItem
                      key={status}
                      onClick={() => onUpdateStatus(t.id, status)}
                      className="gap-2"
                    >
                      {statusConfig[status].icon}
                      {statusConfig[status].label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <span className="font-mono font-bold text-lg">{formatCurrency(t.amount)}</span>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setEditingId(t.id);
                  setIsDialogOpen(true);
                }}
                className="border-2 border-foreground hover:bg-muted"
              >
                <Pencil className="w-4 h-4" />
              </Button>

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
        );
      })}
    </div>
  );
}
