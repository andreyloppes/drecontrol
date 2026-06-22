import { useState, useEffect, useId } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Transaction, TransactionType, PaymentStatus } from '@/types/finance';
import { Plus, Save, Loader2, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { maskBRCurrency, formatNumberToMask } from '@/lib/currency-mask';
import { parseBRNumber } from '@/lib/parse-br-number';

interface InstallmentParams {
  description: string;
  amountPerInstallment: number;
  type: TransactionType;
  category: string;
  status: PaymentStatus;
  startDate: string;
  totalInstallments: number;
  dayOfMonth: number;
}

interface AddTransactionFormProps {
  onAdd: (transaction: { description: string; amount: number; type: TransactionType; status: PaymentStatus; date: string; category: string }) => void | Promise<boolean | void>;
  initialData?: Transaction;
  onInstallment?: (params: InstallmentParams) => Promise<boolean>;
}

interface FieldErrors {
  description?: string;
  amount?: string;
  date?: string;
}

export function AddTransactionForm({ onAdd, initialData, onInstallment }: AddTransactionFormProps) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('projeto');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState<PaymentStatus>('recebido');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string>('');

  // Parcelamento (só aparece para Despesa + modo "adicionar", nunca em edit)
  const [isInstallment, setIsInstallment] = useState(false);
  const [installmentCount, setInstallmentCount] = useState('3');
  const [installmentDay, setInstallmentDay] = useState(() => String(new Date().getDate()));
  const canInstall = type === 'despesa' && !initialData && !!onInstallment;

  const uid = useId();
  const descErrorId = `${uid}-desc-error`;
  const amountErrorId = `${uid}-amount-error`;
  const dateErrorId = `${uid}-date-error`;
  const formErrorId = `${uid}-form-error`;

  useEffect(() => {
    if (initialData) {
      setDescription(initialData.description);
      // Format stored number (e.g. 1500.5) into masked BR string ("1.500,50")
      setAmount(formatNumberToMask(initialData.amount));
      setType(initialData.type);
      setCategory(initialData.category || '');
      setStatus(initialData.status);
      setDate(initialData.date);
    }
  }, [initialData]);

  // Parcelar só existe pra despesa — ao mudar tipo, desativa o toggle.
  useEffect(() => {
    if (type !== 'despesa' && isInstallment) setIsInstallment(false);
  }, [type, isInstallment]);

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    if (!description.trim()) {
      next.description = 'Informe a descrição.';
    }
    const parsedAmount = parseBRNumber(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      next.amount = 'Valor inválido. Use apenas números (ex: 1500,50).';
    }
    if (!date) {
      next.date = 'Selecione uma data.';
    }
    return next;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const validationErrors = validate();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      // Fire toast for the first error (matches existing UX) AND announce inline via aria-live
      const firstMsg = validationErrors.description || validationErrors.amount || validationErrors.date || 'Verifique os campos.';
      setSubmitError(firstMsg);
      toast.error(firstMsg);
      return;
    }

    setSubmitError('');
    setIsSubmitting(true);
    try {
      let succeeded: boolean;

      if (isInstallment && canInstall && onInstallment) {
        const n = Math.max(1, Math.min(120, parseInt(installmentCount, 10) || 0));
        const day = Math.max(1, Math.min(31, parseInt(installmentDay, 10) || 1));
        if (n < 2) {
          toast.error('Parcelar exige no mínimo 2 parcelas.');
          setIsSubmitting(false);
          return;
        }
        succeeded = await onInstallment({
          description: description.trim(),
          amountPerInstallment: parseBRNumber(amount),
          type,
          category: category.trim() || 'Geral',
          status,
          startDate: date,
          totalInstallments: n,
          dayOfMonth: day,
        });
      } else {
        const result = await onAdd({
          description: description.trim(),
          amount: parseBRNumber(amount),
          type,
          category: category.trim() || (type === 'despesa' ? 'Geral' : 'Vendas'),
          status,
          date,
        });
        succeeded = result === undefined || result === true;
      }

      if (succeeded && !initialData) {
        setDescription('');
        setAmount('');
        setCategory('');
        setErrors({});
        setIsInstallment(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusOptions: { value: PaymentStatus; label: string }[] = [
    { value: 'recebido', label: type === 'despesa' ? 'Pago' : 'Recebido' },
    { value: 'pendente', label: 'Pendente' },
    { value: 'previsto', label: 'Previsto' },
    { value: 'cancelado', label: 'Cancelado' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate aria-describedby={submitError ? formErrorId : undefined}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="description" className="text-xs uppercase tracking-widest text-muted-foreground ml-1">
            Descrição <span className="text-red-400" aria-hidden="true">*</span>
            <span className="sr-only">(obrigatório)</span>
          </Label>
          <Input
            id="description"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              if (errors.description) setErrors(prev => ({ ...prev, description: undefined }));
            }}
            placeholder={type === 'despesa' ? "Ex: Amazon Web Services" : "Ex: Projeto Neural Engine"}
            aria-required="true"
            aria-invalid={!!errors.description}
            aria-describedby={errors.description ? descErrorId : undefined}
            className={`bg-white/5 border-white/10 rounded-xl px-4 py-6 focus:ring-purple-500/50 transition-all placeholder:text-muted-foreground/30 ${
              errors.description ? 'border-red-500/60 focus:ring-red-500/50' : ''
            }`}
          />
          {errors.description && (
            <p id={descErrorId} role="alert" className="text-xs text-red-400 ml-1 font-mono">
              {errors.description}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="amount" className="text-xs uppercase tracking-widest text-muted-foreground ml-1">
            Valor (R$) <span className="text-red-400" aria-hidden="true">*</span>
            <span className="sr-only">(obrigatório)</span>
          </Label>
          <Input
            id="amount"
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => {
              setAmount(maskBRCurrency(e.target.value));
              if (errors.amount) setErrors(prev => ({ ...prev, amount: undefined }));
            }}
            placeholder="0,00"
            aria-required="true"
            aria-invalid={!!errors.amount}
            aria-describedby={errors.amount ? amountErrorId : undefined}
            className={`bg-white/5 border-white/10 rounded-xl px-4 py-6 font-mono text-lg focus:ring-cyan-500/50 transition-all placeholder:text-muted-foreground/30 ${
              errors.amount ? 'border-red-500/60 focus:ring-red-500/50' : ''
            }`}
          />
          {errors.amount && (
            <p id={amountErrorId} role="alert" className="text-xs text-red-400 ml-1 font-mono">
              {errors.amount}
            </p>
          )}
        </div>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-xs uppercase tracking-widest text-muted-foreground ml-1 mb-1">Tipo de Fluxo</legend>
        <div className="grid grid-cols-3 gap-3" role="radiogroup" aria-label="Tipo de fluxo">
          <Button
            type="button"
            variant={type === 'projeto' ? 'default' : 'outline'}
            role="radio"
            aria-checked={type === 'projeto'}
            onClick={() => setType('projeto')}
            className={`rounded-2xl py-6 border-white/10 transition-all duration-300 focus-visible:ring-2 focus-visible:ring-purple-500 ${type === 'projeto' ? 'bg-purple-600 hover:bg-purple-500 shadow-lg shadow-purple-500/20 ring-1 ring-purple-400/50' : 'bg-white/5 hover:bg-white/10'
              }`}
          >
            Projeto
          </Button>
          <Button
            type="button"
            variant={type === 'recorrencia' ? 'default' : 'outline'}
            role="radio"
            aria-checked={type === 'recorrencia'}
            onClick={() => setType('recorrencia')}
            className={`rounded-2xl py-6 border-white/10 transition-all duration-300 focus-visible:ring-2 focus-visible:ring-cyan-500 ${type === 'recorrencia' ? 'bg-cyan-600 hover:bg-cyan-500 shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400/50 text-white' : 'bg-white/5 hover:bg-white/10'
              }`}
          >
            Recorrência
          </Button>
          <Button
            type="button"
            variant={type === 'despesa' ? 'destructive' : 'outline'}
            role="radio"
            aria-checked={type === 'despesa'}
            onClick={() => setType('despesa')}
            className={`rounded-2xl py-6 border-white/10 transition-all duration-300 focus-visible:ring-2 focus-visible:ring-red-500 ${type === 'despesa' ? 'bg-red-600 hover:bg-red-500 shadow-lg shadow-red-500/20 ring-1 ring-red-400/50' : 'bg-white/5 hover:bg-red-500/10'
              }`}
          >
            Despesa
          </Button>
        </div>
      </fieldset>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="category" className="text-xs uppercase tracking-widest text-muted-foreground ml-1">Categoria / Tag</Label>
          <Input
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder={type === 'despesa' ? "Ex: Cloud, Marketing" : "Ex: Cliente Alpha"}
            className="bg-white/5 border-white/10 rounded-xl px-4 py-6 focus:ring-purple-500/50 transition-all shadow-inner"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="date" className="text-xs uppercase tracking-widest text-muted-foreground ml-1">
            Data da Operação <span className="text-red-400" aria-hidden="true">*</span>
            <span className="sr-only">(obrigatório)</span>
          </Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              if (errors.date) setErrors(prev => ({ ...prev, date: undefined }));
            }}
            aria-required="true"
            aria-invalid={!!errors.date}
            aria-describedby={errors.date ? dateErrorId : undefined}
            className={`bg-white/5 border-white/10 rounded-xl px-4 py-6 focus:ring-cyan-500/50 transition-all [color-scheme:dark] ${
              errors.date ? 'border-red-500/60 focus:ring-red-500/50' : ''
            }`}
          />
          {errors.date && (
            <p id={dateErrorId} role="alert" className="text-xs text-red-400 ml-1 font-mono">
              {errors.date}
            </p>
          )}
        </div>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-xs uppercase tracking-widest text-muted-foreground ml-1 mb-1">Status da Transação</legend>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2" role="radiogroup" aria-label="Status da transação">
          {statusOptions.map((opt) => (
            <Button
              key={opt.value}
              type="button"
              variant={status === opt.value ? 'default' : 'outline'}
              role="radio"
              aria-checked={status === opt.value}
              onClick={() => setStatus(opt.value)}
              className={`rounded-xl py-4 border-white/5 text-xs transition-all duration-200 focus-visible:ring-2 focus-visible:ring-cyan-500 ${status === opt.value
                  ? (type === 'despesa' ? 'bg-red-600/20 text-red-100 ring-1 ring-red-500/40' : 'bg-emerald-600/20 text-emerald-100 ring-1 ring-emerald-500/40')
                  : 'bg-white/5 hover:bg-white/10 text-muted-foreground'
                }`}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </fieldset>

      {canInstall && (
        <div className="space-y-3 rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" aria-hidden="true" />
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-amber-200">Parcelar em Nx</div>
                <div className="text-[10px] text-muted-foreground font-mono">Cria 1 transação por mês com o mesmo valor.</div>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isInstallment}
              onClick={() => setIsInstallment(v => !v)}
              className={`h-6 w-11 rounded-full transition-colors relative focus-visible:ring-2 focus-visible:ring-amber-400 ${isInstallment ? 'bg-amber-500' : 'bg-white/10'}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${isInstallment ? 'translate-x-5' : 'translate-x-0'}`}
                aria-hidden="true"
              />
              <span className="sr-only">{isInstallment ? 'Desativar parcelamento' : 'Ativar parcelamento'}</span>
            </button>
          </div>

          {isInstallment && (
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1.5">
                <Label htmlFor="installment-count" className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                  Nº de parcelas
                </Label>
                <Input
                  id="installment-count"
                  type="number"
                  min={2}
                  max={120}
                  value={installmentCount}
                  onChange={e => setInstallmentCount(e.target.value)}
                  className="bg-white/5 border-white/10 rounded-xl font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="installment-day" className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                  Dia do vencimento
                </Label>
                <Input
                  id="installment-day"
                  type="number"
                  min={1}
                  max={31}
                  value={installmentDay}
                  onChange={e => setInstallmentDay(e.target.value)}
                  className="bg-white/5 border-white/10 rounded-xl font-mono"
                />
              </div>
              <div className="col-span-2 text-[11px] text-muted-foreground font-mono">
                {(() => {
                  const n = parseInt(installmentCount, 10) || 0;
                  const per = parseBRNumber(amount);
                  const total = n * per;
                  return n > 1 && per > 0
                    ? `${n}× R$ ${per.toFixed(2).replace('.', ',')} = R$ ${total.toFixed(2).replace('.', ',')} total`
                    : 'Defina valor e número de parcelas.';
                })()}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Live region for submit-level error summary */}
      {submitError && (
        <p id={formErrorId} role="alert" aria-live="assertive" className="text-sm text-red-400 font-mono ml-1">
          {submitError}
        </p>
      )}

      <Button
        type="submit"
        disabled={isSubmitting}
        className={`w-full py-5 md:py-6 min-h-[52px] rounded-2xl text-base md:text-lg font-bold tracking-tight transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-xl focus-visible:ring-2 focus-visible:ring-cyan-500 ${type === 'despesa'
            ? 'bg-gradient-to-r from-red-600 to-red-500 shadow-red-500/20'
            : 'bg-gradient-to-r from-cyan-600 via-purple-600 to-purple-500 shadow-purple-500/20 text-white'
          }`}
      >
        {isSubmitting ? (
          <Loader2 className="w-5 h-5 md:w-6 md:h-6 mr-2 animate-spin" aria-hidden="true" />
        ) : initialData ? (
          <Save className="w-5 h-5 md:w-6 md:h-6 mr-2" aria-hidden="true" />
        ) : (
          <Plus className="w-5 h-5 md:w-6 md:h-6 mr-2" aria-hidden="true" />
        )}
        <span className="uppercase tracking-[0.1em]">
          {isSubmitting
            ? 'Salvando...'
            : initialData
              ? 'Confirmar Updates'
              : isInstallment && canInstall
                ? `Criar ${installmentCount || 0}× Parcelas`
                : type === 'despesa'
                  ? 'Registrar Saída'
                  : 'Registrar Entrada'}
        </span>
      </Button>
    </form>
  );
}
