import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { RecurringTemplatesPanel } from '@/components/RecurringTemplatesPanel';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RecurringTemplatesDialog({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl glass border-white/10">
        <DialogHeader>
          <DialogTitle>Templates Recorrentes</DialogTitle>
          <DialogDescription>
            Crie templates para transações que se repetem todo mês (aluguel, salário, assinaturas). Use "Gerar" para materializá-los no mês selecionado como transações com status <span className="font-mono">previsto</span>.
          </DialogDescription>
        </DialogHeader>
        <RecurringTemplatesPanel onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
