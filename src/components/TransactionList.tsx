import { useState } from 'react';
import { Transaction, PaymentStatus } from '@/types/finance';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Briefcase, RefreshCw, Check, Clock, Calendar, X, Pencil, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
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

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const statusConfig: Record<PaymentStatus, { label: string; icon: React.ReactNode; className: string }> = {
  recebido: { label: 'Recebido', icon: <Check className="w-3 h-3" />, className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  pendente: { label: 'Pendente', icon: <Clock className="w-3 h-3" />, className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  previsto: { label: 'Previsto', icon: <Calendar className="w-3 h-3" />, className: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
  cancelado: { label: 'Cancelado', icon: <X className="w-3 h-3" />, className: 'bg-red-500/20 text-red-400 border-red-500/30' },
};

export function TransactionList({ transactions, onDelete, onUpdateStatus, onEdit }: TransactionListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const formatDate = (date: string) =>
    new Date(date + 'T12:00:00').toLocaleDateString('pt-BR');

  const sortedTransactions = [...transactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  if (transactions.length === 0) return null;

  // Pagination
  const totalPages = Math.ceil(sortedTransactions.length / pageSize);
  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = startIdx + pageSize;
  const pageTransactions = sortedTransactions.slice(startIdx, endIdx);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-0">
      {/* Edit Dialog */}
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

      {/* Table Header */}
      <div className="hidden md:grid grid-cols-[1fr_120px_140px_100px] gap-4 px-5 py-3 border-b border-white/5 text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
        <span>Descrição</span>
        <span className="text-center">Status</span>
        <span className="text-right">Valor</span>
        <span className="text-center">Ações</span>
      </div>

      {/* Transaction Rows */}
      <div className="divide-y divide-white/5">
        {pageTransactions.map((t) => {
          const config = statusConfig[t.status];
          return (
            <div
              key={t.id}
              className="group flex flex-col md:grid md:grid-cols-[1fr_120px_140px_100px] gap-3 md:gap-4 items-start md:items-center px-5 py-4 hover:bg-white/[0.02] transition-colors"
            >
              {/* Description + Date + Category */}
              <div className="flex items-center gap-3 w-full md:w-auto min-w-0">
                <div className={`p-2 rounded-lg flex-shrink-0 ${
                  t.type === 'projeto'
                    ? 'bg-purple-500/15 text-purple-400'
                    : t.amount < 0 ? 'bg-red-500/15 text-red-400' : 'bg-emerald-500/15 text-emerald-400'
                }`}>
                  {t.type === 'projeto' ? <Briefcase className="w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{t.description}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] text-muted-foreground font-mono">{formatDate(t.date)}</span>
                    {t.category && (
                      <>
                        <span className="text-muted-foreground/30 text-[10px]">·</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-muted-foreground border border-white/5 font-mono">
                          {t.category}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="flex md:justify-center">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Badge className={`cursor-pointer gap-1 py-1 px-2.5 rounded-lg border text-[9px] uppercase tracking-wider font-bold hover:brightness-125 transition-all ${config.className}`}>
                      {config.icon}
                      {config.label}
                    </Badge>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="glass border-white/10">
                    {(Object.keys(statusConfig) as PaymentStatus[]).map((status) => (
                      <DropdownMenuItem
                        key={status}
                        onClick={() => onUpdateStatus(t.id, status)}
                        className="gap-2 focus:bg-white/10 text-xs"
                      >
                        {statusConfig[status].icon}
                        {statusConfig[status].label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Amount */}
              <span className={`font-mono font-bold text-base md:text-right ${
                t.amount < 0 ? 'text-red-400' : 'text-emerald-400'
              }`}>
                {formatCurrency(t.amount)}
              </span>

              {/* Actions */}
              <div className="flex items-center gap-1 md:justify-center">
                {(t.status === 'pendente' || t.status === 'previsto') && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-lg border border-emerald-500/20"
                    title="Marcar como Recebido/Pago"
                    onClick={() => onUpdateStatus(t.id, 'recebido')}
                  >
                    <Check className="w-3.5 h-3.5" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => { setEditingId(t.id); setIsDialogOpen(true); }}
                  className="h-7 w-7 border border-white/5 hover:bg-white/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Pencil className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(t.id)}
                  className="h-7 w-7 border border-red-500/10 hover:bg-red-500/20 hover:text-red-400 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-4 border-t border-white/5 bg-white/[0.01]">
        {/* Page size selector */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">Exibir</span>
          <div className="flex gap-1">
            {PAGE_SIZE_OPTIONS.map(size => (
              <button
                key={size}
                onClick={() => handlePageSizeChange(size)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all ${
                  pageSize === size
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/5 border border-transparent'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
          <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">por página</span>
        </div>

        {/* Page info + navigation */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground font-mono">
            {startIdx + 1}–{Math.min(endIdx, sortedTransactions.length)} de {sortedTransactions.length}
          </span>

          <div className="flex items-center gap-1 ml-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg border border-white/5 hover:bg-white/10 disabled:opacity-30"
              onClick={() => goToPage(1)}
              disabled={currentPage === 1}
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg border border-white/5 hover:bg-white/10 disabled:opacity-30"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>

            {/* Page numbers */}
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let page: number;
              if (totalPages <= 5) {
                page = i + 1;
              } else if (currentPage <= 3) {
                page = i + 1;
              } else if (currentPage >= totalPages - 2) {
                page = totalPages - 4 + i;
              } else {
                page = currentPage - 2 + i;
              }
              return (
                <button
                  key={page}
                  onClick={() => goToPage(page)}
                  className={`h-7 w-7 rounded-lg text-[10px] font-mono font-bold transition-all ${
                    currentPage === page
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                      : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                  }`}
                >
                  {page}
                </button>
              );
            })}

            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg border border-white/5 hover:bg-white/10 disabled:opacity-30"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg border border-white/5 hover:bg-white/10 disabled:opacity-30"
              onClick={() => goToPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
