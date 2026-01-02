import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, parse, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MonthFilterProps {
  selectedMonth: string; // format: "YYYY-MM"
  onMonthChange: (month: string) => void;
  availableMonths: string[];
}

export function MonthFilter({ selectedMonth, onMonthChange, availableMonths }: MonthFilterProps) {
  const currentMonth = new Date().toISOString().substring(0, 7);

  const formatMonthLabel = (month: string) => {
    const date = parse(month, 'yyyy-MM', new Date());
    return format(date, "MMMM 'de' yyyy", { locale: ptBR });
  };

  const handlePrevMonth = () => {
    const date = parse(selectedMonth, 'yyyy-MM', new Date());
    const prevMonth = format(subMonths(date, 1), 'yyyy-MM');
    onMonthChange(prevMonth);
  };

  const handleNextMonth = () => {
    const date = parse(selectedMonth, 'yyyy-MM', new Date());
    const nextMonth = format(addMonths(date, 1), 'yyyy-MM');
    onMonthChange(nextMonth);
  };

  const isCurrentMonth = selectedMonth === currentMonth;

  return (
    <div className="flex items-center justify-between p-3 gap-6">
      <Button
        variant="ghost"
        size="icon"
        onClick={handlePrevMonth}
        className="h-10 w-10 border border-white/10 hover:bg-white/10 rounded-xl transition-all hover:scale-110 active:scale-90"
      >
        <ChevronLeft className="w-5 h-5" />
      </Button>

      <div className="text-center min-w-[160px]">
        <p className="text-lg font-bold tracking-tight capitalize text-transparent bg-clip-text bg-gradient-to-r from-foreground to-foreground/60 transition-all">
          {formatMonthLabel(selectedMonth)}
        </p>
        <div className="flex justify-center mt-1">
          {isCurrentMonth ? (
            <span className="text-[9px] uppercase tracking-[0.2em] font-mono text-cyan-400 animate-pulse font-bold">● Active Interval</span>
          ) : (
            <div className="h-[2px] w-8 bg-white/10 rounded-full" />
          )}
        </div>
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={handleNextMonth}
        disabled={availableMonths.length > 0 && selectedMonth === availableMonths[0]}
        className="h-10 w-10 border border-white/10 hover:bg-white/10 rounded-xl transition-all hover:scale-110 active:scale-90 disabled:opacity-20"
      >
        <ChevronRight className="w-5 h-5" />
      </Button>
    </div>
  );
}
