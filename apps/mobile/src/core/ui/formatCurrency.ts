const mxnFormatter = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
});

/** Formatea un monto en pesos (MXN, es-MX). Acepta los numeric que llegan como string. */
export function formatCurrency(amount: number | string): string {
  return mxnFormatter.format(Number(amount));
}
