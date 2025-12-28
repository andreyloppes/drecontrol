import { useFinance } from '@/hooks/useFinance';
import { AddTransactionForm } from '@/components/AddTransactionForm';
import { StatsCard } from '@/components/StatsCard';
import { MonthlyTable } from '@/components/MonthlyTable';
import { TransactionList } from '@/components/TransactionList';
import { MonthFilter } from '@/components/MonthFilter';
import { Wallet, TrendingUp, Clock, Calendar, Briefcase, RefreshCw } from 'lucide-react';

const Index = () => {
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
  } = useFinance();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b-2 border-foreground">
        <div className="container py-6">
          <h1 className="text-4xl font-bold tracking-tight">DRE Control</h1>
          <p className="text-muted-foreground mt-1">
            Controle financeiro • Tech • Automação • IA
          </p>
        </div>
      </header>

      <main className="container py-8 space-y-8">
        {/* Month Filter */}
        <section>
          <MonthFilter
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
            availableMonths={availableMonths}
          />
        </section>

        {/* Stats Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatsCard
            title="Caixa Total"
            value={totalCaixa}
            icon={<Wallet className="w-5 h-5" />}
            variant="highlight"
          />
          <StatsCard
            title="Recebido (Mês)"
            value={selectedMonthStats.recebido}
            icon={<TrendingUp className="w-5 h-5" />}
          />
          <StatsCard
            title="Pendente (Mês)"
            value={selectedMonthStats.pendente}
            icon={<Clock className="w-5 h-5" />}
          />
          <StatsCard
            title="Previsto (Mês)"
            value={selectedMonthStats.previsto}
            icon={<Calendar className="w-5 h-5" />}
          />
          <StatsCard
            title="Projetos (Mês)"
            value={selectedMonthStats.projetos}
            icon={<Briefcase className="w-5 h-5" />}
          />
          <StatsCard
            title="Recorrência (Mês)"
            value={selectedMonthStats.recorrencia}
            icon={<RefreshCw className="w-5 h-5" />}
          />
        </section>

        {/* Add Transaction */}
        <section>
          <h2 className="text-2xl font-bold mb-4 border-b-2 border-foreground pb-2">
            Nova Entrada
          </h2>
          <div className="border-2 border-foreground p-6 shadow-sm">
            <AddTransactionForm onAdd={addTransaction} />
          </div>
        </section>

        {/* Monthly Summary */}
        <section>
          <h2 className="text-2xl font-bold mb-4 border-b-2 border-foreground pb-2">
            Resumo Mensal
          </h2>
          <MonthlyTable data={monthlyData} />
        </section>

        {/* Transactions for Selected Month */}
        {filteredTransactions.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold mb-4 border-b-2 border-foreground pb-2">
              Entradas do Mês
            </h2>
            <TransactionList 
              transactions={filteredTransactions} 
              onDelete={deleteTransaction}
              onUpdateStatus={updateTransactionStatus}
            />
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t-2 border-foreground mt-8">
        <div className="container py-4 text-center text-sm text-muted-foreground">
          DRE Control © {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
};

export default Index;
