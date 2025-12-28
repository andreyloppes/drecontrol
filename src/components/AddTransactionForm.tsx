import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TransactionType, PaymentStatus } from '@/types/finance';
import { Plus } from 'lucide-react';

interface AddTransactionFormProps {
  onAdd: (transaction: { description: string; amount: number; type: TransactionType; status: PaymentStatus; date: string; category: string }) => void;
}

export function AddTransactionForm({ onAdd }: AddTransactionFormProps) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('projeto');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState<PaymentStatus>('recebido');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount) return;

    onAdd({
      description,
      amount: parseFloat(amount),
      type,
      category: category || (type === 'despesa' ? 'Geral' : 'Vendas'),
      status,
      date,
    });

    setDescription('');
    setAmount('');
    setCategory('');
  };

  const statusOptions: { value: PaymentStatus; label: string }[] = [
    { value: 'recebido', label: type === 'despesa' ? 'Pago' : 'Recebido' },
    { value: 'pendente', label: 'Pendente' },
    { value: 'previsto', label: 'Previsto' },
    { value: 'cancelado', label: 'Cancelado' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="description">Descrição</Label>
          <Input
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={type === 'despesa' ? "Ex: Conta de Luz" : "Ex: Projeto Automação PPP"}
            className="border-2"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="amount">Valor (R$)</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0,00"
            className="border-2"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Tipo</Label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={type === 'projeto' ? 'default' : 'outline'}
            onClick={() => setType('projeto')}
            className="flex-1 border-2"
          >
            Projeto
          </Button>
          <Button
            type="button"
            variant={type === 'recorrencia' ? 'default' : 'outline'}
            onClick={() => setType('recorrencia')}
            className="flex-1 border-2"
          >
            Recorrência
          </Button>
          <Button
            type="button"
            variant={type === 'despesa' ? 'destructive' : 'outline'}
            onClick={() => setType('despesa')}
            className={`flex-1 border-2 ${type !== 'despesa' ? 'hover:bg-destructive/10 hover:text-destructive' : ''}`}
          >
            Despesa
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="category">Categoria</Label>
          <Input
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder={type === 'despesa' ? "Ex: Escritório, Software" : "Ex: Cliente A, Consultoria"}
            className="border-2"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="date">Data</Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border-2"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Status</Label>
        <div className="flex flex-wrap gap-2">
          {statusOptions.map((opt) => (
            <Button
              key={opt.value}
              type="button"
              variant={status === opt.value ? 'default' : 'outline'}
              onClick={() => setStatus(opt.value)}
              className="flex-1 min-w-[100px] border-2"
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      <Button type="submit" className={`w-full border-2 shadow-sm hover:shadow-md transition-shadow ${type === 'despesa' ? 'bg-destructive hover:bg-destructive/90' : ''}`}>
        <Plus className="w-4 h-4 mr-2" />
        {type === 'despesa' ? 'Adicionar Despesa' : 'Adicionar Entrada'}
      </Button>
    </form>
  );
}
