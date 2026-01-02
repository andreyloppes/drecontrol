
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

    const [errorMessage, setErrorMessage] = useState('');

    const handleConnect = async () => {
        setStatus('loading');
        setErrorMessage('');
        const { success, error } = await connect(url, key);
        if (success) {
            setStatus('success');
        } else {
            setStatus('error');
            setErrorMessage(error || 'Erro na conexão');
        }
    };

    const handleDisconnect = () => {
        disconnect();
        setStatus('idle');
        setUrl('');
        setKey('');
    };

    return (
        <div className="min-h-screen bg-background py-10 px-4 relative overflow-hidden flex flex-col items-center">
            {/* Background Futuristic Elements */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 blur-[120px] rounded-full animate-float" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full animate-float" style={{ animationDelay: '-3s' }} />
                <div className="absolute inset-0 cyber-grid opacity-[0.03] dark:opacity-[0.05]" />
            </div>

            <div className="w-full max-w-2xl relative z-10 space-y-8">
                <Card className="glass border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
                    <CardHeader className="border-b border-white/10 pb-8 pt-10 px-10">
                        <CardTitle className="flex items-center gap-3 text-3xl font-black tracking-tighter uppercase italic">
                            <div className="p-3 bg-cyan-500/20 rounded-2xl border border-cyan-500/30">
                                <Database className="h-8 w-8 text-cyan-400" />
                            </div>
                            CORE <span className="text-cyan-400">DATABASE</span>
                        </CardTitle>
                        <CardDescription className="text-muted-foreground/70 font-mono text-[10px] uppercase tracking-[0.2em] mt-3">
                            Remote Node Synchronization Protocol
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8 p-10">
                        {isConnected ? (
                            <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-3xl flex items-center gap-4 group transition-all hover:bg-emerald-500/15">
                                <div className="p-3 bg-emerald-500/20 rounded-2xl">
                                    <CheckCircle className="h-6 w-6 text-emerald-400" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-emerald-400 uppercase tracking-widest text-xs mb-1">Status: Operational</h4>
                                    <p className="text-emerald-100/60 font-mono text-[11px] truncate max-w-[300px]">
                                        Node: {config?.url}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <label htmlFor="supabase-url" className="text-[10px] uppercase font-mono tracking-[0.2em] text-muted-foreground ml-1">Endpoint URI</label>
                                    <Input
                                        id="supabase-url"
                                        placeholder="https://you-node.supabase.co"
                                        value={url}
                                        onChange={(e) => setUrl(e.target.value)}
                                        className="bg-white/5 border-white/10 rounded-2xl h-14 pl-6 font-mono focus:ring-cyan-500/30 transition-all"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label htmlFor="supabase-key" className="text-[10px] uppercase font-mono tracking-[0.2em] text-muted-foreground ml-1">Authorization Key</label>
                                    <Input
                                        id="supabase-key"
                                        placeholder="eyJhbGciOiJIUz..."
                                        value={key}
                                        onChange={(e) => setKey(e.target.value)}
                                        type="password"
                                        className="bg-white/5 border-white/10 rounded-2xl h-14 pl-6 font-mono focus:ring-purple-500/30 transition-all"
                                    />
                                </div>
                                {status === 'error' && (
                                    <Alert variant="destructive" className="bg-red-500/10 border-red-500/20 rounded-2xl">
                                        <AlertCircle className="h-4 w-4 text-red-400" />
                                        <AlertTitle className="uppercase font-bold text-[10px] tracking-widest text-red-400">Handshake Failed</AlertTitle>
                                        <AlertDescription className="text-red-100/60 text-[11px] font-mono">
                                            {errorMessage || 'Validate credentials and try again.'}
                                        </AlertDescription>
                                    </Alert>
                                )}
                            </div>
                        )}

                        <div className="pt-8 border-t border-white/10">
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                <Smartphone className="h-4 w-4 text-purple-400" />
                                Requirements & Deployment
                            </h3>
                            <div className="space-y-4">
                                <p className="text-[11px] text-muted-foreground font-mono leading-relaxed uppercase opacity-70">
                                    1. Execute Schema Initialization via SQL Engine. <br />
                                    2. Configure CORS Policies in Provider Dashboard.
                                </p>
                                <div className="relative group">
                                    <div className="absolute inset-0 bg-cyan-500/5 blur-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                    <div className="bg-black/60 backdrop-blur-md border border-white/5 p-6 rounded-3xl overflow-hidden relative">
                                        <pre className="text-[10px] font-mono text-cyan-300 opacity-80 leading-relaxed max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
                                            {SetupSQL}
                                        </pre>
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            className="absolute top-4 right-4 h-8 px-4 bg-white/10 hover:bg-white/20 border-white/5 rounded-xl uppercase font-mono text-[9px] tracking-widest text-cyan-100"
                                            onClick={() => navigator.clipboard.writeText(SetupSQL)}
                                        >
                                            Copy SQL
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="px-10 pb-10 flex gap-4">
                        <Button
                            variant="outline"
                            className="bg-white/5 border-white/10 rounded-2xl h-14 flex-1 font-mono uppercase text-[10px] tracking-widest hover:bg-white/10"
                            onClick={() => window.history.back()}
                        >
                            Abordar
                        </Button>
                        {isConnected ? (
                            <Button variant="destructive" className="rounded-2xl h-14 flex-1 uppercase font-black tracking-widest bg-red-600/20 text-red-400 border border-red-500/20 hover:bg-red-500/30" onClick={handleDisconnect}>Terminar Node</Button>
                        ) : (
                            <Button
                                className="rounded-2xl h-14 flex-1 uppercase font-black tracking-widest bg-gradient-to-r from-cyan-600 to-purple-600 hover:scale-[1.02] shadow-xl shadow-cyan-500/20 text-white"
                                onClick={handleConnect}
                                disabled={status === 'loading' || !url || !key}
                            >
                                {status === 'loading' ? 'Syncing...' : 'Link Node'}
                            </Button>
                        )}
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
