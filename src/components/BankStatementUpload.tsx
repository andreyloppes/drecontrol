import { useState, useRef } from 'react';
import { parseStatement, ParsedTransaction } from '@/lib/statement-parser';
import { Button } from '@/components/ui/button';
import { Upload, FileSpreadsheet, Check, X, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface BankStatementUploadProps {
  onImport: (transactions: ParsedTransaction[]) => Promise<void>;
}

export function BankStatementUpload({ onImport }: BankStatementUploadProps) {
  const [parsed, setParsed] = useState<ParsedTransaction[]>([]);
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const transactions = await parseStatement(file, file.name);

      if (transactions.length === 0) {
        toast.error('Nenhuma transação encontrada. Verifique se o arquivo é um extrato ou comprovante bancário (PDF, OFX ou CSV).');
        return;
      }

      setParsed(transactions);
      setFileName(file.name);
      setSelected(new Set(transactions.map((_, i) => i)));
      toast.success(`${transactions.length} transação(ões) encontrada(s)!`);
    } catch (err) {
      toast.error('Erro ao processar o arquivo.');
      console.error(err);
    }

    // Reset input so same file can be re-selected
    if (fileRef.current) fileRef.current.value = '';
  };

  const toggleSelect = (idx: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === parsed.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(parsed.map((_, i) => i)));
    }
  };

  const handleImport = async () => {
    const toImport = parsed.filter((_, i) => selected.has(i));
    if (toImport.length === 0) {
      toast.error('Selecione pelo menos uma transação.');
      return;
    }

    setImporting(true);
    try {
      await onImport(toImport);
      toast.success(`${toImport.length} transações importadas!`);
      setParsed([]);
      setFileName('');
      setSelected(new Set());
    } catch (err) {
      toast.error('Erro ao importar transações.');
      console.error(err);
    }
    setImporting(false);
  };

  const handleClear = () => {
    setParsed([]);
    setFileName('');
    setSelected(new Set());
  };

  const totalIncome = parsed.filter((t, i) => selected.has(i) && t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const totalExpense = parsed.filter((t, i) => selected.has(i) && t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  // No file loaded — show upload zone
  if (parsed.length === 0) {
    return (
      <div className="space-y-4">
        <label
          htmlFor="bank-statement-file"
          className="flex flex-col items-center justify-center gap-4 p-8 border-2 border-dashed border-white/10 rounded-3xl cursor-pointer hover:border-cyan-500/40 hover:bg-cyan-500/5 transition-all duration-300 group focus-within:border-cyan-500/60 focus-within:ring-2 focus-within:ring-cyan-500/40"
        >
          <div className="p-4 bg-cyan-500/10 rounded-2xl group-hover:bg-cyan-500/20 transition-colors">
            <Upload className="w-8 h-8 text-cyan-400" aria-hidden="true" />
          </div>
          <div className="text-center">
            <p className="font-bold text-sm">Importar Extrato Bancário</p>
            <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest mt-1">
              PDF • OFX • CSV • TXT
            </p>
          </div>
          <input
            id="bank-statement-file"
            ref={fileRef}
            type="file"
            accept=".pdf,.ofx,.ofc,.csv,.txt"
            onChange={handleFile}
            aria-label="Selecionar arquivo de extrato bancário (PDF, OFX, CSV ou TXT)"
            className="sr-only"
          />
        </label>
        <p className="text-[10px] text-muted-foreground/50 text-center font-mono">
          Anexe extrato ou comprovante do banco (PDF, OFX ou CSV)
        </p>
      </div>
    );
  }

  // File loaded — show preview
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/20 rounded-xl">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-bold">{fileName}</p>
            <p className="text-xs text-muted-foreground font-mono">
              {selected.size}/{parsed.length} selecionadas
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClear}
          aria-label="Descartar arquivo importado"
          className="h-11 w-11 text-muted-foreground hover:text-red-400 focus-visible:ring-2 focus-visible:ring-red-500"
        >
          <Trash2 className="w-4 h-4" aria-hidden="true" />
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3 text-center">
          <p className="text-xs uppercase tracking-widest text-emerald-400 font-mono">Entradas</p>
          <p className="text-lg font-bold text-emerald-300">{fmt(totalIncome)}</p>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-3 text-center">
          <p className="text-xs uppercase tracking-widest text-red-400 font-mono">Saídas</p>
          <p className="text-lg font-bold text-red-300">{fmt(totalExpense)}</p>
        </div>
      </div>

      {/* Select All */}
      <div className="flex items-center justify-between px-1">
        <button
          type="button"
          onClick={toggleAll}
          className="min-h-[44px] px-2 -ml-2 text-xs uppercase tracking-widest text-cyan-400 hover:text-cyan-300 font-mono transition-colors rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
        >
          {selected.size === parsed.length ? 'Desmarcar Todas' : 'Selecionar Todas'}
        </button>
        <span className="text-xs text-muted-foreground font-mono">
          Até {new Date().toLocaleDateString('pt-BR')}
        </span>
      </div>

      {/* Transaction List */}
      <div className="max-h-[400px] overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-white/10 pr-1">
        {parsed.map((t, idx) => (
          <button
            key={idx}
            type="button"
            role="checkbox"
            aria-checked={selected.has(idx)}
            aria-label={`${selected.has(idx) ? 'Desmarcar' : 'Marcar'} transação ${t.description} de ${fmt(t.amount)}`}
            onClick={() => toggleSelect(idx)}
            className={`w-full min-h-[44px] flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${
              selected.has(idx)
                ? 'bg-white/5 border border-white/10'
                : 'opacity-40 border border-transparent'
            }`}
          >
            <div className={`w-5 h-5 rounded-md border flex-shrink-0 flex items-center justify-center transition-all ${
              selected.has(idx) ? 'bg-cyan-500 border-cyan-400' : 'border-white/20'
            }`}>
              {selected.has(idx) && <Check className="w-3 h-3 text-white" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{t.description}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-muted-foreground font-mono">{t.date.split('-').reverse().join('/')}</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-white/5 text-muted-foreground font-mono">{t.category}</span>
              </div>
            </div>
            <span className={`text-sm font-mono font-bold flex-shrink-0 ${t.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {t.amount >= 0 ? '+' : ''}{fmt(t.amount)}
            </span>
          </button>
        ))}
      </div>

      {/* Import Button */}
      <Button
        onClick={handleImport}
        disabled={importing || selected.size === 0}
        className="w-full py-6 rounded-2xl font-bold uppercase tracking-widest bg-gradient-to-r from-cyan-600 to-emerald-600 hover:scale-[1.01] active:scale-[0.99] shadow-xl shadow-cyan-500/20 text-white transition-all"
      >
        {importing ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Importando...
          </>
        ) : (
          <>
            <Check className="w-5 h-5 mr-2" />
            Importar {selected.size} Transações
          </>
        )}
      </Button>
    </div>
  );
}
