/** Body de POST /payments/preferences (ver ADR-024). */
export interface CreatePaymentPreferenceDto {
  orderId: string;
}

/** Respuesta de POST /payments/preferences: URL de Checkout Pro (init_point). */
export interface PaymentPreferenceResponse {
  checkoutUrl: string;
}

/**
 * Resultado con el que Mercado Pago regresa al cliente (back_urls, ver el
 * addendum 01 de ADR-024). Es solo la ruta de regreso: el status real del
 * pedido siempre se vuelve a consultar a la API (lo fija el webhook).
 */
export type PaymentReturnResult = 'success' | 'failure' | 'pending';

export const PAYMENT_RETURN_RESULTS: PaymentReturnResult[] = ['success', 'failure', 'pending'];
