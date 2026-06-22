import { memo, useMemo, useState, useEffect } from 'react';
import { Wallet, Bus, UtensilsCrossed, Settings2 } from 'lucide-react';
import { useFinanceContext } from '@/context/FinanceContext';
import { workingDaysInMonth } from '@/lib/working-days';
import { formatCurrency } from '@/lib/format';
import { maskBRCurrency, parseMaskedBRNumber, formatNumberToMask } from '@/lib/currency-mask';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

const LS_COMIDA = 'dre_teto_comida_dia';
const LS_TRANSP = 'dre_teto_transp_dia';
const DEF_COMIDA = 30;
const DEF_TRANSP = 36;

const num = (key: string, def: number) => {
  try { const v = localStorage.getItem(key); return v ? Number(v) : def; } catch { return def; }
};

/**
 * ReembolsoCard (Onda 4) — teto de reembolso de trabalho por dia útil.
 * Mostra quanto já foi gasto em Alimentação e Transporte vs. o teto reembolsável,
 * e quanto do excedente sai do bolso. Único no mercado — sob medida pra quem tem
 * diária de reembolso (ex: R$30 comida + R$36 transporte por dia útil).
 */
export const ReembolsoCard = memo(function ReembolsoCard() {
  const { transactions, selectedMonth } = useFinanceContext();
  const [comidaDia, setComidaDia] = useState(DEF_COMIDA);
  const [transpDia, setTranspDia] = useState(DEF_TRANSP);
  const [editing, setEditing] = useState(false);
  const [inComida, setInComida] = useState('');
  const [inTransp, setInTransp] = useState('');

  useEffect(() => {
    setComidaDia(num(LS_COMIDA, DEF_COMIDA));
    setTranspDia(num(LS_TRANSP, DEF_TRANSP));
  }, []);

  const d = useMemo(() => {
    const du = workingDaysInMonth(selectedMonth);
    const tetoComida = comidaDia * du;
    const tetoTransp = transpDia * du;

    const gasto = (frag: string) =>
      transactions
        .filter((t) => t.month === selectedMonth && t.type === 'despesa' && t.status !== 'cancelado' && (t.category || '').toLowerCase().includes(frag))
        .reduce((a, t) => a + Math.abs(Number(t.amount)), 0);

    const gComida = gasto('aliment');
    const gTransp = gasto('transp');
    const excComida = Math.max(0, gComida - tetoComida);
    const excTransp = Math.max(0, gTransp - tetoTransp);

    return {
      du, tetoComida, tetoTransp, gComida, gTransp, excComida, excTransp,
      excedente: excComida + excTransp,
      tetoTotal: tetoComida + tetoTransp,
      temGasto: gComida > 0 || gTransp > 0,
    };
  }, [transactions, selectedMonth, comidaDia, transpDia]);

  if (!d.temGasto) return null; // só aparece pra quem usa reembolso

  const openEditor = () => {
    setInComida(formatNumberToMask(comidaDia));
    setInTransp(formatNumberToMask(transpDia));
    setEditing(true);
  };
  const commit = () => {
    const c = parseMaskedBRNumber(inComida);
    const t = parseMaskedBRNumber(inTransp);
    if (!isNaN(c)) { localStorage.setItem(LS_COMIDA, String(c)); setComidaDia(c); }
    if (!isNaN(t)) { localStorage.setItem(LS_TRANSP, String(t)); setTranspDia(t); }
    setEditing(false);
  };

  return (
    <section className="glass rounded-3xl p-6 border border-white/5" aria-labelledby="reembolso-title">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="h-1 w-8 bg-emerald-500 rounded-full" />
          <h2 id="reembolso-title" className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
            Teto de reembolso · {d.du} dias úteis
          </h2>
        </div>
        <button type="button" onClick={openEditor} aria-label="Ajustar tetos diários" className="text-muted-foreground hover:text-foreground transition-colors">
          <Settings2 className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Medidor icon={<UtensilsCrossed className="w-4 h-4 text-amber-400" />} label={`Alimentação · ${formatCurrency(comidaDia)}/dia`} gasto={d.gComida} teto={d.tetoComida} excedente={d.excComida} />
        <Medidor icon={<Bus className="w-4 h-4 text-cyan-400" />} label={`Transporte · ${formatCurrency(transpDia)}/dia`} gasto={d.gTransp} teto={d.tetoTransp} excedente={d.excTransp} />
      </div>

      <div className={`mt-5 rounded-2xl p-4 flex items-center gap-3 ${d.excedente > 0 ? 'bg-red-500/10 border border-red-500/20' : 'bg-emerald-500/10 border border-emerald-500/20'}`}>
        <Wallet className={`w-5 h-5 shrink-0 ${d.excedente > 0 ? 'text-red-400' : 'text-emerald-400'}`} aria-hidden="true" />
        <div>
          <p className="text-sm font-bold">
            {d.excedente > 0 ? `${formatCurrency(d.excedente)} saem do seu bolso este mês` : 'Tudo dentro do teto — bolso zerado 🎉'}
          </p>
          <p className="text-xs text-muted-foreground">
            {d.excedente > 0 ? 'Gasto acima do que o reembolso cobre. Marmita e transporte dentro do teto zeram isso.' : `O reembolso cobre até ${formatCurrency(d.tetoTotal)} no mês.`}
          </p>
        </div>
      </div>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="sm:max-w-md glass border-white/10">
          <DialogHeader>
            <DialogTitle>Tetos de reembolso por dia útil</DialogTitle>
            <DialogDescription>Quanto o trabalho reembolsa por dia. Tudo acima disso sai do seu bolso.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="space-y-2">
              <Label htmlFor="t-comida" className="text-xs uppercase tracking-wide">Alimentação/dia</Label>
              <Input id="t-comida" value={inComida} onChange={(e) => setInComida(maskBRCurrency(e.target.value))} inputMode="decimal" className="bg-background/50 border-white/10 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="t-transp" className="text-xs uppercase tracking-wide">Transporte/dia</Label>
              <Input id="t-transp" value={inTransp} onChange={(e) => setInTransp(maskBRCurrency(e.target.value))} inputMode="decimal" className="bg-background/50 border-white/10 rounded-xl" />
            </div>
          </div>
          <DialogFooter>
            <Button size="sm" onClick={commit} className="rounded-xl">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
});

function Medidor({ icon, label, gasto, teto, excedente }: { icon: React.ReactNode; label: string; gasto: number; teto: number; excedente: number }) {
  const pct = teto > 0 ? Math.min(100, (gasto / teto) * 100) : 0;
  const estourou = excedente > 0;
  return (
    <div className="glass rounded-2xl p-4 border border-white/5">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs font-semibold">{label}</span>
      </div>
      <p className="text-lg font-bold tracking-tight">
        {formatCurrency(gasto)} <span className="text-xs text-muted-foreground font-normal">de {formatCurrency(teto)}</span>
      </p>
      <div className="relative h-2 w-full rounded-full bg-white/5 overflow-hidden mt-2">
        <div className={`absolute inset-y-0 left-0 transition-all duration-500 ${estourou ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
      </div>
      <p className={`text-xs mt-1.5 ${estourou ? 'text-red-400' : 'text-muted-foreground'}`}>
        {estourou ? `${formatCurrency(excedente)} acima do teto` : `${formatCurrency(teto - gasto)} de margem`}
      </p>
    </div>
  );
}
