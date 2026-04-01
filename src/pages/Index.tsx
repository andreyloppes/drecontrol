import { useFinance } from '@/hooks/useFinance';
import { AddTransactionForm } from '@/components/AddTransactionForm';
import { BankStatementUpload } from '@/components/BankStatementUpload';
import { StatsCard } from '@/components/StatsCard';
import { MonthlyTable } from '@/components/MonthlyTable';
import { TransactionList } from '@/components/TransactionList';
import { MonthFilter } from '@/components/MonthFilter';
import { DFCChart } from '@/components/DFCChart';
import { AIAssistant } from '@/components/AIAssistant';
import { ParsedTransaction } from '@/lib/statement-parser';
import { Wallet, TrendingUp, TrendingDown, Landmark, Calendar, Briefcase, RefreshCw, Search, ArrowUpCircle, ArrowDownCircle, List, LogOut, Pencil, RotateCcw, Plus, Home, Receipt, BarChart3, Sparkles, Upload } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { useRef, useCallback, useState, useMemo } from 'react';
import { formatCurrency } from '@/lib/format';
import { useIsMobile } from '@/hooks/use-mobile';

import { ThemeToggle } from '@/components/ThemeToggle';

type MobileTab = 'home' | 'transactions' | 'dfc' | 'ai';

