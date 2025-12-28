import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Sparkles, Send } from 'lucide-react';
import { toast } from 'sonner';

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
        <Card className="border-2 border-primary/20 bg-primary/5">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                    <Sparkles className="w-5 h-5 text-primary" />
                    Assistente IA
                </CardTitle>
            </CardHeader>
            <CardContent>
                {showKeyInput ? (
                    <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Insira sua chave API da Groq (Grátis) para usar a IA.</p>
                        <div className="flex gap-2">
                            <input
                                type="password"
                                className="flex-1 p-2 border rounded text-sm"
                                placeholder="gsk_..."
                                onChange={(e) => setApiKey(e.target.value)}
                            />
                            <Button size="sm" onClick={() => handleSaveKey(apiKey)}>Salvar</Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Obtenha em <a href="https://console.groq.com" target="_blank" className="underline">console.groq.com</a>
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="relative">
                            <Textarea
                                placeholder="Ex: Recebi 500 do Cliente X hoje..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                className="pr-12 resize-none"
                                rows={3}
                            />
                            <Button
                                size="icon"
                                className="absolute bottom-2 right-2 h-8 w-8"
                                onClick={processInput}
                                disabled={isLoading}
                            >
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            </Button>
                        </div>
                        <div className="text-xs text-muted-foreground flex justify-between">
                            <span>Modelo: Llama 3 (via Groq)</span>
                            <button onClick={() => setShowKeyInput(true)} className="hover:underline">Alterar Chave</button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
