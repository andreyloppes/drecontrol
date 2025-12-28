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
    <div className="flex items-center justify-between border-2 border-foreground p-4">
      <Button
        variant="outline"
        size="icon"
        onClick={handlePrevMonth}
        className="border-2"
      >
        <ChevronLeft className="w-4 h-4" />
      </Button>

      <div className="text-center">
        <p className="text-lg font-bold capitalize">{formatMonthLabel(selectedMonth)}</p>
        {isCurrentMonth && (
          <span className="text-xs text-muted-foreground">Mês atual</span>
        )}
      </div>

      <Button
        variant="outline"
        size="icon"
        onClick={handleNextMonth}
        disabled={availableMonths.length > 0 && selectedMonth === availableMonths[0]}
        className="border-2"
      >
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}
