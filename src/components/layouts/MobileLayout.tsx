import { lazy, Suspense, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AddTransactionForm } from '@/components/AddTransactionForm';
import { BankStatementUpload } from '@/components/BankStatementUpload';
import { MonthlyTable } from '@/components/MonthlyTable';
import { TransactionList } from '@/components/TransactionList';
import { MonthFilter } from '@/components/MonthFilter';
import { AIAssistant } from '@/components/AIAssistant';
import { CopilotPanel } from '@/components/CopilotPanel';
import { ForecastChart } from '@/components/ForecastChart';
import { ReembolsoCard } from '@/components/ReembolsoCard';
import { InsightsPanel } from '@/components/InsightsPanel';
import { IncomeSmoothingCard } from '@/components/IncomeSmoothingCard';
import { TargetVsActualCard } from '@/components/TargetVsActualCard';
import { AnalyticsPanel } from '@/components/AnalyticsPanel';
import { ParsedTransaction } from '@/lib/statement-parser';
import { useFinanceContext } from '@/context/FinanceContext';

const DFCChart = lazy(() =>
  import('@/components/DFCChart').then(m => ({ default: m.DFCChart }))
);
import {
  Wallet, TrendingUp, Landmark, Briefcase, RefreshCw, Search,
  ArrowUpCircle, ArrowDownCircle, List, LogOut, Pencil, Plus, Upload, Download,
} from 'lucide-react';
import { exportTransactionsCSV } from '@/lib/export';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatCurrency, formatDate } from '@/lib/format';
import { ThemeToggle } from '@/components/ThemeToggle';
import { OpeningBalanceDialog } from '@/components/dialogs/OpeningBalanceDialog';
import { RecurringTemplatesDialog } from '@/components/dialogs/RecurringTemplatesDialog';
import { Repeat, Target } from 'lucide-react';
import { MobileBottomNav, type MobileTab } from '@/components/layouts/MobileBottomNav';

