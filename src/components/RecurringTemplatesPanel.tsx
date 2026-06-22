import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, Pencil, Power, PowerOff, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRecurringTemplates, NewRecurringTemplate, RecurringTemplate } from '@/hooks/useRecurringTemplates';
import { useFinanceContext } from '@/context/FinanceContext';
import { maskBRCurrency, parseMaskedBRNumber, formatNumberToMask } from '@/lib/currency-mask';
import { formatCurrency } from '@/lib/format';
import { TransactionType } from '@/types/finance';

const TYPE_LABELS: Record<TransactionType, string> = {
  projeto: 'Projeto',
  recorrencia: 'Recorrência',
  despesa: 'Despesa',
};

interface FormState {
  description: string;
  amountMasked: string;
  type: TransactionType;
  category: string;
  day_of_month: string;
  start_month: string;
  end_month: string;
  active: boolean;
}

function emptyForm(selectedMonth: string): FormState {
  return {
    description: '',
    amountMasked: '',
    type: 'recorrencia',
    category: '',
    day_of_month: '5',
    start_month: selectedMonth,
    end_month: '',
    active: true,
  };
}

function templateToForm(t: RecurringTemplate): FormState {
  return {
    description: t.description,
    amountMasked: formatNumberToMask(Math.abs(t.amount)),
    type: t.type,
    category: t.category,
    day_of_month: String(t.day_of_month),
    start_month: t.start_month,
    end_month: t.end_month ?? '',
    active: t.active,
  };
}

