import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TransactionType } from '@/types/finance';
import { Plus } from 'lucide-react';

interface AddTransactionFormProps {
  onAdd: (transaction: { description: string; amount: number; type: TransactionType; date: string }) => void;
}

export function AddTransactionForm({ onAdd }: AddTransactionFormProps) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('projeto');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount) return;

    onAdd({
      description,
      amount: parseFloat(amount),
      type,
      date,
    });

    setDescription('');
    setAmount('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="description">Descrição</Label>
          <Input
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex: Projeto Automação XYZ"
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>
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

      <Button type="submit" className="w-full border-2 shadow-sm hover:shadow-md transition-shadow">
        <Plus className="w-4 h-4 mr-2" />
        Adicionar Entrada
      </Button>
    </form>
  );
}
