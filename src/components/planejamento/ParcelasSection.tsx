import { useMemo, useState } from 'react';
import { Transaction, TransactionType } from '@/types/finance';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/format';
import { maskBRCurrency, parseMaskedBRNumber } from '@/lib/currency-mask';
import { Plus, X, Save, CreditCard, Check } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  currentMonth: string;
  transactions: Transaction[];
  onCreate: (params: {
    description: string;
    category: string;
    type: TransactionType;
    totalInstallments: number;
    amountPerInstallment: number;
    startMonth: string;
    dayOfMonth: number;
  }) => Promise<{ ok: boolean; count: number }>;
}

interface InstallmentGroup {
  installment_id: string;
  baseDescription: string;
  category: string;
  type: TransactionType;
  total: number;
  amountPerParcela: number;
  paid: number;
  remaining: number;
  startMonth: string;
  endMonth: string;
  nextDue: Transaction | null;
}

function extractBaseDescription(desc: string): string {
  return desc.replace(/\s*\(\d+\/\d+\)\s*$/, '').trim();
}

export function ParcelasSection({ currentMonth, transactions, onCreate }: Props) {
  const [adding, setAdding] = useState(false);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState<TransactionType>('despesa');
  const [totalInstallments, setTotalInstallments] = useState('6');
  const [perInstallment, setPerInstallment] = useState('');
  const [totalValue, setTotalValue] = useState('');
  const [inputMode, setInputMode] = useState<'per' | 'total'>('per');
  const [startMonth, setStartMonth] = useState(currentMonth);
  const [day, setDay] = useState('10');

  const groups = useMemo<InstallmentGroup[]>(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of transactions) {
      if (!t.installment_id) continue;
      if (!map.has(t.installment_id)) map.set(t.installment_id, []);
      map.get(t.installment_id)!.push(t);
    }

    const result: InstallmentGroup[] = [];
    map.forEach((items, id) => {
      items.sort((a, b) => a.month.localeCompare(b.month));
      const first = items[0];
      const paid = items.filter(i => i.status === 'recebido').length;
      const active = items.filter(i => i.status !== 'cancelado');
      if (active.length === 0) return;
      const nextDue = items.find(i => i.status !== 'recebido' && i.status !== 'cancelado') || null;
      result.push({
        installment_id: id,
        baseDescription: extractBaseDescription(first.description),
        category: first.category,
        type: first.type,
        total: first.installment_total ?? items.length,
        amountPerParcela: Math.abs(Number(first.amount)),
        paid,
        remaining: items.length - paid,
        startMonth: first.month,
        endMonth: items[items.length - 1].month,
        nextDue,
      });
    });

    return result.sort((a, b) => a.endMonth.localeCompare(b.endMonth));
  }, [transactions]);

  const activeGroups = groups.filter(g => g.endMonth >= currentMonth);
  const finishedGroups = groups.filter(g => g.endMonth < currentMonth);

  const resetForm = () => {
    setAdding(false);
    setDescription('');
    setCategory('');
    setType('despesa');
    setTotalInstallments('6');
    setPerInstallment('');
    setTotalValue('');
    setInputMode('per');
    setStartMonth(currentMonth);
    setDay('10');
  };

  const handleCreate = async () => {
    const desc = description.trim();
    const cat = category.trim();
    const n = parseInt(totalInstallments, 10);
    const d = parseInt(day, 10);

    if (!desc) { toast.error('Descreva o item (ex: "Geladeira").'); return; }
    if (!cat) { toast.error('Informe a categoria.'); return; }
    if (!n || n < 1 || n > 60) { toast.error('Número de parcelas entre 1 e 60.'); return; }
    if (!d || d < 1 || d > 31) { toast.error('Dia do vencimento inválido.'); return; }

    let per = 0;
    if (inputMode === 'per') {
      per = parseMaskedBRNumber(perInstallment);
    } else {
      const total = parseMaskedBRNumber(totalValue);
      per = total / n;
    }
    if (per <= 0) { toast.error('Valor por parcela deve ser maior que zero.'); return; }

    const res = await onCreate({
      description: desc,
      category: cat,
      type,
      totalInstallments: n,
      amountPerInstallment: Math.round(per * 100) / 100,
      startMonth,
      dayOfMonth: d,
    });

    if (res.ok) resetForm();
  };

  const totalMonthlyCommitted = activeGroups
    .filter(g => currentMonth >= g.startMonth && currentMonth <= g.endMonth)
    .reduce((acc, g) => acc + g.amountPerParcela, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold tracking-tight flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-amber-400" />
            Parcelas em Andamento
          </h3>
          <p className="text-[10px] text-muted-foreground font-mono">
            {activeGroups.length} compra{activeGroups.length === 1 ? '' : 's'} · compromisso em {currentMonth}: <span className="text-foreground">{formatCurrency(totalMonthlyCommitted)}</span>
          </p>
        </div>
        {!adding && (
          <Button
            size="sm"
            onClick={() => setAdding(true)}
            className="h-9 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-mono uppercase tracking-wider"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Nova Parcela
          </Button>
        )}
      </div>

      {adding && (
        <div className="glass rounded-2xl p-4 border border-amber-500/20 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-5">
              <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Descrição</label>
              <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex: Geladeira Brastemp" className="mt-1 rounded-xl bg-white/5 border-white/10" autoFocus />
            </div>
            <div className="sm:col-span-4">
              <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Categoria</label>
              <Input value={category} onChange={e => setCategory(e.target.value)} placeholder="Ex: Casa" className="mt-1 rounded-xl bg-white/5 border-white/10" />
            </div>
            <div className="sm:col-span-3">
              <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Tipo</label>
              <div role="radiogroup" aria-label="Tipo" className="mt-1 grid grid-cols-2 gap-1">
                {(['despesa', 'projeto'] as TransactionType[]).map(t => (
                  <button
                    key={t}
                    type="button"
                    role="radio"
                    aria-checked={type === t}
                    onClick={() => setType(t)}
                    className={`min-h-[40px] text-[10px] font-mono uppercase tracking-wider rounded-xl border transition-colors px-2 ${
                      type === t ? 'border-amber-500/50 bg-amber-500/10' : 'border-white/10 text-muted-foreground hover:border-white/20'
                    }`}
                  >
                    {t === 'despesa' ? 'Saída' : 'Entrada'}
                  </button>
                ))}
              </div>
            </div>

            <div className="sm:col-span-3">
              <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Parcelas</label>
              <Input value={totalInstallments} onChange={e => setTotalInstallments(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="6" className="mt-1 rounded-xl bg-white/5 border-white/10 font-mono" />
            </div>

            <div className="sm:col-span-5">
              <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                {inputMode === 'per' ? 'Valor POR parcela' : 'Valor TOTAL da compra'}
              </label>
              <Input
                value={inputMode === 'per' ? perInstallment : totalValue}
                onChange={e => {
                  const masked = maskBRCurrency(e.target.value);
                  if (inputMode === 'per') setPerInstallment(masked);
                  else setTotalValue(masked);
                }}
                inputMode="numeric"
                placeholder="0,00"
                className="mt-1 rounded-xl bg-white/5 border-white/10 font-mono"
              />
              <button
                type="button"
                onClick={() => setInputMode(inputMode === 'per' ? 'total' : 'per')}
                className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 mt-1"
              >
                Mudar pra {inputMode === 'per' ? 'valor total' : 'valor por parcela'}
              </button>
            </div>

            <div className="sm:col-span-2">
              <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Dia</label>
              <Input value={day} onChange={e => setDay(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="10" className="mt-1 rounded-xl bg-white/5 border-white/10 font-mono" />
            </div>

            <div className="sm:col-span-2">
              <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Mês inicial</label>
              <Input type="month" value={startMonth} onChange={e => setStartMonth(e.target.value)} className="mt-1 rounded-xl bg-white/5 border-white/10 font-mono" />
            </div>

            <div className="sm:col-span-12 flex items-end gap-1">
              <div className="flex-1 text-[11px] text-muted-foreground font-mono">
                {(() => {
                  const n = parseInt(totalInstallments, 10) || 0;
                  const per = inputMode === 'per' ? parseMaskedBRNumber(perInstallment) : (parseMaskedBRNumber(totalValue) / Math.max(n, 1));
                  if (n < 1 || per <= 0) return 'Preview: preencha parcelas e valor';
                  return `Preview: ${n} transações de ${formatCurrency(per)} · total ${formatCurrency(per * n)} · até ${shiftMonth(startMonth, n - 1)}`;
                })()}
              </div>
              <Button size="sm" onClick={handleCreate} className="h-10 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-mono uppercase">
                <Save className="w-3.5 h-3.5 mr-1" /> Criar parcelas
              </Button>
              <Button size="icon" variant="ghost" onClick={resetForm} aria-label="Cancelar" className="h-10 w-10 rounded-xl">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {activeGroups.length === 0 && !adding && (
        <div className="glass rounded-2xl p-4 border border-white/10 text-center text-xs text-muted-foreground">
          Sem parcelas ativas. Clique em "Nova Parcela" pra registrar uma compra parcelada.
        </div>
      )}

      {activeGroups.length > 0 && (
        <div className="space-y-2">
          {activeGroups.map(g => {
            const progress = (g.paid / g.total) * 100;
            return (
              <div key={g.installment_id} className="glass rounded-2xl p-3 border border-white/5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium truncate">{g.baseDescription}</span>
                      <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border border-amber-500/30 text-amber-300">
                        {g.paid}/{g.total}
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground">{g.category}</span>
                    </div>
                    <div className="h-1 rounded-full bg-white/5 mt-2 overflow-hidden">
                      <div className="h-full bg-amber-400/60" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1 font-mono">
                      {formatCurrency(g.amountPerParcela)}/mês · total {formatCurrency(g.amountPerParcela * g.total)} · até {g.endMonth}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {finishedGroups.length > 0 && (
        <details className="glass rounded-2xl p-3 border border-white/5">
          <summary className="text-xs font-mono uppercase tracking-widest text-muted-foreground cursor-pointer">
            Quitadas ({finishedGroups.length}) <Check className="inline w-3 h-3 ml-1" />
          </summary>
          <div className="mt-2 space-y-1 text-[11px] font-mono text-muted-foreground">
            {finishedGroups.slice(0, 10).map(g => (
              <div key={g.installment_id} className="flex justify-between">
                <span>{g.baseDescription}</span>
                <span>{g.total}× {formatCurrency(g.amountPerParcela)}</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function shiftMonth(month: string, deltaMonths: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + deltaMonths, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}
