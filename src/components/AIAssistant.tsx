import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Sparkles, Send } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';

interface AIResponse {
    description: string;
    amount: number;
    type: 'projeto' | 'recorrencia' | 'despesa';
    category: string;
    date: string;
}

interface AIAssistantProps {
    onAddTransaction: (transaction: any) => void;
}

export function AIAssistant({ onAddTransaction }: AIAssistantProps) {
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [apiKey, setApiKey] = useState(() => localStorage.getItem('groq_api_key') || '');
    const [showKeyInput, setShowKeyInput] = useState(!apiKey);

    const handleSaveKey = (key: string) => {
        localStorage.setItem('groq_api_key', key);
        setApiKey(key);
        setShowKeyInput(false);
        toast.success('Chave de API salva!');
    };

    const processInput = async () => {
        if (!input.trim()) return;
        if (!apiKey) {
            toast.error('Por favor, configure sua chave da API Groq.');
            setShowKeyInput(true);
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: "llama3-8b-8192",
                    messages: [
                        {
                            role: "system",
                            content: `You are a financial assistant. Parse the user's natural language input into a JSON object with the following fields: 
              - description (string): short description.
              - amount (number): positive number.
              - type (string): one of ['projeto', 'recorrencia', 'despesa'].
              - category (string): inferred category (e.g., Alimentação, Transporte, Cliente X).
              - date (string): YYYY-MM-DD format. Assume current year if not specified. return today's date if not clear.
              
              Return ONLY the JSON object, no markdown.`
                        },
                        {
                            role: "user",
                            content: input
                        }
                    ],
                    temperature: 0,
                }),
            });

            const data = await response.json();
            const content = data.choices[0].message.content;

            // Attempt to parse JSON
            const jsonStr = content.replace(/```json\n?|\n?```/g, '').trim();
            const result: AIResponse = JSON.parse(jsonStr);

            if (result) {
                onAddTransaction({
                    ...result,
                    status: 'recebido' // Default status
                });
                toast.success(`Transação adicionada: ${result.description}`);
                setInput('');
            }
        } catch (error) {
            console.error(error);
            toast.error('Erro ao processar com IA. Verifique sua chave ou tente novamente.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="relative group">
            <div className="absolute inset-0 bg-purple-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-3xl" />
            <Card className="relative glass border-white/5 rounded-3xl overflow-hidden">
                <CardHeader className="pb-2 border-b border-white/5">
                    <CardTitle className="flex items-center gap-2 text-lg tracking-tight">
                        <Sparkles className="w-5 h-5 text-purple-400 animate-glow" />
                        <span className="font-bold">Assistente IA</span>
                        <Badge variant="outline" className="ml-auto font-mono text-[9px] uppercase tracking-tighter border-purple-500/30 text-purple-400 bg-purple-500/10">
                            Neural Engine
                        </Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                    {showKeyInput ? (
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground font-medium">Configure sua <span className="text-foreground">Groq API Key</span> para habilitar o processamento neural.</p>
                            <div className="flex gap-2">
                                <input
                                    type="password"
                                    className="flex-1 bg-background/50 border border-white/10 rounded-xl px-4 py-2 text-sm focus:ring-1 focus:ring-purple-500 outline-none transition-all"
                                    placeholder="gsk_..."
                                    onChange={(e) => setApiKey(e.target.value)}
                                />
                                <Button
                                    className="rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/20"
                                    size="sm"
                                    onClick={() => handleSaveKey(apiKey)}
                                >
                                    Ativar
                                </Button>
                            </div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest text-center">
                                Obtenha em <a href="https://console.groq.com" target="_blank" className="underline text-purple-400 hover:text-purple-300">console.groq.com</a>
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="relative">
                                <Textarea
                                    placeholder="Descreva a transação em linguagem natural..."
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    className="bg-transparent border-white/10 focus:border-purple-500/50 rounded-2xl pr-12 resize-none min-h-[100px] transition-all duration-300 focus:ring-0 placeholder:text-muted-foreground/50"
                                />
                                <Button
                                    size="icon"
                                    className="absolute bottom-3 right-3 h-10 w-10 rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/20 transition-all duration-300 hover:scale-110 active:scale-95 disabled:opacity-50"
                                    onClick={processInput}
                                    disabled={isLoading}
                                >
                                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                </Button>
                            </div>
                            <div className="flex justify-between items-center bg-white/5 py-2 px-3 rounded-xl border border-white/5">
                                <div className="flex flex-col">
                                    <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-mono">LLM Provider</span>
                                    <span className="text-[10px] font-bold text-foreground">Llama 3 8B</span>
                                </div>
                                <button
                                    onClick={() => setShowKeyInput(true)}
                                    className="text-[10px] uppercase font-mono tracking-wider text-purple-400 hover:text-purple-300 transition-colors"
                                >
                                    [Reconfig Key]
                                </button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
