import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RotateCcw } from 'lucide-react';

interface OpeningBalanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  balanceInput: string;
  setBalanceInput: (value: string) => void;
  selectedMonth: string;
  setOpeningBalance: (month: string, value: number | null) => void;
}

/**
 * Diálogo compartilhado entre layouts mobile e desktop para editar o saldo anterior do mês.
 * Extraído do god component Index.tsx sem alteração de comportamento.
 */
export function OpeningBalanceDialog({
  open,
  onOpenChange,
  balanceInput,
  setBalanceInput,
  selectedMonth,
  setOpeningBalance,
}: OpeningBalanceDialogProps) {
  const commit = () => {
    const parsed = parseFloat(balanceInput.replace(/\./g, '').replace(',', '.'));
    if (!isNaN(parsed)) {
      setOpeningBalance(selectedMonth, parsed);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
              if (e.key === 'Enter') commit();
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
              onOpenChange(false);
            }}
            className="rounded-xl text-xs gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Auto-calcular
          </Button>
          <Button
            size="sm"
            onClick={commit}
            className="rounded-xl text-xs"
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
