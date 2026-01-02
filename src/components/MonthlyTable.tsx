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
      <div className="glass p-12 text-center rounded-3xl border border-white/5">
        <p className="text-muted-foreground font-mono uppercase tracking-widest text-xs">Sem dados processados</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table className="min-w-[500px]">
        <TableHeader>
          <TableRow className="border-b border-white/10 hover:bg-transparent">
            <TableHead className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Mês</TableHead>
            <TableHead className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground text-right">Receita Prevista</TableHead>
            <TableHead className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground text-right">Despesa Prevista</TableHead>
            <TableHead className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground text-right">Resultado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <TableRow key={row.month} className="border-b border-white/5 hover:bg-white/5 transition-colors">
              <TableCell className="font-semibold py-4">{formatMonth(row.month)}</TableCell>
              <TableCell className="text-right font-mono text-emerald-400 font-bold">{formatCurrency(row.receita)}</TableCell>
              <TableCell className="text-right font-mono text-red-400 font-bold">{formatCurrency(row.despesas)}</TableCell>
              <TableCell className={`text-right font-mono font-bold text-lg tracking-tighter ${row.saldo >= 0 ? 'text-cyan-400' : 'text-red-500'}`}>
                {formatCurrency(row.saldo)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
