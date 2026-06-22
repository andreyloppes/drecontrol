import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { Transaction, PaymentStatus } from '@/types/finance';
import { Button } from '@/components/ui/button';
import { Trash2, Briefcase, RefreshCw, Check, Clock, Calendar, X, Pencil, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, CheckSquare, Square } from 'lucide-react';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { AddTransactionForm } from './AddTransactionForm';
import { formatCurrency } from '@/lib/format';
import { useFinanceContext } from '@/context/FinanceContext';

interface TransactionListProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
  onUpdateStatus: (id: string, status: PaymentStatus) => void;
  onEdit: (id: string, updates: Partial<Transaction>) => void;
  /** Override opcional — se não passado, usa o FinanceContext. */
  onBulkUpdateStatus?: (ids: string[], status: PaymentStatus) => Promise<void> | void;
  /** Override opcional — se não passado, usa o FinanceContext. */
  onBulkDelete?: (ids: string[]) => Promise<void> | void;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const statusConfig: Record<PaymentStatus, { label: string; icon: React.ReactNode; className: string }> = {
  recebido: { label: 'Recebido', icon: <Check className="w-3 h-3" />, className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  pendente: { label: 'Pendente', icon: <Clock className="w-3 h-3" />, className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  previsto: { label: 'Previsto', icon: <Calendar className="w-3 h-3" />, className: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
  cancelado: { label: 'Cancelado', icon: <X className="w-3 h-3" />, className: 'bg-red-500/20 text-red-400 border-red-500/30' },
};

export const TransactionList = memo(function TransactionList({
  transactions,
  onDelete,
  onUpdateStatus,
  onEdit,
  onBulkUpdateStatus,
  onBulkDelete,
}: TransactionListProps) {
  const ctx = useFinanceContext();
  const bulkUpdateStatus = onBulkUpdateStatus ?? ctx.bulkUpdateStatus;
  const bulkDelete = onBulkDelete ?? ctx.bulkDelete;

  const [editingId, setEditingId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Multi-select state — mantido dentro do componente, sem prop-drilling.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Reset pagination when transactions change (e.g., filter/month change)
  useEffect(() => {
    setCurrentPage(1);
  }, [transactions]);

  // Limpa seleção quando a lista de transações muda drasticamente
  // (troca de mês, filtro, etc.) pra evitar IDs órfãos na seleção.
  useEffect(() => {
    setSelectedIds(prev => {
      if (prev.size === 0) return prev;
      const validIds = new Set(transactions.map(t => t.id));
      const next = new Set<string>();
      prev.forEach(id => { if (validIds.has(id)) next.add(id); });
      // Só retorna novo Set se mudou (evita re-render desnecessário)
      return next.size === prev.size ? prev : next;
    });
  }, [transactions]);

  const formatDate = (date: string) =>
    new Date(date + 'T12:00:00').toLocaleDateString('pt-BR');

  // Memoize sort to avoid recreating array on every render (expensive for 100+ items)
  const sortedTransactions = useMemo(
    () => [...transactions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    ),
    [transactions]
  );

  // Pagination (must be before early-return to keep hook order stable)
  const totalPages = Math.ceil(sortedTransactions.length / pageSize);
  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = startIdx + pageSize;
  const pageTransactions = useMemo(
    () => sortedTransactions.slice(startIdx, endIdx),
    [sortedTransactions, startIdx, endIdx]
  );

  const toggleOne = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const allVisibleSelected = sortedTransactions.length > 0 && sortedTransactions.every(t => selectedIds.has(t.id));

  const toggleSelectAllVisible = useCallback(() => {
    setSelectedIds(prev => {
      if (sortedTransactions.every(t => prev.has(t.id))) {
        // Desmarca todos visíveis
        const next = new Set(prev);
        sortedTransactions.forEach(t => next.delete(t.id));
        return next;
      }
      // Seleciona todos visíveis (do filtro atual, respeita sort/filter)
      const next = new Set(prev);
      sortedTransactions.forEach(t => next.add(t.id));
      return next;
    });
  }, [sortedTransactions]);

  const handleBulkStatus = useCallback(async (status: PaymentStatus) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    await bulkUpdateStatus(ids, status);
    clearSelection();
  }, [selectedIds, bulkUpdateStatus, clearSelection]);

  const handleBulkDelete = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    await bulkDelete(ids);
    clearSelection();
  }, [selectedIds, bulkDelete, clearSelection]);

  if (transactions.length === 0) return null;

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  const selectionCount = selectedIds.size;

  return (
    <div className="space-y-0">
      {/* Live region pra anunciar mudanças de seleção via screen reader */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {selectionCount > 0
          ? `${selectionCount} ${selectionCount === 1 ? 'transação selecionada' : 'transações selecionadas'}`
          : ''}
      </div>

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

      {/* Bulk Action Bar (sticky, glass) */}
      {selectionCount > 0 && (
        <div
          role="toolbar"
          aria-label="Ações em massa"
          className="sticky top-0 z-10 glass backdrop-blur-2xl border-b border-cyan-500/20 bg-cyan-500/[0.04] px-4 py-3 flex flex-wrap items-center gap-2"
        >
          <span className="text-sm font-mono font-bold text-cyan-400">
            {selectionCount} {selectionCount === 1 ? 'selecionada' : 'selecionadas'}
          </span>

          <button
            type="button"
            onClick={toggleSelectAllVisible}
            aria-label={allVisibleSelected ? 'Desmarcar todas' : 'Selecionar todas'}
            aria-pressed={allVisibleSelected}
            className="min-h-[44px] md:min-h-0 md:h-8 inline-flex items-center gap-1.5 px-3 rounded-lg text-xs font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-white/5 border border-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 transition-colors"
          >
            {allVisibleSelected
              ? <CheckSquare className="w-3.5 h-3.5" aria-hidden="true" />
              : <Square className="w-3.5 h-3.5" aria-hidden="true" />}
            {allVisibleSelected ? 'Desmarcar todas' : 'Selecionar todas'}
          </button>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleBulkStatus('recebido')}
              className="min-h-[44px] md:min-h-0 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 focus-visible:ring-2 focus-visible:ring-emerald-500"
              aria-label={`Marcar ${selectionCount} ${selectionCount === 1 ? 'transação' : 'transações'} como recebido`}
            >
              <Check className="w-4 h-4 mr-1.5" aria-hidden="true" />
              Marcar como Recebido
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleBulkStatus('previsto')}
              className="min-h-[44px] md:min-h-0 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/20 focus-visible:ring-2 focus-visible:ring-cyan-500"
              aria-label={`Marcar ${selectionCount} ${selectionCount === 1 ? 'transação' : 'transações'} como previsto`}
            >
              <Calendar className="w-4 h-4 mr-1.5" aria-hidden="true" />
              Marcar como Previsto
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="min-h-[44px] md:min-h-0 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 focus-visible:ring-2 focus-visible:ring-red-500"
                  aria-label={`Apagar ${selectionCount} ${selectionCount === 1 ? 'transação' : 'transações'}`}
                >
                  <Trash2 className="w-4 h-4 mr-1.5" aria-hidden="true" />
                  Apagar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="glass border-white/10">
                <AlertDialogHeader>
                  <AlertDialogTitle>Apagar {selectionCount} {selectionCount === 1 ? 'transação' : 'transações'}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Você poderá desfazer pelo botão no toast logo após a exclusão.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleBulkDelete}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    Apagar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearSelection}
              className="min-h-[44px] md:min-h-0 border border-white/5 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-cyan-500"
              aria-label="Cancelar seleção"
            >
              <X className="w-4 h-4 mr-1.5" aria-hidden="true" />
              Cancelar seleção
            </Button>
          </div>
        </div>
      )}

      {/* Table Header */}
      <div className="hidden md:grid grid-cols-[32px_1fr_120px_140px_100px] gap-4 px-5 py-3 border-b border-white/5 text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
        <span aria-hidden="true"></span>
        <span>Descrição</span>
        <span className="text-center">Status</span>
        <span className="text-right">Valor</span>
        <span className="text-center">Ações</span>
      </div>

      {/* Transaction Rows */}
      <div className="divide-y divide-white/5">
        {pageTransactions.map((t) => {
          const config = statusConfig[t.status];
          const isSelected = selectedIds.has(t.id);
          return (
            <div
              key={t.id}
              className={`group flex flex-col md:grid md:grid-cols-[32px_1fr_120px_140px_100px] gap-3 md:gap-4 items-start md:items-center px-5 py-4 transition-colors ${
                isSelected ? 'bg-cyan-500/[0.06] hover:bg-cyan-500/[0.1]' : 'hover:bg-white/[0.02]'
              }`}
            >
              {/* Selection checkbox — always visible, muted when none selected */}
              <div className="flex md:justify-center">
                <label
                  className={`inline-flex items-center justify-center cursor-pointer rounded-md min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 md:w-7 md:h-7 transition-opacity ${
                    isSelected || selectionCount > 0 ? 'opacity-100' : 'opacity-30 hover:opacity-100 group-hover:opacity-100'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={isSelected}
                    onChange={() => toggleOne(t.id)}
                    aria-label={`Selecionar transação: ${t.description}`}
                  />
                  <span
                    aria-hidden="true"
                    className={`flex items-center justify-center w-5 h-5 rounded border transition-all peer-focus-visible:ring-2 peer-focus-visible:ring-cyan-500 peer-focus-visible:ring-offset-1 peer-focus-visible:ring-offset-background ${
                      isSelected
                        ? 'bg-cyan-500/30 border-cyan-500/60 text-cyan-300'
                        : 'bg-white/[0.02] border-white/20 hover:border-white/40'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                  </span>
                </label>
              </div>

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
                    <button
                      type="button"
                      aria-label={`Status atual: ${config.label}. Tocar para alterar.`}
                      className={`inline-flex items-center min-h-[32px] md:min-h-0 gap-1 py-1 px-2.5 rounded-lg border text-[10px] uppercase tracking-wider font-bold hover:brightness-125 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${config.className}`}
                    >
                      {config.icon}
                      {config.label}
                    </button>
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
                    className="h-11 w-11 md:h-7 md:w-7 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-lg border border-emerald-500/20 focus-visible:ring-2 focus-visible:ring-cyan-500"
                    title="Marcar como Recebido/Pago"
                    aria-label={`Marcar ${t.description} como recebido ou pago`}
                    onClick={() => onUpdateStatus(t.id, 'recebido')}
                  >
                    <Check className="w-4 h-4 md:w-3.5 md:h-3.5" aria-hidden="true" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => { setEditingId(t.id); setIsDialogOpen(true); }}
                  aria-label={`Editar transação ${t.description}`}
                  className="h-11 w-11 md:h-7 md:w-7 border border-white/5 hover:bg-white/10 rounded-lg md:opacity-0 md:group-hover:opacity-100 transition-opacity focus-visible:ring-2 focus-visible:ring-cyan-500 md:focus-visible:opacity-100"
                >
                  <Pencil className="w-4 h-4 md:w-3 md:h-3" aria-hidden="true" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Excluir transação ${t.description}`}
                      className="h-11 w-11 md:h-7 md:w-7 border border-red-500/10 hover:bg-red-500/20 hover:text-red-400 rounded-lg md:opacity-0 md:group-hover:opacity-100 transition-opacity focus-visible:ring-2 focus-visible:ring-red-500 md:focus-visible:opacity-100"
                    >
                      <Trash2 className="w-4 h-4 md:w-3 md:h-3" aria-hidden="true" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="glass border-white/10">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirmar exclusao</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza? Esta acao nao pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onDelete(t.id)}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-4 border-t border-white/5 bg-white/[0.01]">
        {/* Page size selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-mono uppercase tracking-widest">Exibir</span>
          <div className="flex gap-1">
            {PAGE_SIZE_OPTIONS.map(size => (
              <button
                key={size}
                type="button"
                onClick={() => handlePageSizeChange(size)}
                aria-label={`Exibir ${size} transações por página`}
                aria-pressed={pageSize === size}
                className={`min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 px-2.5 md:py-1 rounded-lg text-xs font-mono font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${
                  pageSize === size
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/5 border border-transparent'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
          <span className="text-xs text-muted-foreground font-mono uppercase tracking-widest">por página</span>
        </div>

        {/* Page info + navigation */}
        <nav aria-label="Paginação de transações" className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-mono" aria-live="polite">
            {startIdx + 1}–{Math.min(endIdx, sortedTransactions.length)} de {sortedTransactions.length}
          </span>

          <div className="flex items-center gap-1 ml-2">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Primeira página"
              className="h-11 w-11 md:h-7 md:w-7 rounded-lg border border-white/5 hover:bg-white/10 disabled:opacity-30 focus-visible:ring-2 focus-visible:ring-cyan-500"
              onClick={() => goToPage(1)}
              disabled={currentPage === 1}
            >
              <ChevronsLeft className="w-4 h-4 md:w-3.5 md:h-3.5" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Página anterior"
              className="h-11 w-11 md:h-7 md:w-7 rounded-lg border border-white/5 hover:bg-white/10 disabled:opacity-30 focus-visible:ring-2 focus-visible:ring-cyan-500"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4 md:w-3.5 md:h-3.5" aria-hidden="true" />
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
                  type="button"
                  onClick={() => goToPage(page)}
                  aria-label={`Ir para página ${page}`}
                  aria-current={currentPage === page ? 'page' : undefined}
                  className={`h-11 w-11 md:h-7 md:w-7 rounded-lg text-xs font-mono font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${
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
              aria-label="Próxima página"
              className="h-11 w-11 md:h-7 md:w-7 rounded-lg border border-white/5 hover:bg-white/10 disabled:opacity-30 focus-visible:ring-2 focus-visible:ring-cyan-500"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="w-4 h-4 md:w-3.5 md:h-3.5" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Última página"
              className="h-11 w-11 md:h-7 md:w-7 rounded-lg border border-white/5 hover:bg-white/10 disabled:opacity-30 focus-visible:ring-2 focus-visible:ring-cyan-500"
              onClick={() => goToPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              <ChevronsRight className="w-4 h-4 md:w-3.5 md:h-3.5" aria-hidden="true" />
            </Button>
          </div>
        </nav>
      </div>
    </div>
  );
});
