import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { BudgetPlan, BudgetHealthReport } from '@/hooks/useBudgetPlans';
import { Transaction } from '@/types/finance';

const GROQ_KEY_STORAGE = 'groq_api_key';

interface Props {
  month: string;
  plans: BudgetPlan[];
  report: BudgetHealthReport;
  transactions: Transaction[];
  reservePct: number;
  tithePct: number;
}

export function DeepAnalysisButton({ month, plans, report, transactions, reservePct, tithePct }: Props) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);

  const run = async () => {
    const apiKey = localStorage.getItem(GROQ_KEY_STORAGE) || '';
    if (!apiKey) {
      toast.error('Configure a API Key no assistente da tela inicial primeiro.');
      return;
    }

    setLoading(true);
    setAnalysis(null);

    try {
      const monthTx = transactions.filter(t => t.month === month && t.status !== 'cancelado');

      const categoriesPlanned = plans.map(p => ({
        type: p.type,
        category: p.category,
        planned: Number(p.planned_amount),
      }));

      const actualByCat: Record<string, number> = {};
      monthTx.forEach(t => {
        const key = `${t.type}|${(t.category || 'Geral').trim()}`;
        actualByCat[key] = (actualByCat[key] ?? 0) + Math.abs(Number(t.amount));
      });

      const summary = {
        mes: month,
        receita_planejada: report.plannedIncome,
        receita_realizada: report.realizedIncome,
        despesa_planejada: report.plannedExpense,
        despesa_realizada: report.realizedExpense,
        saldo_planejado: report.plannedBalance,
        saldo_realizado: report.realizedBalance,
        meta_reserva_pct: reservePct,
        meta_reserva_valor: report.reserveTarget,
        meta_dizimo_pct: tithePct,
        meta_dizimo_valor: report.titheTarget,
        categorias_planejadas: categoriesPlanned,
        categorias_realizadas: actualByCat,
        categorias_acima: report.overBudget.map(o => ({
          category: o.category,
          planned: o.planned,
          actual: o.actual,
          pct_usado: o.pct.toFixed(0),
        })),
      };

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content: `Você é um analista financeiro sênior brasileiro. Recebe um resumo de planejamento mensal vs realizado e gera uma ANÁLISE PROFUNDA em português BR.

Estrutura obrigatória da resposta (markdown simples, sem emojis):

**Diagnóstico**
2-3 bullets sobre a saúde do mês (positivo e negativo).

**Categorias a ajustar**
Lista de 3 a 5 categorias com problema, cada uma com:
- Categoria
- Diagnóstico curto (1 linha)
- Ação específica (ex: "reduzir R$ X", "realocar pra reserva")

**Metas de reserva e dízimo**
Avaliação objetiva se as metas são viáveis e se estão sendo cumpridas.

**Próximos passos**
3 ações priorizadas (do mais impactante ao menos).

Seja direto, dê números concretos em BRL. Evite jargão. Cada bullet no máx 2 linhas.`
            },
            {
              role: 'user',
              content: `Analise este planejamento:\n\`\`\`json\n${JSON.stringify(summary, null, 2)}\n\`\`\``,
            },
          ],
          temperature: 0.3,
          max_tokens: 900,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || `Erro ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content?.trim();
      if (!content) throw new Error('Resposta vazia do modelo');
      setAnalysis(content);
    } catch (error: any) {
      console.error(error);
      const msg = error?.message?.includes('401')
        ? 'API Key inválida. Atualize no assistente da tela inicial.'
        : `Erro na análise: ${error.message || error}`;
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <Button
        onClick={run}
        disabled={loading}
        className="h-10 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white text-xs font-mono uppercase tracking-wider shadow-lg shadow-purple-500/20"
      >
        {loading ? (
          <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Analisando…</>
        ) : (
          <><Sparkles className="w-3.5 h-3.5 mr-1.5" /> Análise profunda com IA</>
        )}
      </Button>

      {analysis && (
        <article className="glass rounded-2xl p-4 border border-purple-500/20 text-sm leading-relaxed whitespace-pre-wrap">
          {analysis}
        </article>
      )}
    </div>
  );
}
