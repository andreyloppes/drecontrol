// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { Transaction } from '@/types/finance';
import {
  createMockSupabaseClient,
  withMockSupabase,
  MockSupabaseClient,
} from '@/test-utils/finance-test-harness';

// Mock the real SupabaseContext: re-export the test harness hook/provider
// under the same names, so `useFinance`'s `import { useSupabase } from
// '@/context/SupabaseContext'` resolves to our mock.
vi.mock('@/context/SupabaseContext', async () => {
  const harness = await import('@/test-utils/finance-test-harness');
  return {
    useSupabase: harness.useMockSupabase,
    SupabaseProvider: harness.MockSupabaseProvider,
  };
});

// Quiet the toasts
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}));

// Now it's safe to import the hook (its import chain touches SupabaseContext).
import { useFinance } from './useFinance';
import { format } from 'date-fns';

/**
 * Helper: builds realistic transaction rows. `amount` is stored as
 * signed number (despesa → negative), matching the real DB shape.
 */
function mkTx(overrides: Partial<Transaction> = {}): Transaction {
  const base: Transaction = {
    id: 'tx-1',
    description: 'Default',
    amount: 1000,
    type: 'projeto',
    category: 'Geral',
    status: 'recebido',
    date: '2025-06-15',
    month: '2025-06',
  };
  return { ...base, ...overrides };
}

/**
 * Render `useFinance` with a fresh mock client. Returns both the hook result
 * and the client (for assertions on `from`, `insert`, etc).
 *
 * Also silences the "relation does not exist" opening_balances console.warn
 * that fires on mount.
 */
function renderFinance(client: MockSupabaseClient) {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const result = renderHook(() => useFinance(), { wrapper: withMockSupabase(client) });
  return {
    ...result,
    client,
    cleanupWarn: () => warn.mockRestore(),
  };
}

