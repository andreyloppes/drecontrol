
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

type SupabaseContextType = {
    client: SupabaseClient | null;
    isConnected: boolean;
    connect: (url: string, key: string) => Promise<{ success: boolean; error?: string }>;
    disconnect: () => void;
    config: { url: string; key: string } | null;
    isLoading: boolean;
};

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined);

export const SupabaseProvider = ({ children }: { children: ReactNode }) => {
    const [client, setClient] = useState<SupabaseClient | null>(null);
    const [config, setConfig] = useState<{ url: string; key: string } | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const storedUrl = localStorage.getItem('supabase_url');
        const storedKey = localStorage.getItem('supabase_key');

        if (storedUrl && storedKey) {
            try {
                const newClient = createClient(storedUrl, storedKey);
                setClient(newClient);
                setConfig({ url: storedUrl, key: storedKey });
            } catch (error) {
                console.error('Failed to initialize Supabase client:', error);
            }
        }
        setIsLoading(false);
    }, []);

    const connect = async (url: string, key: string): Promise<{ success: boolean; error?: string }> => {
        try {
            const newClient = createClient(url, key);

            // Verification query: Try to select 1 row (making it extremely cheap)
            const { error } = await newClient.from('transactions').select('id').limit(1);

            if (error) {
                console.error("Connection check failed:", error);

                // Check specifically for "relation does not exist" which means table missing
                if (error.code === '42P01') {
                    return { success: false, error: 'Tabela "transactions" não encontrada. Execute o SQL abaixo no Supabase.' };
                }

                // Generic connection error (e.g., bad URL/Key)
                return { success: false, error: 'Erro ao conectar. Verifique URL e Chave.' };
            }

            setClient(newClient);
            setConfig({ url, key });
            localStorage.setItem('supabase_url', url);
            localStorage.setItem('supabase_key', key);
            return { success: true };
        } catch (error: any) {
            console.error('Connection failed:', error);
            return { success: false, error: error?.message || 'Erro desconhecido ao conectar.' };
        }
    };

    const disconnect = () => {
        setClient(null);
        setConfig(null);
        localStorage.removeItem('supabase_url');
        localStorage.removeItem('supabase_key');
    };

    return (
        <SupabaseContext.Provider value={{ client, isConnected: !!client, connect, disconnect, config, isLoading }}>
            {children}
        </SupabaseContext.Provider>
    );
};

export const useSupabase = () => {
    const context = useContext(SupabaseContext);
    if (context === undefined) {
        throw new Error('useSupabase must be used within a SupabaseProvider');
    }
    return context;
};
