// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddTransactionForm } from './AddTransactionForm';

// sonner's toast.error is fired on validation — stub it to keep tests quiet
// and let us assert (optionally) that it was called.
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}));

describe('AddTransactionForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders every required field (description, amount, type radios, status radios, category, date)', () => {
    render(<AddTransactionForm onAdd={vi.fn()} />);

    expect(screen.getByLabelText(/descrição/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/valor \(R\$\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/categoria/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/data da operação/i)).toBeInTheDocument();

    // Tipo de fluxo radios
    expect(screen.getByRole('radio', { name: /projeto/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /recorrência/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /despesa/i })).toBeInTheDocument();

    // Status radios (default type=projeto => "Recebido" label)
    expect(screen.getByRole('radio', { name: /recebido/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /pendente/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /previsto/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /cancelado/i })).toBeInTheDocument();
  });

  it('applies the BRL currency mask as the user types digits', async () => {
    const user = userEvent.setup();
    render(<AddTransactionForm onAdd={vi.fn()} />);

    const amountInput = screen.getByLabelText(/valor \(R\$\)/i) as HTMLInputElement;
    await user.type(amountInput, '150050');

    expect(amountInput.value).toBe('1.500,50');
  });

  it('submits the parsed numeric amount (1500.5) for valid input', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(<AddTransactionForm onAdd={onAdd} />);

    await user.type(screen.getByLabelText(/descrição/i), 'Projeto X');
    await user.type(screen.getByLabelText(/valor \(R\$\)/i), '150050');

    await user.click(screen.getByRole('button', { name: /registrar entrada/i }));

    expect(onAdd).toHaveBeenCalledTimes(1);
    const payload = onAdd.mock.calls[0][0];
    expect(payload.description).toBe('Projeto X');
    // Form itself passes the positive parsed amount; the hook handles sign.
    expect(payload.amount).toBe(1500.5);
    expect(payload.type).toBe('projeto');
    expect(payload.status).toBe('recebido');
    expect(payload.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('shows inline validation error and does not call onAdd when description is empty', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(<AddTransactionForm onAdd={onAdd} />);

    await user.type(screen.getByLabelText(/valor \(R\$\)/i), '150050');
    await user.click(screen.getByRole('button', { name: /registrar entrada/i }));

    expect(onAdd).not.toHaveBeenCalled();
    // Both an inline field error AND a form-level live region display the message.
    const matches = await screen.findAllByText(/informe a descrição/i);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('shows inline validation error and does not call onAdd when amount is empty', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(<AddTransactionForm onAdd={onAdd} />);

    await user.type(screen.getByLabelText(/descrição/i), 'Sem valor');
    await user.click(screen.getByRole('button', { name: /registrar entrada/i }));

    expect(onAdd).not.toHaveBeenCalled();
    const matches = await screen.findAllByText(/valor inválido/i);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('submits a POSITIVE amount when type=despesa (sign conversion is the hook\'s job)', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(<AddTransactionForm onAdd={onAdd} />);

    await user.type(screen.getByLabelText(/descrição/i), 'AWS');
    await user.type(screen.getByLabelText(/valor \(R\$\)/i), '10000');
    await user.click(screen.getByRole('radio', { name: /despesa/i }));

    await user.click(screen.getByRole('button', { name: /registrar saída/i }));

    expect(onAdd).toHaveBeenCalledTimes(1);
    const payload = onAdd.mock.calls[0][0];
    expect(payload.type).toBe('despesa');
    expect(payload.amount).toBe(100); // positive — hook negates
  });

  it('resets description/amount/category after a successful submit (no initialData)', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn().mockResolvedValue(true);
    render(<AddTransactionForm onAdd={onAdd} />);

    const description = screen.getByLabelText(/descrição/i) as HTMLInputElement;
    const amount = screen.getByLabelText(/valor \(R\$\)/i) as HTMLInputElement;
    const category = screen.getByLabelText(/categoria/i) as HTMLInputElement;

    await user.type(description, 'Projeto Reset');
    await user.type(amount, '50000');
    await user.type(category, 'Cliente Alpha');

    await user.click(screen.getByRole('button', { name: /registrar entrada/i }));

    // Wait until the button is no longer disabled (submission finished)
    // We check fields rather than use waitFor+assertion: the onAdd promise
    // has already resolved by the time userEvent.click returns (user-event
    // awaits promise microtasks), so state should be flushed.
    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(description.value).toBe('');
    expect(amount.value).toBe('');
    expect(category.value).toBe('');
  });
});
