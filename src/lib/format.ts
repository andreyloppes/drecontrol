const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

export function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

/**
 * Formata uma data ISO (YYYY-MM-DD) no padrão dd/MM pt-BR.
 * Usa T12:00:00 para evitar deslocamento de fuso horário.
 */
export function formatDate(date: string): string {
  return new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  });
}
