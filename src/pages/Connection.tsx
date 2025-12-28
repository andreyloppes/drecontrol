
import { useState } from 'react';
import { useSupabase } from '@/context/SupabaseContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Database, AlertCircle, CheckCircle, Smartphone } from 'lucide-react';

const SetupSQL = `
-- Copie e rode isso no SQL Editor do seu Supabase:

create table if not exists transactions (
  id uuid default gen_random_uuid() primary key,
  date text not null,
  amount numeric not null,
  description text not null,
  category text,
  type text not null,
  status text not null,
  month text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS (Segurança)
alter table transactions enable row level security;

-- Política simples: permitir tudo (pois é seu banco pessoal)
create policy "Allow all access" on transactions
for all using (true) with check (true);
`;

export function ConnectionPage() {
    const { connect, disconnect, isConnected, config } = useSupabase();
    const [url, setUrl] = useState(config?.url || '');
    const [key, setKey] = useState(config?.key || '');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

    const handleConnect = async () => {
        setStatus('loading');
        const success = await connect(url, key);
        if (success) {
            setStatus('success');
        } else {
            setStatus('error');
        }
    };

    const handleDisconnect = () => {
        disconnect();
        setStatus('idle');
        setUrl('');
        setKey('');
    };

    return (
        <div className="container mx-auto p-4 max-w-2xl space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Database className="h-6 w-6" />
                        Conectar Banco de Dados
                    </CardTitle>
                    <CardDescription>
                        Conecte seu próprio projeto Supabase para salvar seus dados na nuvem e acessar de qualquer lugar.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {isConnected ? (
                        <Alert className="bg-green-50 border-green-200">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <AlertTitle className="text-green-800">Conectado!</AlertTitle>
                            <AlertDescription className="text-green-700">
                                Seus dados estão sendo sincronizados com: <br />
                                <span className="font-mono text-xs">{config?.url}</span>
                            </AlertDescription>
                        </Alert>
                    ) : (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Project URL</label>
                                <Input
                                    placeholder="https://seu-projeto.supabase.co"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Anon Public Key</label>
                                <Input
                                    placeholder="eyJhbGciOiJIUz..."
                                    value={key}
                                    onChange={(e) => setKey(e.target.value)}
                                    type="password"
                                />
                            </div>
                            {status === 'error' && (
                                <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertTitle>Erro na conexão</AlertTitle>
                                    <AlertDescription>Verifique a URL e a Chave e tente novamente.</AlertDescription>
                                </Alert>
                            )}
                        </div>
                    )}

                    <div className="mt-8 pt-6 border-t">
                        <h3 className="font-semibold mb-2 flex items-center gap-2">
                            <Smartphone className="h-4 w-4" />
                            Configurar Tabela
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Para que funcione, você precisa criar a tabela no seu Supabase. Copie o código abaixo e rode no <strong>SQL Editor</strong> do Supabase.
                        </p>
                        <div className="bg-slate-950 text-slate-50 p-4 rounded-md overflow-x-auto text-xs font-mono relative">
                            <pre>{SetupSQL}</pre>
                            <Button
                                variant="secondary"
                                size="sm"
                                className="absolute top-2 right-2 h-6 text-xs"
                                onClick={() => navigator.clipboard.writeText(SetupSQL)}
                            >
                                Copiar SQL
                            </Button>
                        </div>
                    </div>

                </CardContent>
                <CardFooter className="flex justify-between">
                    {isConnected ? (
                        <Button variant="destructive" onClick={handleDisconnect}>Desconectar</Button>
                    ) : (
                        <Button onClick={handleConnect} disabled={status === 'loading' || !url || !key}>
                            {status === 'loading' ? 'Conectando...' : 'Conectar'}
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
}
