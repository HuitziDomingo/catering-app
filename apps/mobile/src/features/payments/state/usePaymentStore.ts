import { create } from 'zustand';
import { extractErrorMessage } from '../../../core/http/extractErrorMessage';
import { createPaymentPreference } from '../data-access/paymentsDataAccess';
import { openCheckout, type PaymentReturn } from '../util/checkout';

export type PaymentStatus = 'idle' | 'creating' | 'inCheckout' | 'error';

export type PaymentState = {
  status: PaymentStatus;
  error: string | null;
  /** orderId del pago en curso (para mostrar el spinner en ese pedido). */
  orderId: string | null;
  /**
   * POST /payments/preferences → abre Checkout Pro. Devuelve el regreso
   * parseado (null si el cliente cerró el navegador, o en web, donde la
   * página se va). Nunca lanza: el error queda en el estado.
   */
  pay: (orderId: string) => Promise<PaymentReturn | null>;
  reset: () => void;
};

export const usePaymentStore = create<PaymentState>((set) => ({
  status: 'idle',
  error: null,
  orderId: null,
  async pay(orderId) {
    set({ status: 'creating', error: null, orderId });
    try {
      const checkoutUrl = await createPaymentPreference(orderId);
      set({ status: 'inCheckout' });
      const result = await openCheckout(checkoutUrl);
      set({ status: 'idle', orderId: null });
      return result;
    } catch (err) {
      set({ status: 'error', error: extractErrorMessage(err) });
      return null;
    }
  },
  reset() {
    set({ status: 'idle', error: null, orderId: null });
  },
}));
