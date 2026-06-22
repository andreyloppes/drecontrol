import { memo, useMemo } from 'react';
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

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export const MonthlyTable = memo(function MonthlyTable({ data }: MonthlyTableProps) {
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const formatMonth = (month: string) => {
    const [year, m] = month.split('-');
    return `${MONTHS[parseInt(m) - 1]} ${year}`;
  };

  // Saldo acumulado = reserva rolando mês a mês (ordem cronológica crescente).
  const rows = useMemo(() => {
    const sorted = [...data].sort((a, b) => a.month.localeCompare(b.month));
    let running = 0;
    const withAcc = sorted.map((row) => {
      running += row.saldo;
      return { ...row, acumulado: running };
    });
    // Exibe do mês mais recente para o mais antigo (igual ao filtro de meses).
    return withAcc.reverse();
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="glass p-12 text-center rounded-3xl border border-white/5">
        <p className="text-muted-foreground text-sm">Sem dados para exibir</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table className="min-w-[560px]">
        <TableHeader>
          <TableRow className="border-b border-white/10 hover:bg-transparent">
            <TableHead className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Mês</TableHead>
            <TableHead className="text-[10px] uppercase tracking-wide text-muted-foreground text-right font-semibold">Receita</TableHead>
            <TableHead className="text-[10px] uppercase tracking-wide text-muted-foreground text-right font-semibold">Despesa</TableHead>
            <TableHead className="text-[10px] uppercase tracking-wide text-muted-foreground text-right font-semibold">Resultado</TableHead>
            <TableHead className="text-[10px] uppercase tracking-wide text-muted-foreground text-right font-semibold">Acumulado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.month} className="border-b border-white/5 hover:bg-white/5 transition-colors">
              <TableCell className="font-semibold py-4">{formatMonth(row.month)}</TableCell>
              <TableCell className="text-right font-mono text-emerald-400 font-bold">{formatCurrency(row.receita)}</TableCell>
              <TableCell className="text-right font-mono text-red-400 font-bold">{formatCurrency(row.despesas)}</TableCell>
              <TableCell className={`text-right font-mono font-bold ${row.saldo >= 0 ? 'text-cyan-400' : 'text-red-500'}`}>
                {row.saldo >= 0 ? '+' : ''}{formatCurrency(row.saldo)}
              </TableCell>
              <TableCell className={`text-right font-mono font-bold text-base tracking-tighter ${row.acumulado >= 0 ? 'text-foreground' : 'text-red-500'}`}>
                {formatCurrency(row.acumulado)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
});
