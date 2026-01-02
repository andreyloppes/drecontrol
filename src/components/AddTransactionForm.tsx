import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Transaction, TransactionType, PaymentStatus } from '@/types/finance';
import { Plus, Save } from 'lucide-react';

interface AddTransactionFormProps {
  onAdd: (transaction: { description: string; amount: number; type: TransactionType; status: PaymentStatus; date: string; category: string }) => void;
  initialData?: Transaction;
}

export function AddTransactionForm({ onAdd, initialData }: AddTransactionFormProps) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('projeto');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState<PaymentStatus>('recebido');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (initialData) {
      setDescription(initialData.description);
      // Important: Absolute value for editing, as the input expects positive numbers usually
      setAmount(Math.abs(initialData.amount).toString());
      setType(initialData.type);
      setCategory(initialData.category || '');
      setStatus(initialData.status);
      setDate(initialData.date);
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount) return;

    onAdd({
      description,
      amount: parseFloat(amount), // Passed as positive number, logic in useFinance/Wrapper handles sign based on type
      type,
      category: category || (type === 'despesa' ? 'Geral' : 'Vendas'),
      status,
      date,
    });

    if (!initialData) {
      setDescription('');
      setAmount('');
      setCategory('');
    }
  };

  const statusOptions: { value: PaymentStatus; label: string }[] = [
    { value: 'recebido', label: type === 'despesa' ? 'Pago' : 'Recebido' },
    { value: 'pendente', label: 'Pendente' },
    { value: 'previsto', label: 'Previsto' },
    { value: 'cancelado', label: 'Cancelado' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="description" className="text-xs uppercase tracking-widest text-muted-foreground ml-1">Descrição</Label>
          <Input
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={type === 'despesa' ? "Ex: Amazon Web Services" : "Ex: Projeto Neural Engine"}
            className="bg-white/5 border-white/10 rounded-xl px-4 py-6 focus:ring-purple-500/50 transition-all placeholder:text-muted-foreground/30"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="amount" className="text-xs uppercase tracking-widest text-muted-foreground ml-1">Valor (R$)</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0,00"
            className="bg-white/5 border-white/10 rounded-xl px-4 py-6 font-mono text-lg focus:ring-cyan-500/50 transition-all placeholder:text-muted-foreground/30"
          />
        </div>
      </div>

      <div className="space-y-3">
        <Label className="text-xs uppercase tracking-widest text-muted-foreground ml-1">Tipo de Fluxo</Label>
        <div className="grid grid-cols-3 gap-3">
          <Button
            type="button"
            variant={type === 'projeto' ? 'default' : 'outline'}
            onClick={() => setType('projeto')}
            className={`rounded-2xl py-6 border-white/10 transition-all duration-300 ${type === 'projeto' ? 'bg-purple-600 hover:bg-purple-500 shadow-lg shadow-purple-500/20 ring-1 ring-purple-400/50' : 'bg-white/5 hover:bg-white/10'
              }`}
          >
            Projeto
          </Button>
          <Button
            type="button"
            variant={type === 'recorrencia' ? 'default' : 'outline'}
            onClick={() => setType('recorrencia')}
            className={`rounded-2xl py-6 border-white/10 transition-all duration-300 ${type === 'recorrencia' ? 'bg-cyan-600 hover:bg-cyan-500 shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400/50 text-white' : 'bg-white/5 hover:bg-white/10'
              }`}
          >
            Recorrência
          </Button>
          <Button
            type="button"
            variant={type === 'despesa' ? 'destructive' : 'outline'}
            onClick={() => setType('despesa')}
            className={`rounded-2xl py-6 border-white/10 transition-all duration-300 ${type === 'despesa' ? 'bg-red-600 hover:bg-red-500 shadow-lg shadow-red-500/20 ring-1 ring-red-400/50' : 'bg-white/5 hover:bg-red-500/10'
              }`}
          >
            Despesa
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="category" className="text-xs uppercase tracking-widest text-muted-foreground ml-1">Categoria / Tag</Label>
          <Input
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder={type === 'despesa' ? "Ex: Cloud, Marketing" : "Ex: Cliente Alpha"}
            className="bg-white/5 border-white/10 rounded-xl px-4 py-6 focus:ring-purple-500/50 transition-all shadow-inner"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="date" className="text-xs uppercase tracking-widest text-muted-foreground ml-1">Data da Operação</Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-white/5 border-white/10 rounded-xl px-4 py-6 focus:ring-cyan-500/50 transition-all [color-scheme:dark]"
          />
        </div>
      </div>

      <div className="space-y-3">
        <Label className="text-xs uppercase tracking-widest text-muted-foreground ml-1">Status da Transação</Label>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {statusOptions.map((opt) => (
            <Button
              key={opt.value}
              type="button"
              variant={status === opt.value ? 'default' : 'outline'}
              onClick={() => setStatus(opt.value)}
              className={`rounded-xl py-4 border-white/5 text-xs transition-all duration-200 ${status === opt.value
                  ? (type === 'despesa' ? 'bg-red-600/20 text-red-100 ring-1 ring-red-500/40' : 'bg-emerald-600/20 text-emerald-100 ring-1 ring-emerald-500/40')
                  : 'bg-white/5 hover:bg-white/10 text-muted-foreground'
                }`}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      <Button
        type="submit"
        className={`w-full py-8 rounded-2xl text-lg font-bold tracking-tight transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] shadow-xl ${type === 'despesa'
            ? 'bg-gradient-to-r from-red-600 to-red-500 shadow-red-500/20'
            : 'bg-gradient-to-r from-cyan-600 via-purple-600 to-purple-500 shadow-purple-500/20 text-white'
          }`}
      >
        {initialData ? <Save className="w-6 h-6 mr-2" /> : <Plus className="w-6 h-6 mr-2" />}
        <span className="uppercase tracking-[0.1em]">{initialData ? 'Confirmar Updates' : (type === 'despesa' ? 'Registrar Saída' : 'Registrar Entrada')}</span>
      </Button>
    </form>
  );
}
