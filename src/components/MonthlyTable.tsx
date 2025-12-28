import { MonthlyData } from '@/types/finance';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface MonthlyTableProps {
  data: MonthlyData[];
}

export function MonthlyTable({ data }: MonthlyTableProps) {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val);
  };

  const formatMonth = (month: string) => {
    const [year, m] = month.split('-');
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return `${months[parseInt(m) - 1]} ${year}`;
  };

  if (data.length === 0) {
    return (
      <div className="border-2 border-foreground p-8 text-center">
        <p className="text-muted-foreground">Nenhuma entrada registrada ainda.</p>
      </div>
    );
  }

  return (
    <div className="border-2 border-foreground overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-b-2 border-foreground bg-secondary">
            <TableHead className="font-bold text-foreground">Mês</TableHead>
            <TableHead className="font-bold text-foreground text-right">Projetos</TableHead>
            <TableHead className="font-bold text-foreground text-right">Recorrência</TableHead>
            <TableHead className="font-bold text-foreground text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <TableRow key={row.month} className="border-b border-foreground/20">
              <TableCell className="font-medium">{formatMonth(row.month)}</TableCell>
              <TableCell className="text-right font-mono">{formatCurrency(row.projetos)}</TableCell>
              <TableCell className="text-right font-mono">{formatCurrency(row.recorrencia)}</TableCell>
              <TableCell className="text-right font-mono font-bold">{formatCurrency(row.total)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
