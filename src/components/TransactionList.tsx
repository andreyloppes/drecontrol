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
  recebido: { label: 'Recebido', variant: 'default', icon: <Check className="w-3 h-3" />, className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  pendente: { label: 'Pendente', variant: 'secondary', icon: <Clock className="w-3 h-3" />, className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  previsto: { label: 'Previsto', variant: 'outline', icon: <Calendar className="w-3 h-3" />, className: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
  cancelado: { label: 'Cancelado', variant: 'destructive', icon: <X className="w-3 h-3" />, className: 'bg-red-500/20 text-red-400 border-red-500/30' },
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
    <div className="space-y-3 p-1">
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="glass border-white/10 backdrop-blur-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl tracking-tight">Editar Transação</DialogTitle>
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
            className="group relative flex flex-col md:flex-row items-start md:items-center justify-between p-5 glass rounded-2xl border border-white/5 hover:border-white/10 transition-all duration-300 hover:shadow-lg gap-4"
          >
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className={`p-3 rounded-xl transition-all duration-300 group-hover:scale-110 ${t.type === 'projeto'
                  ? 'bg-purple-500/20 text-purple-400'
                  : (t.amount < 0 ? 'bg-red-500/20 text-red-400' : 'bg-cyan-500/20 text-cyan-400')
                }`}>
                {t.type === 'projeto' ? (
                  <Briefcase className="w-5 h-5" />
                ) : (
                  <RefreshCw className="w-5 h-5" />
                )}
              </div>
              <div className="flex flex-col gap-1 overflow-hidden">
                <p className="font-semibold tracking-tight truncate group-hover:text-foreground/90">{t.description}</p>
                <div className="flex items-center gap-2 text-[10px] md:text-sm text-muted-foreground font-mono uppercase tracking-wider">
                  <span>{formatDate(t.date)}</span>
                  <span className="opacity-30">•</span>
                  <span>{t.type === 'projeto' ? 'Projeto' : 'Recorrência'}</span>
                  {t.category && (
                    <>
                      <span className="opacity-30">•</span>
                      <span className="bg-white/5 px-2 py-0.5 rounded text-[9px] border border-white/5">
                        {t.category}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto pt-4 md:pt-0 border-t md:border-t-0 border-white/5">
              <div className="flex items-center gap-3">
                {(t.status === 'pendente' || t.status === 'previsto') && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 h-9 w-9 rounded-xl border border-emerald-500/20"
                    title="Marcar como Recebido/Pago"
                    onClick={() => onUpdateStatus(t.id, 'recebido')}
                  >
                    <Check className="w-5 h-5" />
                  </Button>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Badge className={`cursor-pointer gap-1.5 py-1.5 px-3 rounded-xl border transition-all hover:brightness-125 ${config.className}`}>
                      {config.icon}
                      <span className="font-mono text-[10px] uppercase tracking-wider font-bold">{config.label}</span>
                    </Badge>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="glass border-white/10">
                    {(Object.keys(statusConfig) as PaymentStatus[]).map((status) => (
                      <DropdownMenuItem
                        key={status}
                        onClick={() => onUpdateStatus(t.id, status)}
                        className="gap-2 focus:bg-white/10"
                      >
                        {statusConfig[status].icon}
                        {statusConfig[status].label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex items-center gap-4">
                <span className={`font-mono font-bold text-lg md:text-xl tracking-tighter ${t.amount < 0 ? 'text-red-400' : 'text-emerald-400'
                  }`}>
                  {formatCurrency(t.amount)}
                </span>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditingId(t.id);
                      setIsDialogOpen(true);
                    }}
                    className="h-9 w-9 border border-white/5 hover:bg-white/10 rounded-xl"
                  >
                    <Pencil className="w-4 h-4 opacity-70" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(t.id)}
                    className="h-9 w-9 border border-red-500/10 hover:bg-red-500/20 hover:text-red-400 rounded-xl"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
