import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { format, parse, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MonthFilterProps {
  selectedMonth: string; // format: "YYYY-MM"
  onMonthChange: (month: string) => void;
  availableMonths: string[];
}

export function MonthFilter({ selectedMonth, onMonthChange, availableMonths }: MonthFilterProps) {
  const currentMonth = new Date().toISOString().substring(0, 7);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const handleSelectMonth = (month: string) => {
    onMonthChange(month);
    setDropdownOpen(false);
  };

  const isCurrentMonth = selectedMonth === currentMonth;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  // Build a list of months to show in the dropdown
  const dropdownMonths = availableMonths.length > 0 ? [...availableMonths] : (() => {
    // Fallback: generate last 12 months
    const months: string[] = [];
    for (let i = 0; i < 12; i++) {
      const d = subMonths(new Date(), i);
      months.push(format(d, 'yyyy-MM'));
    }
    return months;
  })();

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

      <div className="text-center min-w-[160px] relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center justify-center gap-1.5 mx-auto cursor-pointer hover:opacity-80 transition-opacity"
        >
          <p className="text-lg font-bold tracking-tight capitalize text-transparent bg-clip-text bg-gradient-to-r from-foreground to-foreground/60 transition-all">
            {formatMonthLabel(selectedMonth)}
          </p>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
        </button>
        <div className="flex justify-center mt-1">
          {isCurrentMonth ? (
            <span className="text-[9px] uppercase tracking-[0.2em] font-mono text-cyan-400 animate-pulse font-bold">● Active Interval</span>
          ) : (
            <div className="h-[2px] w-8 bg-white/10 rounded-full" />
          )}
        </div>

        {/* Dropdown */}
        {dropdownOpen && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 w-56 max-h-64 overflow-y-auto rounded-xl border border-white/10 bg-popover/95 backdrop-blur-xl shadow-2xl py-1 scrollbar-thin scrollbar-thumb-white/10">
            {dropdownMonths.map((month) => (
              <button
                key={month}
                onClick={() => handleSelectMonth(month)}
                className={`w-full text-left px-4 py-2.5 text-sm capitalize transition-colors hover:bg-white/10 ${
                  month === selectedMonth
                    ? 'text-cyan-400 font-bold bg-white/5'
                    : 'text-foreground/80'
                } ${month === currentMonth ? 'font-semibold' : ''}`}
              >
                {formatMonthLabel(month)}
                {month === currentMonth && (
                  <span className="ml-2 text-[9px] uppercase tracking-wider text-cyan-400 font-mono">atual</span>
                )}
              </button>
            ))}
          </div>
        )}
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