const Index = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const transactionListRef = useRef<HTMLDivElement>(null);
  const {
    filteredTransactions,
    selectedMonth,
    setSelectedMonth,
    availableMonths,
    addTransaction,
    deleteTransaction,
    updateTransactionStatus,
    monthlyData,
    totalCaixa,
    selectedMonthStats,
    dfcData,
    searchTerm,
    setSearchTerm,
    typeFilter,
    setTypeFilter,
    editTransaction,
    bulkImport,
    transactions,
    loading,
    openingBalance,
    setOpeningBalance,
  } = useFinance();

  const [editingBalance, setEditingBalance] = useState(false);
  const [balanceInput, setBalanceInput] = useState('');
  const [mobileTab, setMobileTab] = useState<MobileTab>('home');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const handleAddTransactionAndScroll = useCallback(async (tx: any) => {
    await addTransaction(tx);
    setTimeout(() => {
      transactionListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 300);
  }, [addTransaction]);

  const handleMobileAdd = useCallback(async (tx: any) => {
    await addTransaction(tx);
    setShowAddForm(false);
  }, [addTransaction]);

  const userName = localStorage.getItem('user_name') || '';

  const handleLogout = () => {
    localStorage.removeItem('user_name');
    navigate('/');
  };

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
      .filter(t => t.month === selectedMonth)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return monthTxs.slice(0, 5);
  }, [transactions, selectedMonth]);

  const projectedEnd = openingBalance + selectedMonthStats.totalReceita - selectedMonthStats.totalDespesa;

  const formatDate = (date: string) =>
    new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

  // ============================================================
  // SHARED: Saldo Anterior Dialog
  // ============================================================
  const saldoDialog = (
    <Dialog open={editingBalance} onOpenChange={setEditingBalance}>
      <DialogContent className="sm:max-w-md glass border-white/10">
        <DialogHeader>
          <DialogTitle>Saldo Anterior</DialogTitle>
          <DialogDescription>
            Defina o saldo real da conta no início do mês. Esse valor será o ponto de partida do gráfico DFC.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Label htmlFor="opening-balance" className="text-xs font-mono uppercase tracking-wider">Valor (R$)</Label>
          <Input
            id="opening-balance"
            value={balanceInput}
            onChange={(e) => setBalanceInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const parsed = parseFloat(balanceInput.replace(/\./g, '').replace(',', '.'));
                if (!isNaN(parsed)) {
                  setOpeningBalance(selectedMonth, parsed);
                  setEditingBalance(false);
                }
              }
            }}
            placeholder="1535,53"
            className="bg-background/50 border-white/10 rounded-xl"
            autoFocus
          />
        </div>
        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setOpeningBalance(selectedMonth, null);
              setEditingBalance(false);
            }}
            className="rounded-xl text-xs gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Auto-calcular
          </Button>
          <Button
            size="sm"
            onClick={() => {
              const parsed = parseFloat(balanceInput.replace(/\./g, '').replace(',', '.'));
              if (!isNaN(parsed)) {
                setOpeningBalance(selectedMonth, parsed);
                setEditingBalance(false);
              }
            }}
            className="rounded-xl text-xs"
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // ============================================================
  // MOBILE LAYOUT
  // ============================================================
  if (isMobile) {
    return (
      <div className="min-h-screen bg-background relative overflow-hidden">
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
                className="h-9 w-9 rounded-xl border border-white/10 hover:bg-red-500/20 hover:text-red-400"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* Mobile Content */}
        <main className="relative z-10 px-4 pb-28 space-y-4">

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
                  {/* Saldo Anterior — Big card */}
                  <div
                    className="glass rounded-2xl p-5 border-l-4 border-l-cyan-500 active:scale-[0.98] transition-transform"
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
                  </div>

                  {/* Entradas / Saídas */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="glass rounded-2xl p-4 border-l-4 border-l-emerald-500">
                      <div className="flex items-center gap-2 mb-2">
                        <ArrowUpCircle className="w-4 h-4 text-emerald-400" />
                        <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400">Entradas</span>
                      </div>
                      <p className="text-lg font-bold">{formatCurrency(selectedMonthStats.totalReceita)}</p>
                    </div>
                    <div className="glass rounded-2xl p-4 border-l-4 border-l-red-500">
                      <div className="flex items-center gap-2 mb-2">
                        <ArrowDownCircle className="w-4 h-4 text-red-400" />
                        <span className="text-[10px] font-mono uppercase tracking-widest text-red-400">Saídas</span>
                      </div>
                      <p className="text-lg font-bold">{formatCurrency(selectedMonthStats.totalDespesa)}</p>
                    </div>
                  </div>

                  {/* Saldo do Mês + Recebido */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="glass rounded-2xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Wallet className="w-4 h-4 text-cyan-400" />
                        <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Saldo Mês</span>
                      </div>
                      <p className={`text-lg font-bold ${(selectedMonthStats.totalReceita - selectedMonthStats.totalDespesa) >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
                        {formatCurrency(selectedMonthStats.totalReceita - selectedMonthStats.totalDespesa)}
                      </p>
                    </div>
                    <div className="glass rounded-2xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-4 h-4 text-emerald-400" />
                        <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Recebido</span>
                      </div>
                      <p className="text-lg font-bold">{formatCurrency(selectedMonthStats.recebido)}</p>
                    </div>
                  </div>

                  {/* Projetos / Recorrência */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="glass rounded-2xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Briefcase className="w-4 h-4 text-purple-400" />
                        <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Projetos</span>
                      </div>
                      <p className="text-lg font-bold">{formatCurrency(selectedMonthStats.projetos)}</p>
                    </div>
                    <div className="glass rounded-2xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <RefreshCw className="w-4 h-4 text-cyan-400" />
                        <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Recorrência</span>
                      </div>
                      <p className="text-lg font-bold">{formatCurrency(selectedMonthStats.recorrencia)}</p>
                    </div>
                  </div>

                  {/* Recent Transactions */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <h2 className="text-base font-bold">Transações Recentes</h2>
                      <button
                        onClick={() => setMobileTab('transactions')}
                        className="text-xs text-cyan-400 font-mono uppercase tracking-wider"
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
                              <p className="text-[10px] text-muted-foreground font-mono">{formatDate(t.date)} · {t.category || t.type}</p>
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
                  className="h-10 w-10 rounded-xl border border-white/10"
                  onClick={() => setShowImport(true)}
                >
                  <Upload className="w-4 h-4" />
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
                    onClick={() => setTypeFilter(key)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-mono uppercase tracking-wider transition-all ${
                      typeFilter === key
                        ? key === 'entradas' ? 'bg-emerald-600 text-white' : key === 'saidas' ? 'bg-red-600 text-white' : 'bg-foreground text-background'
                        : 'glass text-muted-foreground'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
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
                  <p className="text-[10px] font-mono uppercase text-muted-foreground">Saldo Anterior</p>
                  <p className="text-base font-bold mt-1">{formatCurrency(openingBalance)}</p>
                </div>
                <div className="flex-1 glass rounded-xl p-3">
                  <p className="text-[10px] font-mono uppercase text-muted-foreground">Projeção Final</p>
                  <p className={`text-base font-bold mt-1 ${projectedEnd >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {formatCurrency(projectedEnd)}
                  </p>
                </div>
              </div>

              <div className="glass rounded-2xl p-4 border border-white/5">
                <DFCChart data={dfcData} />
              </div>

              <div className="glass rounded-2xl border border-white/5 overflow-hidden">
                <MonthlyTable data={monthlyData} />
              </div>
            </>
          )}

          {/* ──── TAB: IA ──── */}
          {mobileTab === 'ai' && (
            <div className="h-[calc(100vh-180px)]">
              <AIAssistant onAddTransaction={addTransaction} transactions={transactions} alwaysExpanded />
            </div>
          )}
        </main>

        {/* FAB — Add Transaction */}
        {mobileTab !== 'ai' && (
          <button
            onClick={() => setShowAddForm(true)}
            className="fixed bottom-24 right-4 z-40 w-14 h-14 rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 flex items-center justify-center active:scale-90 transition-transform"
          >
            <Plus className="w-7 h-7" />
          </button>
        )}

        {/* Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-white/10 backdrop-blur-xl">
          <div className="flex justify-around items-center py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
            {([
              { id: 'home' as MobileTab, icon: Home, label: 'Início' },
              { id: 'transactions' as MobileTab, icon: Receipt, label: 'Extrato' },
              { id: 'dfc' as MobileTab, icon: BarChart3, label: 'DFC' },
              { id: 'ai' as MobileTab, icon: Sparkles, label: 'IA' },
            ]).map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => setMobileTab(id)}
                className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition-all ${
                  mobileTab === id
                    ? 'text-cyan-400'
                    : 'text-muted-foreground'
                }`}
              >
                <Icon className={`w-5 h-5 ${mobileTab === id ? 'scale-110' : ''} transition-transform`} />
                <span className="text-[10px] font-mono tracking-wider">{label}</span>
              </button>
            ))}
          </div>
        </nav>

        {/* Dialog: Add Transaction */}
        <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
          <DialogContent className="glass border-white/10 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nova Transação</DialogTitle>
            </DialogHeader>
            <AddTransactionForm onAdd={handleMobileAdd} />
          </DialogContent>
        </Dialog>

        {/* Dialog: Import Statement */}
        <Dialog open={showImport} onOpenChange={setShowImport}>
          <DialogContent className="glass border-white/10 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Importar Extrato</DialogTitle>
            </DialogHeader>
            <BankStatementUpload onImport={handleStatementImport} />
          </DialogContent>
        </Dialog>

        {/* Dialog: Saldo Anterior */}
        {saldoDialog}
      </div>
    );
  }

  // ============================================================
  // DESKTOP LAYOUT (unchanged)
  // ============================================================
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
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
            <p className="text-[10px] md:text-sm text-muted-foreground uppercase tracking-widest font-mono">
              FINANCE ENGINE <span className="text-cyan-500">•</span> AI ENABLED
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
              className="h-9 w-9 rounded-xl border border-white/10 hover:bg-red-500/20 hover:text-red-400"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container relative z-10 py-6 md:py-10 space-y-8 md:space-y-12">
        {/* Month Filter & AI */}
        <section className="flex flex-col lg:flex-row gap-6 justify-between items-stretch lg:items-center">
          <div className="glass p-1 rounded-2xl w-fit">
            <MonthFilter
              selectedMonth={selectedMonth}
              onMonthChange={setSelectedMonth}
              availableMonths={availableMonths}
            />
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

        {/* Stats Grid */}
        <section className="space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-1 w-8 bg-cyan-500 rounded-full" />
            <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Financial Dashboard</h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="col-span-2 lg:col-span-1">
              <StatsCard
                title="Saldo (Mês)"
                value={selectedMonthStats.totalReceita - selectedMonthStats.totalDespesa}
                icon={<Wallet className="w-5 h-5" />}
                variant="highlight"
                description="Receita Total - Despesas"
              />
            </div>
            <StatsCard
              title="Recebido (Mês)"
              value={selectedMonthStats.recebido}
              icon={<TrendingUp className="w-5 h-5 text-emerald-400" />}
            />
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
            <div
              className="relative overflow-hidden p-4 md:p-6 glass rounded-3xl transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 group hover:border-white/20 cursor-pointer"
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
            </div>

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

        {/* DFC Chart */}
        <section className="glass rounded-3xl p-6 border border-white/5">
          <div className="flex items-center gap-2 mb-6">
            <div className="h-1 w-8 bg-purple-500 rounded-full" />
            <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Cash Flow Projection</h2>
          </div>
          <DFCChart data={dfcData} />
        </section>

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
              <AddTransactionForm onAdd={handleAddTransactionAndScroll} />
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
                  onClick={() => setTypeFilter('all')}
                  className="rounded-xl h-9 px-3 text-xs font-mono uppercase tracking-wider"
                >
                  <List className="w-3.5 h-3.5 mr-1.5" />
                  Tudo
                </Button>
                <Button
                  variant={typeFilter === 'entradas' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setTypeFilter('entradas')}
                  className={`rounded-xl h-9 px-3 text-xs font-mono uppercase tracking-wider ${typeFilter === 'entradas' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                >
                  <ArrowUpCircle className="w-3.5 h-3.5 mr-1.5" />
                  Entradas
                </Button>
                <Button
                  variant={typeFilter === 'saidas' ? 'default' : 'ghost'}
                  size="sm"
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
            <p className="text-sm font-bold tracking-tighter uppercase">DRE Control</p>
            <p className="text-[10px] text-muted-foreground font-mono">NEXT GEN FINANCIAL OS</p>
          </div>
          <div className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-[0.2em] font-mono">
            © {new Date().getFullYear()} • SYSTEM ONLINE
          </div>
        </div>
      </footer>

      {/* Saldo dialog (desktop) */}
      {saldoDialog}
    </div>
  );
};

export default Index;
