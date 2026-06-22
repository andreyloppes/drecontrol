import { useState, useRef, useEffect, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, Send, Plus, Settings2, X, Check, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { Transaction } from '@/types/finance';
import { useIsMobile } from '@/hooks/use-mobile';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  transaction?: {
    description: string;
    amount: number;
    type: 'projeto' | 'recorrencia' | 'despesa';
    category: string;
    date: string;
  };
  saved?: boolean;
}

interface AIAssistantProps {
  onAddTransaction: (transaction: any) => void;
  transactions?: Transaction[];
  alwaysExpanded?: boolean;
}

const GROQ_KEY_STORAGE = 'groq_api_key';

function AIAssistantInner({ onAddTransaction, transactions = [], alwaysExpanded = false }: AIAssistantProps) {
  const isMobile = useIsMobile();
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(GROQ_KEY_STORAGE) || '');
  const [showConfig, setShowConfig] = useState(false);
  const [tempKey, setTempKey] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isConfigured = !!apiKey;

  // On mobile, start collapsed; on desktop or alwaysExpanded, always expanded
  const isCollapsed = isMobile && !expanded && !alwaysExpanded;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSaveKey = () => {
    if (!tempKey.trim()) return;
    localStorage.setItem(GROQ_KEY_STORAGE, tempKey);
    setApiKey(tempKey);
    setShowConfig(false);
    setTempKey('');
    toast.success('API Key configurada!');
  };

  const buildContext = () => {
    const now = new Date();
    const currentMonth = now.toISOString().substring(0, 7);
    const monthTxs = transactions.filter(t => t.month === currentMonth);
    const totalIncome = monthTxs.filter(t => t.type !== 'despesa').reduce((s, t) => s + Number(t.amount), 0);
    const totalExpense = monthTxs.filter(t => t.type === 'despesa').reduce((s, t) => s + Math.abs(Number(t.amount)), 0);

    return `Contexto financeiro do usuário:
- Mês atual: ${currentMonth}
- Total de transações no mês: ${monthTxs.length}
- Receitas do mês: R$ ${totalIncome.toFixed(2)}
- Despesas do mês: R$ ${totalExpense.toFixed(2)}
- Saldo do mês: R$ ${(totalIncome - totalExpense).toFixed(2)}
- Data de hoje: ${now.toISOString().split('T')[0]}`;
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    if (!apiKey) {
      setShowConfig(true);
      toast.error('Configure sua Groq API Key primeiro.');
      return;
    }

    const userMessage: ChatMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const chatHistory = [...messages.slice(-6), userMessage].map(m => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            {
              role: 'system',
              content: `Você é um assistente financeiro pessoal integrado ao DRE Control. Responda sempre em português BR, de forma direta e curta.

${buildContext()}

Você tem 2 modos:

1) REGISTRAR TRANSAÇÃO - quando o usuário descreve um gasto ou receita, extraia os dados e retorne um JSON no formato:
\`\`\`json
{"action":"add","description":"...","amount":NUMBER,"type":"projeto|recorrencia|despesa","status":"recebido|pendente|previsto","category":"...","date":"YYYY-MM-DD"}
\`\`\`
- "projeto" = receita de projeto/cliente
- "recorrencia" = receita recorrente (salário, aluguel recebido, etc)
- "despesa" = qualquer gasto
- amount sempre positivo
- status: "recebido" se já foi pago/recebido; "pendente" se em aberto; "previsto" se é uma projeção/agendamento futuro
- Se a data for futura, use status "previsto"; se passada sem sinal de pagamento, use "pendente"; se usuário disser "paguei", "recebi", "foi pago", use "recebido"
- Se não souber a data, use hoje

2) CONVERSAR - quando o usuário perguntar sobre finanças, dê dicas, análise dos gastos, sugestões. Responda em texto normal, sem JSON.

Nunca misture JSON com texto. Se for transação, retorne APENAS o JSON. Se for conversa, retorne APENAS texto.`
            },
            ...chatHistory,
          ],
          temperature: 0.3,
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || `Erro ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;

      // Try to detect JSON transaction
      const jsonMatch = content.match(/```json\s*([\s\S]*?)```/) || content.match(/(\{[\s\S]*"action"\s*:\s*"add"[\s\S]*\})/);

      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
          if (parsed.action === 'add') {
            const inferredStatus = (() => {
              if (parsed.status && ['recebido', 'pendente', 'previsto', 'cancelado'].includes(parsed.status)) {
                return parsed.status;
              }
              if (parsed.date) {
                const today = new Date().toISOString().split('T')[0];
                return parsed.date > today ? 'previsto' : 'pendente';
              }
              return 'pendente';
            })();
            const tx = {
              description: parsed.description,
              amount: Math.abs(parsed.amount),
              type: parsed.type,
              category: parsed.category,
              date: parsed.date,
              status: inferredStatus,
            };
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: `Encontrei uma transação:`,
              transaction: tx,
            }]);
          }
        } catch {
          setMessages(prev => [...prev, { role: 'assistant', content }]);
        }
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content }]);
      }
    } catch (error: any) {
      console.error(error);
      const msg = error.message?.includes('401') || error.message?.includes('Invalid')
        ? 'API Key inválida. Clique no ícone de config para corrigir.'
        : 'Erro ao processar. Tente novamente.';
      setMessages(prev => [...prev, { role: 'assistant', content: msg }]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSaveTransaction = (msgIdx: number) => {
    const msg = messages[msgIdx];
    if (!msg.transaction) return;

    onAddTransaction({
      ...msg.transaction,
      status: (msg.transaction as any).status || 'pendente',
    });

    setMessages(prev => prev.map((m, i) =>
      i === msgIdx ? { ...m, saved: true } : m
    ));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const typeLabel: Record<string, string> = {
    projeto: 'Projeto',
    recorrencia: 'Receita',
    despesa: 'Despesa',
  };

  const typeColor: Record<string, string> = {
    projeto: 'text-purple-400',
    recorrencia: 'text-emerald-400',
    despesa: 'text-red-400',
  };

  // Collapsed mobile view - just header button
  if (isCollapsed) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        aria-label="Abrir assistente financeiro"
        aria-expanded={false}
        className="w-full min-h-[56px] glass border-white/5 rounded-3xl px-5 py-3 flex items-center justify-between hover:bg-white/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span className="font-bold text-sm">Assistente Financeiro</span>
        </div>
        <div className="flex items-center gap-2">
          {isConfigured && (
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          )}
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </div>
      </button>
    );
  }

  return (
    <div className="relative group">
      <div className="absolute inset-0 bg-purple-500/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-3xl" />
      <div className="relative glass border-white/5 rounded-3xl overflow-hidden flex flex-col" style={{ height: messages.length > 0 ? '420px' : 'auto' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="font-bold text-sm">Assistente Financeiro</span>
          </div>
          <div className="flex items-center gap-1">
            {isConfigured && (
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1" />
            )}
            <button
              type="button"
              onClick={() => setShowConfig(!showConfig)}
              aria-label="Configurar API Key"
              aria-expanded={showConfig}
              className="min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 md:p-1.5 rounded-lg hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
            >
              <Settings2 className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
            {isMobile && (
              <button
                type="button"
                onClick={() => setExpanded(false)}
                aria-label="Fechar assistente"
                className="min-h-[44px] min-w-[44px] rounded-lg hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        {/* Config panel */}
        {showConfig && (
          <div className="px-4 py-3 border-b border-white/5 bg-white/5 space-y-2">
            <label htmlFor="groq-api-key" className="block text-xs uppercase tracking-widest text-muted-foreground font-mono">
              Groq API Key (grátis em console.groq.com)
            </label>
            <div className="flex gap-2">
              <input
                id="groq-api-key"
                type="password"
                aria-label="Chave da API Groq"
                className="flex-1 bg-background/50 border border-white/10 rounded-lg px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                placeholder="gsk_..."
                value={tempKey}
                onChange={(e) => setTempKey(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveKey()}
              />
              <Button size="sm" className="rounded-lg bg-purple-600 hover:bg-purple-500 text-white h-11 md:h-8 px-3 focus-visible:ring-2 focus-visible:ring-purple-500" onClick={handleSaveKey}>
                Salvar
              </Button>
              <Button size="sm" variant="ghost" aria-label="Cancelar configuração da API Key" className="rounded-lg h-11 w-11 md:h-8 md:w-auto md:px-2 focus-visible:ring-2 focus-visible:ring-cyan-500" onClick={() => setShowConfig(false)}>
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </Button>
            </div>
          </div>
        )}

        {/* Chat messages */}
        <div
          role="log"
          aria-live="polite"
          aria-label="Histórico de mensagens do assistente"
          className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin scrollbar-thumb-white/10"
        >
          {messages.length === 0 && !showConfig && (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <Sparkles className="w-8 h-8 text-purple-400/40 mb-3" />
              <p className="text-sm text-muted-foreground">
                {isConfigured
                  ? 'Pergunte sobre suas finanças ou descreva uma transação'
                  : 'Configure sua API Key para começar'
                }
              </p>
              {isConfigured && (
                <div className="flex flex-wrap gap-2 mt-3 justify-center">
                  {['Paguei R$50 de uber', 'Como estão meus gastos?', 'Recebi R$3000 do cliente X'].map(q => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => { setInput(q); inputRef.current?.focus(); }}
                      aria-label={`Usar sugestão: ${q}`}
                      className="min-h-[44px] text-xs px-3 py-2 rounded-full border border-white/10 text-muted-foreground hover:text-foreground hover:border-purple-500/30 hover:bg-purple-500/5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                msg.role === 'user'
                  ? 'bg-purple-600/20 border border-purple-500/20 text-foreground'
                  : 'bg-white/5 border border-white/5 text-foreground'
              }`}>
                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>

                {/* Transaction card */}
                {msg.transaction && (
                  <div className="mt-2 p-3 bg-background/50 rounded-xl border border-white/10 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-xs">{msg.transaction.description}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          <span className={typeColor[msg.transaction.type]}>{typeLabel[msg.transaction.type]}</span>
                          {' · '}{msg.transaction.category}
                          {' · '}{msg.transaction.date.split('-').reverse().join('/')}
                        </p>
                      </div>
                      <span className={`font-mono font-bold text-sm ${
                        msg.transaction.type === 'despesa' ? 'text-red-400' : 'text-emerald-400'
                      }`}>
                        {msg.transaction.type === 'despesa' ? '-' : '+'}{fmt(msg.transaction.amount)}
                      </span>
                    </div>
                    {msg.saved ? (
                      <div className="flex items-center gap-1.5 text-emerald-400 text-[10px] font-mono uppercase">
                        <Check className="w-3 h-3" /> Salvo no banco
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        className="w-full h-8 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold uppercase tracking-wider"
                        onClick={() => handleSaveTransaction(idx)}
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" /> Salvar Transação
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white/5 border border-white/5 rounded-2xl px-4 py-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-xs">Pensando...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        {isConfigured && (
          <div className="px-4 py-3 border-t border-white/5">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Digite uma transação ou pergunta..."
                aria-label="Mensagem para o assistente financeiro"
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/60 focus-visible:border-purple-500/30 transition-all placeholder:text-muted-foreground/40"
                disabled={isLoading}
              />
              <Button
                size="icon"
                aria-label="Enviar mensagem"
                className="h-11 w-11 rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-purple-400"
                onClick={sendMessage}
                disabled={isLoading || !input.trim()}
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Send className="w-4 h-4" aria-hidden="true" />}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Memoize: heavy component that receives a large `transactions` array.
// Re-renders only when props (onAddTransaction, transactions ref, alwaysExpanded) change.
export const AIAssistant = memo(AIAssistantInner);
