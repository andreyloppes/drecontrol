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
import { Wallet, TrendingUp, TrendingDown, Clock, Calendar, Briefcase, RefreshCw, Search, ArrowUpCircle, ArrowDownCircle, List, LogOut } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { useRef, useCallback } from 'react';

import { ThemeToggle } from '@/components/ThemeToggle';

const Index = () => {
  const navigate = useNavigate();
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
    loading
  } = useFinance();

  const handleAddTransactionAndScroll = useCallback(async (tx: any) => {
    await addTransaction(tx);
    setTimeout(() => {
      transactionListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 300);
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
  };

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
          {/* Assistente IA */}
          <div className="w-full lg:w-2/5">
            <AIAssistant onAddTransaction={addTransaction} transactions={transactions} />
          </div>
        </section>

        {loading ? (
          /* Loading Skeleton */
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
            <StatsCard
              title="Pendente (Entrar)"
              value={selectedMonthStats.pendente}
              icon={<Clock className="w-5 h-5" />}
            />
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
          {/* Add Transaction */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight px-1">
              Nova Transação
            </h2>
            <div className="glass p-6 rounded-3xl border border-white/5 h-fit">
              <AddTransactionForm onAdd={handleAddTransactionAndScroll} />
            </div>
          </section>

          {/* Monthly Summary */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight px-1">
              Resumo Mensal
            </h2>
            <div className="glass rounded-3xl border border-white/5 overflow-hidden">
              <MonthlyTable data={monthlyData} />
            </div>
          </section>
        </div>

        {/* Transactions / Extrato */}
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
    </div>
  );
};

export default Index;
