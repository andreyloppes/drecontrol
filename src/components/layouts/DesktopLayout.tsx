import { lazy, Suspense, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AddTransactionForm } from '@/components/AddTransactionForm';
import { BankStatementUpload } from '@/components/BankStatementUpload';
import { StatsCard } from '@/components/StatsCard';
import { MonthlyTable } from '@/components/MonthlyTable';
import { TransactionList } from '@/components/TransactionList';
import { MonthFilter } from '@/components/MonthFilter';
import { AIAssistant } from '@/components/AIAssistant';
import { TargetVsActualCard } from '@/components/TargetVsActualCard';
import { CopilotPanel } from '@/components/CopilotPanel';
import { ForecastChart } from '@/components/ForecastChart';
import { ReembolsoCard } from '@/components/ReembolsoCard';
import { InsightsPanel } from '@/components/InsightsPanel';
import { IncomeSmoothingCard } from '@/components/IncomeSmoothingCard';
import { AnalyticsPanel } from '@/components/AnalyticsPanel';
import { ParsedTransaction } from '@/lib/statement-parser';
import type { Transaction } from '@/types/finance';
import { useFinanceContext } from '@/context/FinanceContext';

const DFCChart = lazy(() =>
  import('@/components/DFCChart').then(m => ({ default: m.DFCChart }))
);
import {
  Wallet, TrendingDown, Landmark, Calendar, Briefcase,
  RefreshCw, Search, ArrowUpCircle, ArrowDownCircle, List, LogOut, Pencil, Download,
} from 'lucide-react';
import { exportTransactionsCSV } from '@/lib/export';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/format';
import { ThemeToggle } from '@/components/ThemeToggle';
import { OpeningBalanceDialog } from '@/components/dialogs/OpeningBalanceDialog';
import { RecurringTemplatesDialog } from '@/components/dialogs/RecurringTemplatesDialog';
import { Repeat, Target } from 'lucide-react';

