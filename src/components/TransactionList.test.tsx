// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Transaction } from '@/types/finance';

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

// TransactionList reads `bulkUpdateStatus` and `bulkDelete` from
// FinanceContext. Stub the context so we don't need to stand up the full
// Supabase + useFinance chain just to render a list.
vi.mock('@/context/FinanceContext', () => ({
  useFinanceContext: () => ({
    bulkUpdateStatus: vi.fn(),
    bulkDelete: vi.fn(),
  }),
}));

// Must import AFTER vi.mock declarations (vi.mock is hoisted, but this is
// still the conventional order for clarity).
import { TransactionList } from './TransactionList';

function mkTx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'tx-1',
    description: 'Projeto Alpha',
    amount: 1500.5,
    type: 'projeto',
    category: 'Vendas',
    status: 'recebido',
    date: '2025-06-10',
    month: '2025-06',
    ...overrides,
  };
}

describe('TransactionList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders each transaction with its description and formatted BRL amount', () => {
    const transactions: Transaction[] = [
      mkTx({ id: '1', description: 'Projeto Alpha', amount: 1500.5 }),
      mkTx({ id: '2', description: 'AWS', amount: -200, type: 'despesa' }),
    ];

    render(
      <TransactionList
        transactions={transactions}
        onDelete={vi.fn()}
        onUpdateStatus={vi.fn()}
        onEdit={vi.fn()}
      />,
    );

    expect(screen.getByText('Projeto Alpha')).toBeInTheDocument();
    expect(screen.getByText('AWS')).toBeInTheDocument();

    // pt-BR currency formatter uses NBSP between "R$" and the number.
    // Match loosely on the numeric part to stay robust.
    expect(screen.getByText(/1\.500,50/)).toBeInTheDocument();
    expect(screen.getByText(/-.*200,00/)).toBeInTheDocument();
  });

  it('calls onDelete with the correct id after user confirms the AlertDialog', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(
      <TransactionList
        transactions={[mkTx({ id: 'to-delete', description: 'Delete me' })]}
        onDelete={onDelete}
        onUpdateStatus={vi.fn()}
        onEdit={vi.fn()}
      />,
    );

    // Open the confirmation dialog.
    await user.click(screen.getByRole('button', { name: /excluir transação delete me/i }));
    // Confirm deletion.
    await user.click(screen.getByRole('button', { name: /^excluir$/i }));

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith('to-delete');
  });

  it('calls onUpdateStatus with "recebido" when the quick-check button is clicked on a pendente row', async () => {
    const user = userEvent.setup();
    const onUpdateStatus = vi.fn();
    render(
      <TransactionList
        transactions={[mkTx({ id: 'p1', description: 'Pendente X', status: 'pendente' })]}
        onDelete={vi.fn()}
        onUpdateStatus={onUpdateStatus}
        onEdit={vi.fn()}
      />,
    );

    await user.click(
      screen.getByRole('button', { name: /marcar pendente x como recebido ou pago/i }),
    );

    expect(onUpdateStatus).toHaveBeenCalledTimes(1);
    expect(onUpdateStatus).toHaveBeenCalledWith('p1', 'recebido');
  });

  it('lets the user change status via the status dropdown and calls onUpdateStatus', async () => {
    const user = userEvent.setup();
    const onUpdateStatus = vi.fn();
    render(
      <TransactionList
        transactions={[mkTx({ id: 't1', description: 'Row', status: 'recebido' })]}
        onDelete={vi.fn()}
        onUpdateStatus={onUpdateStatus}
        onEdit={vi.fn()}
      />,
    );

    // Open the dropdown by clicking the current-status badge.
    await user.click(screen.getByRole('button', { name: /status atual: recebido/i }));
    // Pick a different status from the menu.
    const menu = await screen.findByRole('menu');
    await user.click(within(menu).getByRole('menuitem', { name: /cancelado/i }));

    expect(onUpdateStatus).toHaveBeenCalledTimes(1);
    expect(onUpdateStatus).toHaveBeenCalledWith('t1', 'cancelado');
  });
});
