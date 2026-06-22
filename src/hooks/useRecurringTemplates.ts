import { useCallback, useEffect, useState } from 'react';
import { useSupabase } from '@/context/SupabaseContext';
import { toast } from 'sonner';
import { TransactionType } from '@/types/finance';

const TABLE = 'recurring_templates';

export interface RecurringTemplate {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  day_of_month: number;
  start_month: string;
  end_month: string | null;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

export type NewRecurringTemplate = Omit<RecurringTemplate, 'id' | 'created_at' | 'updated_at'>;

export function useRecurringTemplates() {
  const { client } = useSupabase();
  const [templates, setTemplates] = useState<RecurringTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableExists, setTableExists] = useState<boolean | null>(null);

  const fetchTemplates = useCallback(async () => {
    const { data, error } = await client
      .from(TABLE)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      // Tabela ainda não foi criada no Supabase — silencioso.
      console.warn('[recurring_templates] fallback:', error.message);
      setTableExists(false);
      setLoading(false);
      return;
    }
    setTableExists(true);
    setTemplates((data || []) as RecurringTemplate[]);
    setLoading(false);
  }, [client]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const createTemplate = useCallback(async (t: NewRecurringTemplate): Promise<boolean> => {
    const { data, error } = await client.from(TABLE).insert(t).select().single();
    if (error) {
      toast.error(`Erro ao criar template: ${error.message}`);
      return false;
    }
    if (data) {
      setTemplates(prev => [data as RecurringTemplate, ...prev]);
      toast.success('Template criado.');
      return true;
    }
    return false;
  }, [client]);

  const updateTemplate = useCallback(async (id: string, updates: Partial<NewRecurringTemplate>): Promise<boolean> => {
    const { error } = await client.from(TABLE).update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) {
      toast.error(`Erro ao atualizar: ${error.message}`);
      return false;
    }
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, ...updates } as RecurringTemplate : t));
    toast.success('Template atualizado.');
    return true;
  }, [client]);

  const deleteTemplate = useCallback(async (id: string): Promise<boolean> => {
    const { error } = await client.from(TABLE).delete().eq('id', id);
    if (error) {
      toast.error(`Erro ao apagar: ${error.message}`);
      return false;
    }
    setTemplates(prev => prev.filter(t => t.id !== id));
    toast.success('Template removido.');
    return true;
  }, [client]);

  const toggleActive = useCallback(async (id: string, active: boolean) => {
    await updateTemplate(id, { active });
  }, [updateTemplate]);

  /**
   * Retorna os templates que deveriam existir no mês YYYY-MM informado
   * (start_month <= month e (end_month nulo ou end_month >= month) e active).
   */
  const templatesForMonth = useCallback((month: string): RecurringTemplate[] => {
    return templates.filter(t => {
      if (!t.active) return false;
      if (t.start_month > month) return false;
      if (t.end_month && t.end_month < month) return false;
      return true;
    });
  }, [templates]);

  return {
    templates,
    loading,
    tableExists,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    toggleActive,
    templatesForMonth,
  };
}
