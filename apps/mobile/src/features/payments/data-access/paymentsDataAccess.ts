import type { PaymentPreferenceResponse } from '@catering-app/shared-types';
import { apiClient } from '../../../core/http/apiClient';

// Capa data-access del feature de pagos (ADR-020, ADR-024). Solo el dueño
// del pedido puede crear su preferencia; la API valida la propiedad con el
// JWT. Si el pedido estaba en payment_failed, la API lo regresa a pending
// (reintento, ADR-027).
export async function createPaymentPreference(orderId: string): Promise<string> {
  const { data } = await apiClient.post<PaymentPreferenceResponse>('/payments/preferences', {
    orderId,
  });
  return data.checkoutUrl;
}
