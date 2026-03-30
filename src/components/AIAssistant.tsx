import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, Send, Plus, Settings2, X, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Transaction } from '@/types/finance';

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
}

const GROQ_KEY_STORAGE = 'groq_api_key';

export function AIAssistant({ onAddTransaction, transactions = [] }: AIAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(GROQ_KEY_STORAGE) || '');
  const [showConfig, setShowConfig] = useState(false);
  const [tempKey, setTempKey] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isConfigured = !!apiKey;

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
{"action":"add","description":"...","amount":NUMBER,"type":"projeto|recorrencia|despesa","category":"...","date":"YYYY-MM-DD"}
\`\`\`
- "projeto" = receita de projeto/cliente
- "recorrencia" = receita recorrente (salário, aluguel recebido, etc)
- "despesa" = qualquer gasto
- amount sempre positivo
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
            const tx = {
              description: parsed.description,
              amount: Math.abs(parsed.amount),
              type: parsed.type,
              category: parsed.category,
              date: parsed.date,
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
      status: 'recebido',
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
              onClick={() => setShowConfig(!showConfig)}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
            >
              <Settings2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Config panel */}
        {showConfig && (
          <div className="px-4 py-3 border-b border-white/5 bg-white/5 space-y-2">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">Groq API Key (grátis em console.groq.com)</p>
            <div className="flex gap-2">
              <input
                type="password"
                className="flex-1 bg-background/50 border border-white/10 rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-purple-500 outline-none"
                placeholder="gsk_..."
                value={tempKey}
                onChange={(e) => setTempKey(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveKey()}
              />
              <Button size="sm" className="rounded-lg bg-purple-600 hover:bg-purple-500 text-white h-8 px-3" onClick={handleSaveKey}>
                Salvar
              </Button>
              <Button size="sm" variant="ghost" className="rounded-lg h-8 px-2" onClick={() => setShowConfig(false)}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* Chat messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin scrollbar-thumb-white/10">
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
                      onClick={() => { setInput(q); inputRef.current?.focus(); }}
                      className="text-[10px] px-3 py-1.5 rounded-full border border-white/10 text-muted-foreground hover:text-foreground hover:border-purple-500/30 hover:bg-purple-500/5 transition-all"
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
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/30 outline-none transition-all placeholder:text-muted-foreground/40"
                disabled={isLoading}
              />
              <Button
                size="icon"
                className="h-10 w-10 rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                onClick={sendMessage}
                disabled={isLoading || !input.trim()}
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
