import { ReactNode, createContext, useContext } from 'react';
import { vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Transaction } from '@/types/finance';

/**
 * Test harness for components/hooks that depend on SupabaseContext + FinanceContext.
 *
 * We intentionally do NOT import the real SupabaseContext module — the real one
 * throws at import time if env vars are missing. Instead, we expose a local
 * context with the same shape ({ client }) and re-implement a matching
 * `useSupabase` hook via `vi.mock` at the test boundary.
 *
 * Usage in a test file:
 *
 *   vi.mock('@/context/SupabaseContext', async () => {
 *     const harness = await import('@/test-utils/finance-test-harness');
 *     return { useSupabase: harness.useMockSupabase, SupabaseProvider: harness.MockSupabaseProvider };
 *   });
 */

export interface QueryResult<T = unknown> {
  data: T;
  error: { message: string } | null;
}

/**
 * Builds a chainable Supabase "query" mock. Every method on the builder is a
 * `vi.fn()` that returns the builder itself, EXCEPT the terminal awaitable ones.
 *
 * The terminal behavior is controlled by the caller via `terminalResult` and
 * `singleResult`: `await builder` resolves to `terminalResult`, and
 * `.single()` resolves to `singleResult`.
 */
export function createQueryBuilder<T = unknown>(opts: {
  terminalResult?: QueryResult<T>;
  singleResult?: QueryResult<unknown>;
} = {}) {
  const terminalResult: QueryResult<T> = opts.terminalResult ?? ({ data: [] as unknown as T, error: null });
  const singleResult: QueryResult<unknown> = opts.singleResult ?? { data: null, error: null };

  const builder: Record<string, ReturnType<typeof vi.fn>> & { then?: (...args: unknown[]) => unknown } = {};
  const chain = () => builder;

  builder.select = vi.fn(chain);
  builder.insert = vi.fn(chain);
  builder.update = vi.fn(chain);
  builder.delete = vi.fn(chain);
  builder.upsert = vi.fn(chain);
  builder.eq = vi.fn(chain);
  builder.order = vi.fn(chain);
  builder.single = vi.fn(() => Promise.resolve(singleResult));

  // Make the builder awaitable: `await client.from(...).select(...).order(...)`
  // will resolve to terminalResult.
  builder.then = (onFulfilled?: (v: QueryResult<T>) => unknown, onRejected?: (e: unknown) => unknown) => {
    return Promise.resolve(terminalResult).then(onFulfilled, onRejected);
  };

  return builder;
}

export interface MockSupabaseOptions {
  /**
   * Rows to return when `client.from('transactions').select('*').order(...)` is awaited.
   */
  transactions?: Transaction[];
  /**
   * Rows to return for opening_balances select (or null to simulate missing table).
   */
  openingBalances?: Array<{ month: string; value: number }> | null;
  /**
   * Row returned for `.insert(...).select().single()` on transactions.
   * If null, no data returned (simulates error-free but empty insert).
   */
  insertResult?: Transaction | null;
  /**
   * Rows returned for bulk `.insert(...).select()` (used by replicate/bulkImport).
   */
  bulkInsertResult?: Transaction[];
  /**
   * If set, simulates the fetch-transactions error path.
   */
  fetchError?: string;
  /**
   * If set, simulates the insert error path.
   */
  insertError?: string;
}

export interface MockSupabaseClient {
  from: ReturnType<typeof vi.fn>;
  /** Last-returned query builder for the `transactions` table (for assertions). */
  _txBuilder: ReturnType<typeof createQueryBuilder>;
  /** Last-returned query builder for `opening_balances`. */
  _obBuilder: ReturnType<typeof createQueryBuilder>;
}

export function createMockSupabaseClient(options: MockSupabaseOptions = {}): MockSupabaseClient {
  const {
    transactions = [],
    openingBalances = [],
    insertResult = null,
    bulkInsertResult = [],
    fetchError,
    insertError,
  } = options;

  // Cache the last-returned builder per table so tests can introspect calls.
  let lastTxBuilder = createQueryBuilder<Transaction[]>({
    terminalResult: fetchError
      ? { data: [] as unknown as Transaction[], error: { message: fetchError } }
      : { data: transactions, error: null },
    singleResult: insertError
      ? { data: null, error: { message: insertError } }
      : { data: insertResult, error: null },
  });
  // When bulk insert chain is used (`.insert(...).select()` without `.single()`),
  // the builder.then resolves to bulkInsertResult as data.
  // Since the same builder is returned per .from() call, we overload terminalResult
  // on-demand by re-creating it. To keep it simple, we expose a second builder for
  // the bulk path via a fresh call to from('transactions') after the first.

  let lastObBuilder = createQueryBuilder<Array<{ month: string; value: number }>>({
    terminalResult:
      openingBalances === null
        ? { data: [] as Array<{ month: string; value: number }>, error: { message: 'relation does not exist' } }
        : { data: openingBalances, error: null },
  });

  // Track whether the first `from('transactions')` call has happened. The
  // initial mount effect does a `.select('*').order(...)` fetch that should
  // resolve with `transactions`. Subsequent bulk inserts use bulkInsertResult.
  let txCallCount = 0;

  const from = vi.fn((table: string) => {
    if (table === 'transactions') {
      txCallCount += 1;
      // First call = the initial fetch (select *). Later calls = inserts/updates/deletes.
      // For bulk insert flows (`.insert(...).select()` awaited), resolve to bulkInsertResult.
      const useBulk = txCallCount > 1 && bulkInsertResult.length > 0;
      lastTxBuilder = createQueryBuilder<Transaction[]>({
        terminalResult: fetchError
          ? { data: [] as unknown as Transaction[], error: { message: fetchError } }
          : { data: useBulk ? bulkInsertResult : transactions, error: null },
        singleResult: insertError
          ? { data: null, error: { message: insertError } }
          : { data: insertResult, error: null },
      });
      return lastTxBuilder;
    }
    if (table === 'opening_balances') {
      lastObBuilder = createQueryBuilder<Array<{ month: string; value: number }>>({
        terminalResult:
          openingBalances === null
            ? { data: [] as Array<{ month: string; value: number }>, error: { message: 'relation does not exist' } }
            : { data: openingBalances, error: null },
      });
      return lastObBuilder;
    }
    return createQueryBuilder();
  });

  const client: MockSupabaseClient = {
    from,
    get _txBuilder() {
      return lastTxBuilder;
    },
    get _obBuilder() {
      return lastObBuilder;
    },
  };
  return client;
}

// ============================================================================
// Mock context + provider (shape-compatible with real SupabaseContext)
// ============================================================================

type SupabaseCtx = { client: SupabaseClient };
const MockSupabaseCtx = createContext<SupabaseCtx | undefined>(undefined);

export function MockSupabaseProvider({
  children,
  client,
}: {
  children: ReactNode;
  client: MockSupabaseClient;
}) {
  // Cast through unknown — the mock only implements the surface the app actually uses.
  return (
    <MockSupabaseCtx.Provider value={{ client: client as unknown as SupabaseClient }}>
      {children}
    </MockSupabaseCtx.Provider>
  );
}

export function useMockSupabase(): SupabaseCtx {
  const ctx = useContext(MockSupabaseCtx);
  if (!ctx) {
    throw new Error('useMockSupabase must be used within MockSupabaseProvider');
  }
  return ctx;
}

/**
 * Minimal wrapper factory to use with `renderHook` / `render` when the SUT
 * depends only on SupabaseContext (e.g. `useFinance`).
 */
export function withMockSupabase(client: MockSupabaseClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <MockSupabaseProvider client={client}>{children}</MockSupabaseProvider>;
  };
}
