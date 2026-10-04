import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { usePaymentStore } from '../state/usePaymentStore';
import { paymentReturnHref } from '../util/checkout';

/**
 * Pagar un pedido desde cualquier pantalla (detalle, confirmación del
 * checkout): crea la preferencia, abre Checkout Pro y, al volver, navega a
 * la pantalla de regreso.
 *
 * router.navigate (no push): en Android el mismo deep link también llega a
 * Expo Router por el intent filter; navigate reutiliza la ruta si ya está
 * en el stack en vez de apilar una segunda pantalla de regreso.
 */
export function usePayOrder() {
  const router = useRouter();
  const pay = usePaymentStore((state) => state.pay);
  const status = usePaymentStore((state) => state.status);
  const error = usePaymentStore((state) => state.error);
  const payingOrderId = usePaymentStore((state) => state.orderId);

  const payOrder = useCallback(
    async (orderId: string) => {
      const result = await pay(orderId);
      if (result) {
        router.navigate(paymentReturnHref({ ...result, orderId: result.orderId ?? orderId }));
      }
    },
    [pay, router]
  );

  return {
    payOrder,
    busy: status === 'creating' || status === 'inCheckout',
    error: status === 'error' ? error : null,
    payingOrderId,
  };
}
