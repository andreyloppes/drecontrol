import { useFinance } from '@/hooks/useFinance';
import { AddTransactionForm } from '@/components/AddTransactionForm';
import { StatsCard } from '@/components/StatsCard';
import { MonthlyTable } from '@/components/MonthlyTable';
import { TransactionList } from '@/components/TransactionList';
import { MonthFilter } from '@/components/MonthFilter';
import { DFCChart } from '@/components/DFCChart';
import { AIAssistant } from '@/components/AIAssistant';
import { Wallet, TrendingUp, TrendingDown, Clock, Calendar, Briefcase, RefreshCw, Database, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

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
    dfcData,
    searchTerm,
    setSearchTerm,
    editTransaction
  } = useFinance();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b-2 border-foreground">
        <div className="container py-6 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">DRE Control</h1>
            <p className="text-muted-foreground mt-1">
              Controle financeiro • Tech • Automação • IA
            </p>
          </div>
          <a href="/settings" className="p-2 hover:bg-accent rounded-full text-foreground transition-colors" title="Conectar Banco de Dados">
            <Database className="w-6 h-6" />
          </a>
        </div>
      </header>

      <main className="container py-4 md:py-8 space-y-6 md:space-y-8">
        {/* Month Filter */}
        <section className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
          <MonthFilter
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
            availableMonths={availableMonths}
          />
          {/* Assistente IA */}
          <div className="w-full md:w-1/2 lg:w-1/3">
            <AIAssistant onAddTransaction={addTransaction} />
          </div>
        </section>

        {/* Stats Grid - Mobile Optimized: 2 columns for better density, Highlight card spans full width */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <div className="col-span-2 lg:col-span-1">
            <StatsCard
              title="Saldo (Mês)"
              value={(selectedMonthStats.recebido + selectedMonthStats.pendente + selectedMonthStats.previsto) - (selectedMonthStats.despesas + (selectedMonthStats.despesasPrevistas ?? 0))}
              icon={<Wallet className="w-5 h-5" />}
              variant="highlight"
              description="Receita Total - Despesas"
            />
          </div>
          <StatsCard
            title="Recebido (Mês)"
            value={selectedMonthStats.recebido}
            icon={<TrendingUp className="w-5 h-5 text-emerald-500" />}
          />
          <div className="col-span-2 lg:col-span-1">
            <StatsCard
              title="Despesas (Mês)"
              value={Math.abs(selectedMonthStats.despesas + (selectedMonthStats.despesasPrevistas ?? 0))}
              icon={<TrendingDown className="w-5 h-5 text-red-500" />}
              description={`Pago: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedMonthStats.despesas)} | Prev: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedMonthStats.despesasPrevistas ?? 0)}`}
            />
          </div>
          <div className="col-span-2 lg:col-span-1">
            <StatsCard
              title="Receita Total (Mês)"
              value={selectedMonthStats.recebido + selectedMonthStats.pendente + selectedMonthStats.previsto}
              icon={<Calendar className="w-5 h-5" />}
              description={`Realizado: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedMonthStats.recebido)} | Prev: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedMonthStats.pendente + selectedMonthStats.previsto)}`}
            />
          </div>
        </section>

        <section className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
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
          <div className="col-span-2 md:col-span-1">
            <StatsCard
              title="Recorrência (Receita)"
              value={selectedMonthStats.recorrencia}
              icon={<RefreshCw className="w-5 h-5" />}
            />
          </div>
        </section>

        {/* DFC Chart */}
        <section>
          <DFCChart data={dfcData} />
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Add Transaction */}
          <section>
            <h2 className="text-2xl font-bold mb-4 border-b-2 border-foreground pb-2">
              Nova Transação
            </h2>
            <div className="border-2 border-foreground p-6 shadow-sm h-fit">
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
        </div>

        {/* Transactions for Selected Month */}
        {/* Transactions / Search Results */}
        {(filteredTransactions.length > 0 || searchTerm) && (
          <section>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4 border-b-2 border-foreground pb-2">
              <h2 className="text-2xl font-bold">
                {searchTerm ? 'Resultado da Busca' : 'Extrato do Mês'}
              </h2>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar transação..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-9"
                />
              </div>
            </div>

            {filteredTransactions.length === 0 && searchTerm ? (
              <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-foreground/20">
                Nenhuma transação encontrada para "{searchTerm}".
              </div>
            ) : (
              <TransactionList
                transactions={filteredTransactions}
                onDelete={deleteTransaction}
                onUpdateStatus={updateTransactionStatus}
                onEdit={editTransaction}
              />
            )}
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