export function MobileLayout() {
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

  // Dialog state local ao layout mobile.
  const [editingBalance, setEditingBalance] = useState(false);
  const [balanceInput, setBalanceInput] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>('home');
  const [showAddForm, setShowAddForm] = useState(false);

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
    setShowImport(false);
  };

  const recentTransactions = useMemo(() => {
    const monthTxs = transactions
      .filter((t) => t.month === selectedMonth)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return monthTxs.slice(0, 5);
  }, [transactions, selectedMonth]);

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
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 blur-[120px] rounded-full animate-float" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full animate-float" style={{ animationDelay: '-3s' }} />
      </div>

      {/* Mobile Header */}
      <header className="relative z-10 px-4 pt-5 pb-3">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Olá, {userName || 'Usuário'}
            </h1>
            <p className="text-sm text-muted-foreground">Visão geral das suas finanças</p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              aria-label="Sair da conta"
              className="h-11 w-11 rounded-xl border border-white/10 hover:bg-red-500/20 hover:text-red-400 focus-visible:ring-2 focus-visible:ring-cyan-500"
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Content */}
      <main id="main-content" className="relative z-10 px-4 pb-28 space-y-4">

        {/* ──── TAB: HOME ──── */}
        {mobileTab === 'home' && (
          <>
            {/* Month Selector */}
            <div className="glass rounded-2xl">
              <MonthFilter
                selectedMonth={selectedMonth}
                onMonthChange={setSelectedMonth}
                availableMonths={availableMonths}
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={replicateRecurringToNextMonth}
                aria-label="Gerar recorrências e despesas do mês atual para o próximo mês"
                className="min-h-[44px] rounded-2xl glass border border-white/10 text-[10px] font-mono uppercase tracking-wider hover:bg-cyan-500/10 focus-visible:ring-2 focus-visible:ring-cyan-500"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                Próx Mês
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowTemplates(true)}
                aria-label="Abrir gerenciador de templates recorrentes"
                className="min-h-[44px] rounded-2xl glass border border-white/10 text-[10px] font-mono uppercase tracking-wider hover:bg-purple-500/10 focus-visible:ring-2 focus-visible:ring-purple-500"
              >
                <Repeat className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                Templates
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/planejamento')}
                aria-label="Abrir página de planejamento"
                className="min-h-[44px] rounded-2xl glass border border-white/10 text-[10px] font-mono uppercase tracking-wider hover:bg-emerald-500/10 focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                <Target className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                Plano
              </Button>
            </div>

            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="glass rounded-2xl p-5 space-y-3">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-8 w-40" />
                  </div>
                ))}
              </div>
            ) : (
              <>
                {/* Copiloto — números prospectivos */}
                <CopilotPanel />

                {/* Insights proativos */}
                <InsightsPanel />

                {/* Saldo Anterior — Big card */}
                <button
                  type="button"
                  aria-label={`Editar saldo anterior. Valor atual: ${formatCurrency(openingBalance)}`}
                  className="w-full text-left glass rounded-2xl p-5 border-l-4 border-l-cyan-500 active:scale-[0.98] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                  onClick={() => {
                    setBalanceInput(openingBalance.toFixed(2).replace('.', ','));
                    setEditingBalance(true);
                  }}
                >
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Landmark className="w-4 h-4" />
                    <span className="text-xs font-mono uppercase tracking-widest">Saldo Anterior</span>
                    <Pencil className="w-3 h-3 ml-auto opacity-50" />
                  </div>
                  <p className="text-3xl font-bold tracking-tight">{formatCurrency(openingBalance)}</p>
                  <p className="text-xs text-muted-foreground mt-1 font-mono">
                    Final mês: <span className={projectedEnd >= 0 ? 'text-emerald-400' : 'text-red-400'}>{formatCurrency(projectedEnd)}</span>
                  </p>
                </button>

                {/* Entradas / Saídas */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="glass rounded-2xl p-4 border-l-4 border-l-emerald-500">
                    <div className="flex items-center gap-2 mb-2">
                      <ArrowUpCircle className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                      <span className="text-xs font-mono uppercase tracking-widest text-emerald-400">Entradas</span>
                    </div>
                    <p className="text-lg font-bold">{formatCurrency(selectedMonthStats.totalReceita)}</p>
                  </div>
                  <div className="glass rounded-2xl p-4 border-l-4 border-l-red-500">
                    <div className="flex items-center gap-2 mb-2">
                      <ArrowDownCircle className="w-4 h-4 text-red-400" aria-hidden="true" />
                      <span className="text-xs font-mono uppercase tracking-widest text-red-400">Saídas</span>
                    </div>
                    <p className="text-lg font-bold">{formatCurrency(selectedMonthStats.totalDespesa)}</p>
                  </div>
                </div>

                {/* Saldo do Mês + Recebido */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="glass rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Wallet className="w-4 h-4 text-cyan-400" aria-hidden="true" />
                      <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Saldo Mês</span>
                    </div>
                    <p className={`text-lg font-bold ${(selectedMonthStats.totalReceita - selectedMonthStats.totalDespesa) >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
                      {formatCurrency(selectedMonthStats.totalReceita - selectedMonthStats.totalDespesa)}
                    </p>
                  </div>
                  <div className="glass rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                      <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Recebido</span>
                    </div>
                    <p className="text-lg font-bold">{formatCurrency(selectedMonthStats.recebido)}</p>
                  </div>
                </div>

                {/* Projetos / Recorrência */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="glass rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Briefcase className="w-4 h-4 text-purple-400" aria-hidden="true" />
                      <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Projetos</span>
                    </div>
                    <p className="text-lg font-bold">{formatCurrency(selectedMonthStats.projetos)}</p>
                  </div>
                  <div className="glass rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <RefreshCw className="w-4 h-4 text-cyan-400" aria-hidden="true" />
                      <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Recorrência</span>
                    </div>
                    <p className="text-lg font-bold">{formatCurrency(selectedMonthStats.recorrencia)}</p>
                  </div>
                </div>

                {/* Recent Transactions */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h2 className="text-base font-bold">Transações Recentes</h2>
                    <button
                      type="button"
                      onClick={() => setMobileTab('transactions')}
                      aria-label="Ver todas as transações"
                      className="min-h-[44px] px-3 -mr-3 text-xs text-cyan-400 font-mono uppercase tracking-wider rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                    >
                      Ver tudo
                    </button>
                  </div>

                  {recentTransactions.length === 0 ? (
                    <div className="glass rounded-2xl p-8 text-center">
                      <p className="text-muted-foreground text-sm">Nenhuma transação neste mês.</p>
                    </div>
                  ) : (
                    <div className="glass rounded-2xl divide-y divide-white/5 overflow-hidden">
                      {recentTransactions.map((t) => (
                        <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            t.amount < 0 ? 'bg-red-500/15 text-red-400' : 'bg-emerald-500/15 text-emerald-400'
                          }`}>
                            {t.amount < 0 ? <ArrowDownCircle className="w-4 h-4" /> : <ArrowUpCircle className="w-4 h-4" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{t.description}</p>
                            <p className="text-xs text-muted-foreground font-mono">{formatDate(t.date)} · {t.category || t.type}</p>
                          </div>
                          <span className={`font-mono font-bold text-sm flex-shrink-0 ${
                            t.amount < 0 ? 'text-red-400' : 'text-emerald-400'
                          }`}>
                            {formatCurrency(t.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Meta vs Realizado */}
                <TargetVsActualCard />

                {/* Teto de reembolso */}
                <ReembolsoCard />

                {/* Salário-base (income smoothing) */}
                <IncomeSmoothingCard />

                {/* Analytics Panel */}
                <AnalyticsPanel />
              </>
            )}
          </>
        )}

        {/* ──── TAB: TRANSACTIONS ──── */}
        {mobileTab === 'transactions' && (
          <>
            {/* Search + Import */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar transação..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-10 bg-background/50 border-white/10 rounded-xl"
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Importar extrato bancário"
                className="h-11 w-11 rounded-xl border border-white/10 focus-visible:ring-2 focus-visible:ring-cyan-500"
                onClick={() => setShowImport(true)}
              >
                <Upload className="w-4 h-4" aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Exportar transações do mês em CSV"
                className="h-11 w-11 rounded-xl border border-white/10 focus-visible:ring-2 focus-visible:ring-cyan-500"
                onClick={() => {
                  if (filteredTransactions.length === 0) {
                    toast.error('Nenhuma transação para exportar.');
                    return;
                  }
                  exportTransactionsCSV(filteredTransactions, selectedMonth);
                  toast.success(`CSV exportado (${filteredTransactions.length} transações).`);
                }}
              >
                <Download className="w-4 h-4" aria-hidden="true" />
              </Button>
            </div>

            {/* Type Filters */}
            <div className="flex gap-2">
              {([
                { key: 'all' as const, label: 'Tudo', icon: List },
                { key: 'entradas' as const, label: 'Entradas', icon: ArrowUpCircle },
                { key: 'saidas' as const, label: 'Saídas', icon: ArrowDownCircle },
              ]).map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={typeFilter === key}
                  aria-label={`Filtrar por ${label}`}
                  onClick={() => setTypeFilter(key)}
                  className={`flex-1 flex items-center justify-center gap-1.5 min-h-[44px] py-2.5 rounded-xl text-xs font-mono uppercase tracking-wider transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${
                    typeFilter === key
                      ? key === 'entradas' ? 'bg-emerald-600 text-white' : key === 'saidas' ? 'bg-red-600 text-white' : 'bg-foreground text-background'
                      : 'glass text-muted-foreground'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                  {label}
                </button>
              ))}
            </div>

            {/* Month selector (compact) */}
            <div className="glass rounded-xl">
              <MonthFilter
                selectedMonth={selectedMonth}
                onMonthChange={setSelectedMonth}
                availableMonths={availableMonths}
              />
            </div>

            {/* Transaction List */}
            <div className="glass rounded-2xl border border-white/5 overflow-hidden">
              {filteredTransactions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p className="text-sm">{searchTerm ? 'Nenhuma transação encontrada' : 'Nenhuma transação neste mês'}</p>
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
          </>
        )}

        {/* ──── TAB: DFC ──── */}
        {mobileTab === 'dfc' && (
          <>
            <div className="glass rounded-xl">
              <MonthFilter
                selectedMonth={selectedMonth}
                onMonthChange={setSelectedMonth}
                availableMonths={availableMonths}
              />
            </div>

            {/* Saldo Anterior mini */}
            <div className="flex gap-3">
              <div className="flex-1 glass rounded-xl p-3">
                <p className="text-xs font-mono uppercase text-muted-foreground">Saldo Anterior</p>
                <p className="text-base font-bold mt-1">{formatCurrency(openingBalance)}</p>
              </div>
              <div className="flex-1 glass rounded-xl p-3">
                <p className="text-xs font-mono uppercase text-muted-foreground">Projeção Final</p>
                <p className={`text-base font-bold mt-1 ${projectedEnd >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatCurrency(projectedEnd)}
                </p>
              </div>
            </div>

            <div className="glass rounded-2xl p-4 border border-white/5">
              <Suspense fallback={<Skeleton className="h-[280px] w-full rounded-2xl" />}>
                <DFCChart data={dfcData} />
              </Suspense>
            </div>

            {/* Forecast 90 dias */}
            <ForecastChart />

            <div className="glass rounded-2xl border border-white/5 overflow-hidden">
              <MonthlyTable data={monthlyData} />
            </div>
          </>
        )}

        {/* ──── TAB: IA ──── */}
        {mobileTab === 'ai' && (
          <div className="h-[calc(100dvh-180px)]">
            <AIAssistant onAddTransaction={addTransaction} transactions={transactions} alwaysExpanded />
          </div>
        )}
      </main>

      {/* FAB — Add Transaction */}
      {mobileTab !== 'ai' && (
        <button
          onClick={() => setShowAddForm(true)}
          aria-label="Nova transação"
          style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom))' }}
          className="fixed right-4 z-40 w-14 h-14 rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 flex items-center justify-center active:scale-90 transition-transform"
        >
          <Plus className="w-7 h-7" />
        </button>
      )}

      {/* Bottom Navigation */}
      <MobileBottomNav activeTab={mobileTab} onTabChange={setMobileTab} />

      {/* Dialog: Add Transaction */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="glass border-white/10">
          <DialogHeader>
            <DialogTitle>Nova Transação</DialogTitle>
          </DialogHeader>
          <AddTransactionForm
            onAdd={async (tx) => {
              const ok = await addTransaction(tx);
              if (ok) setShowAddForm(false);
              return ok;
            }}
            onInstallment={async (params) => {
              const ok = await addInstallment(params);
              if (ok) setShowAddForm(false);
              return ok;
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog: Import Statement */}
      <Dialog open={showImport} onOpenChange={setShowImport}>
        <DialogContent className="glass border-white/10">
          <DialogHeader>
            <DialogTitle>Importar Extrato</DialogTitle>
          </DialogHeader>
          <BankStatementUpload onImport={handleStatementImport} />
        </DialogContent>
      </Dialog>

      {/* Dialog: Saldo Anterior */}
      <RecurringTemplatesDialog open={showTemplates} onOpenChange={setShowTemplates} />

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