export function RecurringTemplatesPanel({ onClose }: { onClose?: () => void }) {
  const {
    templates, loading, tableExists,
    createTemplate, updateTemplate, deleteTemplate, toggleActive,
    templatesForMonth,
  } = useRecurringTemplates();
  const { selectedMonth, addTransaction, transactions } = useFinanceContext();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(() => emptyForm(selectedMonth));
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);

  const startCreate = () => {
    setEditingId(null);
    setForm(emptyForm(selectedMonth));
    setShowForm(true);
  };

  const startEdit = (t: RecurringTemplate) => {
    setEditingId(t.id);
    setForm(templateToForm(t));
    setShowForm(true);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm(selectedMonth));
  };

  const submit = async () => {
    const amount = parseMaskedBRNumber(form.amountMasked);
    const day = parseInt(form.day_of_month, 10);
    if (!form.description.trim()) return toast.error('Descrição obrigatória.');
    if (!Number.isFinite(amount) || amount <= 0) return toast.error('Valor inválido.');
    if (!Number.isFinite(day) || day < 1 || day > 31) return toast.error('Dia do mês deve estar entre 1 e 31.');
    if (!/^\d{4}-\d{2}$/.test(form.start_month)) return toast.error('Mês inicial inválido (use YYYY-MM).');
    if (form.end_month && !/^\d{4}-\d{2}$/.test(form.end_month)) return toast.error('Mês final inválido.');

    const payload: NewRecurringTemplate = {
      description: form.description.trim(),
      amount,
      type: form.type,
      category: form.category.trim(),
      day_of_month: day,
      start_month: form.start_month,
      end_month: form.end_month || null,
      active: form.active,
    };

    setBusy(true);
    const ok = editingId
      ? await updateTemplate(editingId, payload)
      : await createTemplate(payload);
    setBusy(false);
    if (ok) resetForm();
  };

  const applicableThisMonth = useMemo(
    () => templatesForMonth(selectedMonth),
    [templatesForMonth, selectedMonth]
  );

  const generateMissing = async () => {
    const existing = new Set(
      transactions
        .filter(t => t.month === selectedMonth)
        .map(t => `${t.description.trim().toLowerCase()}|${Math.abs(Number(t.amount)).toFixed(2)}`)
    );

    const toGenerate = applicableThisMonth.filter(t => {
      const key = `${t.description.trim().toLowerCase()}|${Math.abs(t.amount).toFixed(2)}`;
      return !existing.has(key);
    });

    if (toGenerate.length === 0) {
      toast.info('Todos os templates ativos já estão realizados neste mês.');
      return;
    }

    setBusy(true);
    let count = 0;
    for (const tpl of toGenerate) {
      const [yyyy, mm] = selectedMonth.split('-').map(Number);
      const lastDay = new Date(Date.UTC(yyyy, mm, 0)).getUTCDate();
      const safeDay = Math.min(tpl.day_of_month, lastDay).toString().padStart(2, '0');
      const ok = await addTransaction({
        description: tpl.description,
        amount: tpl.amount,
        type: tpl.type,
        category: tpl.category,
        status: 'previsto',
        date: `${selectedMonth}-${safeDay}`,
      });
      if (ok) count++;
    }
    setBusy(false);
    toast.success(`${count} transaç${count > 1 ? 'ões' : 'ão'} gerada${count > 1 ? 's' : ''} a partir dos templates.`);
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-muted-foreground text-sm">Carregando templates…</div>
    );
  }

  if (tableExists === false) {
    return (
      <div className="p-6 space-y-3 text-sm">
        <p className="font-semibold">Tabela <code>recurring_templates</code> não encontrada.</p>
        <p className="text-muted-foreground">
          Rode a migração <code>supabase/migrations/20260419_recurring_templates.sql</code> no SQL Editor do Supabase para habilitar templates persistentes.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <div className="h-1 w-8 bg-purple-500 rounded-full" />
          <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Templates de Recorrência</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={generateMissing}
            disabled={busy || applicableThisMonth.length === 0}
            aria-label={`Gerar transações faltantes para ${selectedMonth}`}
            className="h-9 rounded-xl border border-white/10 text-xs font-mono uppercase tracking-wider focus-visible:ring-2 focus-visible:ring-cyan-500"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
            Gerar {selectedMonth}
          </Button>
          <Button
            size="sm"
            onClick={startCreate}
            disabled={busy}
            className="h-9 rounded-xl text-xs font-mono uppercase tracking-wider bg-cyan-600 hover:bg-cyan-500 focus-visible:ring-2 focus-visible:ring-cyan-500"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
            Novo
          </Button>
          {onClose && (
            <Button
              size="icon"
              variant="ghost"
              onClick={onClose}
              aria-label="Fechar painel de templates"
              className="h-9 w-9 rounded-xl border border-white/10"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </Button>
          )}
        </div>
      </header>

      {showForm && (
        <div className="glass rounded-2xl p-4 border border-cyan-500/20 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="tpl-description" className="text-xs font-mono uppercase tracking-wider">Descrição</Label>
              <Input
                id="tpl-description"
                value={form.description}
                onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Ex: Aluguel escritório"
                className="bg-background/50 border-white/10 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tpl-amount" className="text-xs font-mono uppercase tracking-wider">Valor (R$)</Label>
              <Input
                id="tpl-amount"
                value={form.amountMasked}
                onChange={(e) => setForm(f => ({ ...f, amountMasked: maskBRCurrency(e.target.value) }))}
                inputMode="decimal"
                placeholder="0,00"
                className="bg-background/50 border-white/10 rounded-xl font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tpl-day" className="text-xs font-mono uppercase tracking-wider">Dia do mês</Label>
              <Input
                id="tpl-day"
                type="number"
                min={1}
                max={31}
                value={form.day_of_month}
                onChange={(e) => setForm(f => ({ ...f, day_of_month: e.target.value }))}
                className="bg-background/50 border-white/10 rounded-xl"
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <fieldset>
                <legend className="text-xs font-mono uppercase tracking-wider mb-2">Tipo</legend>
                <div role="radiogroup" className="grid grid-cols-3 gap-2">
                  {(Object.keys(TYPE_LABELS) as TransactionType[]).map(opt => (
                    <Button
                      key={opt}
                      type="button"
                      role="radio"
                      aria-checked={form.type === opt}
                      variant={form.type === opt ? 'default' : 'outline'}
                      onClick={() => setForm(f => ({ ...f, type: opt }))}
                      className={`rounded-xl border-white/10 text-xs font-mono uppercase tracking-wider ${
                        form.type === opt
                          ? opt === 'despesa'
                            ? 'bg-red-600 hover:bg-red-500'
                            : opt === 'projeto'
                              ? 'bg-purple-600 hover:bg-purple-500'
                              : 'bg-cyan-600 hover:bg-cyan-500'
                          : 'bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      {TYPE_LABELS[opt]}
                    </Button>
                  ))}
                </div>
              </fieldset>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tpl-category" className="text-xs font-mono uppercase tracking-wider">Categoria</Label>
              <Input
                id="tpl-category"
                value={form.category}
                onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}
                placeholder="Ex: infra"
                className="bg-background/50 border-white/10 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tpl-start" className="text-xs font-mono uppercase tracking-wider">Início (YYYY-MM)</Label>
              <Input
                id="tpl-start"
                type="month"
                value={form.start_month}
                onChange={(e) => setForm(f => ({ ...f, start_month: e.target.value }))}
                className="bg-background/50 border-white/10 rounded-xl"
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="tpl-end" className="text-xs font-mono uppercase tracking-wider">
                Fim (opcional) <span className="text-muted-foreground normal-case">— em branco = infinito</span>
              </Label>
              <Input
                id="tpl-end"
                type="month"
                value={form.end_month}
                onChange={(e) => setForm(f => ({ ...f, end_month: e.target.value }))}
                className="bg-background/50 border-white/10 rounded-xl"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={resetForm}
              disabled={busy}
              className="rounded-xl text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={submit}
              disabled={busy}
              className="rounded-xl text-xs bg-cyan-600 hover:bg-cyan-500"
            >
              {editingId ? 'Salvar alterações' : 'Criar template'}
            </Button>
          </div>
        </div>
      )}

      {templates.length === 0 && !showForm ? (
        <div className="glass rounded-2xl p-8 text-center text-sm text-muted-foreground border border-white/5">
          Sem templates cadastrados. Clique em <span className="font-mono">Novo</span> para criar o primeiro.
        </div>
      ) : (
        <ul className="space-y-2" aria-label="Lista de templates recorrentes">
          {templates.map(t => {
            const isActiveThisMonth = applicableThisMonth.some(a => a.id === t.id);
            return (
              <li
                key={t.id}
                className={`glass rounded-2xl p-4 border flex items-center justify-between gap-3 ${
                  t.active ? 'border-white/10' : 'border-white/5 opacity-60'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold truncate">{t.description}</span>
                    <span className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      t.type === 'despesa'
                        ? 'bg-red-500/20 text-red-300'
                        : t.type === 'projeto'
                          ? 'bg-purple-500/20 text-purple-300'
                          : 'bg-cyan-500/20 text-cyan-300'
                    }`}>
                      {TYPE_LABELS[t.type]}
                    </span>
                    {isActiveThisMonth && (
                      <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                        Ativo {selectedMonth}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 font-mono">
                    {formatCurrency(t.amount)} · dia {t.day_of_month} · {t.start_month} → {t.end_month ?? '∞'}
                    {t.category && <> · {t.category}</>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => toggleActive(t.id, !t.active)}
                    disabled={busy}
                    aria-label={t.active ? `Desativar template ${t.description}` : `Ativar template ${t.description}`}
                    className="h-9 w-9 rounded-xl focus-visible:ring-2 focus-visible:ring-cyan-500"
                  >
                    {t.active
                      ? <Power className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                      : <PowerOff className="w-4 h-4 text-muted-foreground" aria-hidden="true" />}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => startEdit(t)}
                    disabled={busy}
                    aria-label={`Editar template ${t.description}`}
                    className="h-9 w-9 rounded-xl focus-visible:ring-2 focus-visible:ring-cyan-500"
                  >
                    <Pencil className="w-4 h-4" aria-hidden="true" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => { if (confirm(`Apagar template "${t.description}"?`)) deleteTemplate(t.id); }}
                    disabled={busy}
                    aria-label={`Apagar template ${t.description}`}
                    className="h-9 w-9 rounded-xl hover:bg-red-500/20 hover:text-red-400 focus-visible:ring-2 focus-visible:ring-red-500"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