export function DesktopLayout() {
  const {
    loading, transactions, filteredTransactions, monthlyData, dfcData,
    selectedMonth, setSelectedMonth, availableMonths, selectedMonthStats,
    openingBalance, setOpeningBalance, searchTerm, setSearchTerm,
    typeFilter, setTypeFilter, addTransaction, addInstallment, deleteTransaction,
    updateTransactionStatus, editTransaction, bulkImport,
    replicateRecurringToNextMonth,
  } = useFinanceContext();

  const navigate = useNavigate();
  const userName = localStorage.getItem('user_name') || '';
  const handleLogout = () => {
    localStorage.removeItem('user_name');
    navigate('/');
  };

  // Dialog state local ao layout desktop.
  const [editingBalance, setEditingBalance] = useState(false);
  const [balanceInput, setBalanceInput] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);

  const transactionListRef = useRef<HTMLDivElement>(null);

  const handleStatementImport = async (parsed: ParsedTransaction[]) => {
    const entries = parsed.map(t => ({
      date: t.date,
      description: t.description,
      amount: t.amount,
      type: t.type,
      status: t.status,
      category: t.category,
      month: t.month,
    }));
    await bulkImport(entries);
  };

  // Scroll-to-list é um efeito colateral local — o ref vive aqui.
  const onAddWithScroll = async (tx: Omit<Transaction, 'id' | 'month'>) => {
    const ok = await addTransaction(tx);
    if (ok) {
      setTimeout(() => {
        transactionListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    }
    return ok;
  };

  const projectedEnd = openingBalance + selectedMonthStats.totalReceita - selectedMonthStats.totalDespesa;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Skip link for keyboard/SR users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-cyan-600 focus:text-white focus:rounded-lg focus:shadow-xl focus:outline-none focus:ring-2 focus:ring-cyan-300"
      >
        Pular para o conteúdo principal
      </a>
      {/* Background Futuristic Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 blur-[120px] rounded-full animate-float" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full animate-float" style={{ animationDelay: '-3s' }} />
        <div className="absolute inset-0 cyber-grid opacity-[0.03] dark:opacity-[0.05]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-white/10">
        <div className="container py-4 flex justify-between items-center">
          <div className="flex flex-col">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tighter bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              DRE Control
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground tracking-wide">
              Controle financeiro pessoal
            </p>
          </div>
          <div className="flex items-center gap-3">
            {userName && (
              <span className="text-xs font-mono text-muted-foreground hidden sm:inline">
                Ola, <span className="text-foreground font-semibold">{userName}</span>
              </span>
            )}
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              aria-label="Sair da conta"
              className="h-10 w-10 rounded-xl border border-white/10 hover:bg-red-500/20 hover:text-red-400 focus-visible:ring-2 focus-visible:ring-cyan-500"
              title="Sair"
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </header>

      <main id="main-content" className="container relative z-10 py-6 md:py-10 space-y-8 md:space-y-12">
        {/* Month Filter & AI */}
        <section className="flex flex-col lg:flex-row gap-6 justify-between items-stretch lg:items-center">
          <div className="flex flex-wrap items-center gap-3">
            <div className="glass p-1 rounded-2xl w-fit">
              <MonthFilter
                selectedMonth={selectedMonth}
                onMonthChange={setSelectedMonth}
                availableMonths={availableMonths}
              />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={replicateRecurringToNextMonth}
              aria-label="Gerar recorrências e despesas do mês atual para o próximo mês"
              className="h-10 rounded-xl border border-white/10 text-xs font-mono uppercase tracking-wider hover:bg-cyan-500/10 focus-visible:ring-2 focus-visible:ring-cyan-500"
              title="Replica recorrências e despesas do mês atual para o próximo"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
              Gerar Próximo Mês
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTemplates(true)}
              aria-label="Abrir gerenciador de templates recorrentes"
              className="h-10 rounded-xl border border-white/10 text-xs font-mono uppercase tracking-wider hover:bg-purple-500/10 focus-visible:ring-2 focus-visible:ring-purple-500"
            >
              <Repeat className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
              Templates
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/planejamento')}
              aria-label="Abrir página de planejamento"
              className="h-10 rounded-xl border border-white/10 text-xs font-mono uppercase tracking-wider hover:bg-emerald-500/10 focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <Target className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
              Planejamento
            </Button>
          </div>
          <div className="w-full lg:w-2/5">
            <AIAssistant onAddTransaction={addTransaction} transactions={transactions} />
          </div>
        </section>

        {loading ? (
          <section className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-1 w-8 bg-cyan-500 rounded-full" />
              <Skeleton className="h-3 w-40" />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={`glass rounded-3xl p-6 space-y-4 ${i === 0 || i === 3 ? 'col-span-2 lg:col-span-1' : ''}`}>
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-5 w-5 rounded" />
                  </div>
                  <Skeleton className="h-8 w-32" />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className={`glass rounded-3xl p-6 space-y-4 ${i === 2 ? 'col-span-2 lg:col-span-1' : ''}`}>
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-5 w-5 rounded" />
                  </div>
                  <Skeleton className="h-8 w-32" />
                </div>
              ))}
            </div>
            <div className="glass rounded-3xl p-6 border border-white/5">
              <Skeleton className="h-64 w-full rounded-2xl" />
            </div>
          </section>
        ) : (
        <>

        {/* Copiloto — números prospectivos */}
        <CopilotPanel />

        {/* Insights proativos */}
        <InsightsPanel />

        {/* Stats Grid */}
        <section className="space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-1 w-8 bg-cyan-500 rounded-full" />
            <h2 className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Painel do Mês</h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="col-span-2 lg:col-span-1">
              <StatsCard
                title="Saldo do Mês"
                value={selectedMonthStats.totalReceita - selectedMonthStats.totalDespesa}
                icon={<Wallet className="w-5 h-5" />}
                variant="highlight"
                description="Receita - Despesas"
              />
            </div>
            <div className="col-span-2 lg:col-span-1">
              <StatsCard
                title="Despesas (Mês)"
                value={Math.abs(selectedMonthStats.despesas + (selectedMonthStats.despesasPrevistas ?? 0))}
                icon={<TrendingDown className="w-5 h-5 text-red-400" />}
                description={`Pago: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedMonthStats.despesas)} | Prev: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedMonthStats.despesasPrevistas ?? 0)}`}
              />
            </div>
            <div className="col-span-2 lg:col-span-1">
              <StatsCard
                title="Receita Total (Mês)"
                value={selectedMonthStats.totalReceita}
                icon={<Calendar className="w-5 h-5" />}
                description={`Realizado: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedMonthStats.recebido)} | Prev: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedMonthStats.pendente + selectedMonthStats.previsto)}`}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <button
              type="button"
              aria-label={`Editar saldo anterior. Valor atual: ${formatCurrency(openingBalance)}`}
              className="relative overflow-hidden text-left w-full p-4 md:p-6 glass rounded-3xl transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 group hover:border-white/20 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
              onClick={() => {
                setBalanceInput(openingBalance.toFixed(2).replace('.', ','));
                setEditingBalance(true);
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] md:text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground group-hover:text-foreground/90 transition-colors truncate mr-2">
                  Saldo Anterior
                </span>
                <div className="flex items-center gap-1.5">
                  <Pencil className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  <Landmark className="w-5 h-5 text-foreground/70 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12" />
                </div>
              </div>
              <p className="text-xl md:text-2xl font-bold tracking-tight truncate">
                {formatCurrency(openingBalance)}
              </p>
              <p className="text-[10px] md:text-xs mt-3 text-muted-foreground font-mono uppercase opacity-70 group-hover:opacity-100 transition-opacity truncate">
                Final mês: {formatCurrency(projectedEnd)}
              </p>
            </button>

            <StatsCard
              title="Projetos (Receita)"
              value={selectedMonthStats.projetos}
              icon={<Briefcase className="w-5 h-5" />}
            />
            <div className="col-span-2 lg:col-span-1">
              <StatsCard
                title="Recorrência (Receita)"
                value={selectedMonthStats.recorrencia}
                icon={<RefreshCw className="w-5 h-5" />}
              />
            </div>
          </div>
        </section>

        {/* Meta vs Realizado */}
        <TargetVsActualCard />

        {/* Teto de reembolso */}
        <ReembolsoCard />

        {/* Salário-base (income smoothing) */}
        <IncomeSmoothingCard />

        {/* DFC Chart */}
        <section className="glass rounded-3xl p-6 border border-white/5">
          <div className="flex items-center gap-2 mb-6">
            <div className="h-1 w-8 bg-purple-500 rounded-full" />
            <h2 className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Projeção de Caixa</h2>
          </div>
          <Suspense fallback={<Skeleton className="h-[400px] w-full rounded-2xl" />}>
            <DFCChart data={dfcData} />
          </Suspense>
        </section>

        {/* Forecast 90 dias */}
        <ForecastChart />

        {/* Analytics Panel */}
        <AnalyticsPanel />

        {/* Import Bank Statement */}
        <section className="glass rounded-3xl p-6 border border-white/5">
          <div className="flex items-center gap-2 mb-6">
            <div className="h-1 w-8 bg-emerald-500 rounded-full" />
            <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Importar Extrato</h2>
          </div>
          <BankStatementUpload onImport={handleStatementImport} />
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <section className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight px-1">Nova Transação</h2>
            <div className="glass p-6 rounded-3xl border border-white/5 h-fit">
              <AddTransactionForm onAdd={onAddWithScroll} onInstallment={addInstallment} />
            </div>
          </section>
          <section className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight px-1">Resumo Mensal</h2>
            <div className="glass rounded-3xl border border-white/5 overflow-hidden">
              <MonthlyTable data={monthlyData} />
            </div>
          </section>
        </div>

        {/* Transactions */}
        <section ref={transactionListRef} className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-1">
            <div className="flex items-center gap-2">
              <div className="h-1 w-8 bg-cyan-500 rounded-full" />
              <h2 className="text-xl font-bold tracking-tight">
                {searchTerm ? 'Resultado da Busca' : 'Extrato do Mes'}
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex gap-1 glass rounded-2xl p-1">
                <Button
                  variant={typeFilter === 'all' ? 'default' : 'ghost'}
                  size="sm"
                  aria-pressed={typeFilter === 'all'}
                  onClick={() => setTypeFilter('all')}
                  className="rounded-xl h-9 px-3 text-xs font-mono uppercase tracking-wider"
                >
                  <List className="w-3.5 h-3.5 mr-1.5" />
                  Tudo
                </Button>
                <Button
                  variant={typeFilter === 'entradas' ? 'default' : 'ghost'}
                  size="sm"
                  aria-pressed={typeFilter === 'entradas'}
                  onClick={() => setTypeFilter('entradas')}
                  className={`rounded-xl h-9 px-3 text-xs font-mono uppercase tracking-wider ${typeFilter === 'entradas' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                >
                  <ArrowUpCircle className="w-3.5 h-3.5 mr-1.5" />
                  Entradas
                </Button>
                <Button
                  variant={typeFilter === 'saidas' ? 'default' : 'ghost'}
                  size="sm"
                  aria-pressed={typeFilter === 'saidas'}
                  onClick={() => setTypeFilter('saidas')}
                  className={`rounded-xl h-9 px-3 text-xs font-mono uppercase tracking-wider ${typeFilter === 'saidas' ? 'bg-red-600 hover:bg-red-700' : ''}`}
                >
                  <ArrowDownCircle className="w-3.5 h-3.5 mr-1.5" />
                  Saidas
                </Button>
              </div>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar transacao..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-9 bg-background/50 border-white/10 rounded-2xl focus:ring-cyan-500/50"
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Exportar transações do mês em CSV"
                className="h-9 rounded-xl border border-white/10 text-xs font-mono uppercase tracking-wider focus-visible:ring-2 focus-visible:ring-cyan-500"
                onClick={() => {
                  if (filteredTransactions.length === 0) {
                    toast.error('Nenhuma transação para exportar.');
                    return;
                  }
                  exportTransactionsCSV(filteredTransactions, selectedMonth);
                  toast.success(`CSV exportado (${filteredTransactions.length} transações).`);
                }}
              >
                <Download className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
                CSV
              </Button>
            </div>
          </div>

          <div className="glass rounded-3xl border border-white/5 overflow-hidden">
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <p className="text-lg">{searchTerm ? 'Nenhuma transacao encontrada' : 'Nenhuma transacao neste mes'}</p>
                <p className="text-sm opacity-60">{searchTerm ? 'Tente buscar por outro termo.' : 'Adicione uma transacao para comecar.'}</p>
              </div>
            ) : (
              <TransactionList
                transactions={filteredTransactions}
                onDelete={deleteTransaction}
                onUpdateStatus={updateTransactionStatus}
                onEdit={editTransaction}
              />
            )}
          </div>
        </section>

        </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 mt-12 bg-background/50 backdrop-blur-sm">
        <div className="container py-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <p className="text-sm font-bold tracking-tight">DRE Control</p>
            <p className="text-xs text-muted-foreground">Controle financeiro pessoal</p>
          </div>
          <div className="text-xs text-muted-foreground tracking-wide">
            © {new Date().getFullYear()}
          </div>
        </div>
      </footer>

      <RecurringTemplatesDialog open={showTemplates} onOpenChange={setShowTemplates} />

      {/* Saldo dialog (desktop) */}
      <OpeningBalanceDialog
        open={editingBalance}
        onOpenChange={setEditingBalance}
        balanceInput={balanceInput}
        setBalanceInput={setBalanceInput}
        selectedMonth={selectedMonth}
        setOpeningBalance={setOpeningBalance}
      />
    </div>
  );
}