describe('useFinance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Freeze "today" to keep `selectedMonth` default deterministic.
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-15T12:00:00Z'));
  });

  it('starts with loading=true and transactions=[]', () => {
    const client = createMockSupabaseClient({ transactions: [] });
    const { result, cleanupWarn } = renderFinance(client);

    expect(result.current.loading).toBe(true);
    expect(result.current.transactions).toEqual([]);
    cleanupWarn();
  });

  it('flips to loading=false and populates transactions after initial fetch resolves', async () => {
    // Switch to real timers so promise microtasks flush naturally.
    vi.useRealTimers();
    const txs = [mkTx({ id: 'a' }), mkTx({ id: 'b', description: 'Other' })];
    const client = createMockSupabaseClient({ transactions: txs });
    const { result, cleanupWarn } = renderFinance(client);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.transactions).toHaveLength(2);
    expect(result.current.transactions[0].id).toBe('a');
    cleanupWarn();
  });

  it('filteredTransactions respects selectedMonth', async () => {
    vi.useRealTimers();
    const txs = [
      mkTx({ id: 'jun', month: '2025-06', date: '2025-06-10' }),
      mkTx({ id: 'jul', month: '2025-07', date: '2025-07-10' }),
    ];
    const client = createMockSupabaseClient({ transactions: txs });
    const { result, cleanupWarn } = renderFinance(client);

    await waitFor(() => expect(result.current.transactions).toHaveLength(2));

    act(() => result.current.setSelectedMonth('2025-06'));
    expect(result.current.filteredTransactions.map(t => t.id)).toEqual(['jun']);

    act(() => result.current.setSelectedMonth('2025-07'));
    expect(result.current.filteredTransactions.map(t => t.id)).toEqual(['jul']);

    cleanupWarn();
  });

  it('filteredTransactions applies searchTerm AFTER month filter (regression test)', async () => {
    vi.useRealTimers();
    const txs = [
      mkTx({ id: 'jun-aws', month: '2025-06', description: 'AWS' }),
      mkTx({ id: 'jun-gcp', month: '2025-06', description: 'GCP' }),
      // Same description in a different month — must be excluded by month filter
      mkTx({ id: 'jul-aws', month: '2025-07', description: 'AWS' }),
    ];
    const client = createMockSupabaseClient({ transactions: txs });
    const { result, cleanupWarn } = renderFinance(client);

    await waitFor(() => expect(result.current.transactions).toHaveLength(3));

    act(() => {
      result.current.setSelectedMonth('2025-06');
      result.current.setSearchTerm('aws');
    });

    // Only the June AWS one — July is filtered out by month first.
    expect(result.current.filteredTransactions.map(t => t.id)).toEqual(['jun-aws']);
    cleanupWarn();
  });

  it('filteredTransactions respects typeFilter entradas/saidas', async () => {
    vi.useRealTimers();
    const txs = [
      mkTx({ id: 'p', type: 'projeto', amount: 500, month: '2025-06' }),
      mkTx({ id: 'r', type: 'recorrencia', amount: 200, month: '2025-06' }),
      mkTx({ id: 'd', type: 'despesa', amount: -100, month: '2025-06' }),
    ];
    const client = createMockSupabaseClient({ transactions: txs });
    const { result, cleanupWarn } = renderFinance(client);

    await waitFor(() => expect(result.current.transactions).toHaveLength(3));
    act(() => result.current.setSelectedMonth('2025-06'));

    act(() => result.current.setTypeFilter('entradas'));
    expect(result.current.filteredTransactions.map(t => t.id).sort()).toEqual(['p', 'r']);

    act(() => result.current.setTypeFilter('saidas'));
    expect(result.current.filteredTransactions.map(t => t.id)).toEqual(['d']);

    act(() => result.current.setTypeFilter('all'));
    expect(result.current.filteredTransactions).toHaveLength(3);

    cleanupWarn();
  });

  it('addTransaction calls supabase insert and prepends the new row to state', async () => {
    vi.useRealTimers();
    const inserted: Transaction = mkTx({ id: 'new', description: 'Inserted' });
    const client = createMockSupabaseClient({
      transactions: [mkTx({ id: 'existing' })],
      insertResult: inserted,
    });
    const { result, cleanupWarn } = renderFinance(client);

    await waitFor(() => expect(result.current.transactions).toHaveLength(1));

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.addTransaction({
        description: 'Inserted',
        amount: 500,
        type: 'projeto',
        category: 'Vendas',
        status: 'recebido',
        date: '2025-06-20',
      });
    });

    expect(success).toBe(true);
    expect(client.from).toHaveBeenCalledWith('transactions');
    // Newest prepended.
    expect(result.current.transactions[0].id).toBe('new');
    expect(result.current.transactions).toHaveLength(2);
    cleanupWarn();
  });

  it('deleteTransaction removes the row from local state on success', async () => {
    vi.useRealTimers();
    const txs = [mkTx({ id: 'keep' }), mkTx({ id: 'drop', description: 'Drop' })];
    const client = createMockSupabaseClient({ transactions: txs });
    const { result, cleanupWarn } = renderFinance(client);

    await waitFor(() => expect(result.current.transactions).toHaveLength(2));

    await act(async () => {
      await result.current.deleteTransaction('drop');
    });

    expect(result.current.transactions.map(t => t.id)).toEqual(['keep']);
    cleanupWarn();
  });

  it('monthlyData aggregates projeto/recorrencia/despesa correctly per month', async () => {
    vi.useRealTimers();
    const txs = [
      mkTx({ id: '1', type: 'projeto', amount: 1000, month: '2025-06', status: 'recebido' }),
      mkTx({ id: '2', type: 'recorrencia', amount: 500, month: '2025-06', status: 'recebido' }),
      mkTx({ id: '3', type: 'despesa', amount: -200, month: '2025-06', status: 'recebido' }),
      // cancelado should be ignored
      mkTx({ id: '4', type: 'projeto', amount: 9999, month: '2025-06', status: 'cancelado' }),
    ];
    const client = createMockSupabaseClient({ transactions: txs });
    const { result, cleanupWarn } = renderFinance(client);

    await waitFor(() => expect(result.current.transactions).toHaveLength(4));

    const jun = result.current.monthlyData.find(m => m.month === '2025-06');
    expect(jun).toBeDefined();
    expect(jun!.projetos).toBe(1000);
    expect(jun!.recorrencia).toBe(500);
    expect(jun!.despesas).toBe(200); // stored as absolute value
    expect(jun!.receita).toBe(1500); // projeto + recorrencia
    // total includes the negative despesa: 1000 + 500 + (-200) = 1300
    expect(jun!.total).toBe(1300);

    cleanupWarn();
  });

  it('replicateRecurringToNextMonth skips recurring items already present in the next month (dedup)', async () => {
    vi.useRealTimers();
    // With TZ=UTC forced in test-setup, `format(nextDate, 'yyyy-MM')`
    // reliably returns the month AFTER the current one.
    const now = new Date();
    const currentMonth = now.toISOString().substring(0, 7);
    const [yyyy, mm] = currentMonth.split('-').map(Number);
    const nextDate = new Date(Date.UTC(yyyy, mm, 1));
    const nextMonth = format(nextDate, 'yyyy-MM');

    const txs: Transaction[] = [
      mkTx({
        id: 'src-aws',
        type: 'recorrencia',
        description: 'AWS',
        amount: 300,
        month: currentMonth,
        date: `${currentMonth}-05`,
        status: 'recebido',
      }),
      mkTx({
        id: 'src-gcp',
        type: 'recorrencia',
        description: 'GCP',
        amount: 150,
        month: currentMonth,
        date: `${currentMonth}-05`,
        status: 'recebido',
      }),
      // Duplicate already in the next month (same desc+amount) — skipped.
      mkTx({
        id: 'dup-aws',
        type: 'recorrencia',
        description: 'AWS',
        amount: 300,
        month: nextMonth,
        date: `${nextMonth}-05`,
        status: 'previsto',
      }),
    ];

    const replicated: Transaction = mkTx({
      id: 'new-gcp',
      description: 'GCP',
      amount: 150,
      type: 'recorrencia',
      month: nextMonth,
      date: `${nextMonth}-05`,
      status: 'previsto',
    });

    const client = createMockSupabaseClient({
      transactions: txs,
      bulkInsertResult: [replicated],
    });
    const { result, cleanupWarn } = renderFinance(client);

    await waitFor(() => expect(result.current.transactions).toHaveLength(3));

    let count = 0;
    await act(async () => {
      count = await result.current.replicateRecurringToNextMonth();
    });

    expect(count).toBe(1);

    // Assert: the insert call received exactly ONE row (GCP), not two.
    // Find the transactions builder that was used for insert.
    // The mock's from() returns a fresh builder per call; we inspect the last one.
    const lastBuilder = client._txBuilder;
    const insertCall = lastBuilder.insert.mock.calls.at(-1);
    expect(insertCall).toBeDefined();
    const payload = insertCall![0] as Array<{ description: string }>;
    expect(payload).toHaveLength(1);
    expect(payload[0].description).toBe('GCP');

    cleanupWarn();
  });
});
