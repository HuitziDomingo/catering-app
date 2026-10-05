// Formato de montos y fechas para la UI de pedidos (helpers puros, ADR-020).
const currencyFormatter = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
});

const dateTimeFormatter = new Intl.DateTimeFormat('es-MX', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export function formatPrice(amount: number): string {
  return currencyFormatter.format(amount);
}

export function formatDateTime(iso: string): string {
  return dateTimeFormatter.format(new Date(iso));
}
