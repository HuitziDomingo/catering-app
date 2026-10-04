import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Text, useTheme } from '@ui-kitten/components';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  OrderStatus,
  PAYMENT_RETURN_RESULTS,
  type PaymentReturnResult,
} from '@catering-app/shared-types';
import { useOrdersStore } from '../../orders/state/useOrdersStore';
import { isPayable } from '../../orders/util/orderStatus';
import { PaymentResultCard } from '../ui/PaymentResultCard';
import { usePayOrder } from './usePayOrder';

/** Reintentos de GET /orders/:id mientras el webhook todavía no movió el status. */
export const POLL_ATTEMPTS = 6;
export const POLL_INTERVAL_MS = 2500;

// Pantalla de regreso de Checkout Pro (addendum 01 de ADR-024), ruta
// /payment/<success|failure|pending>?orderId=… a la que llega el deep link.
// El resultado de la URL es solo navegación: el status real se vuelve a
// consultar a la API, y si sigue "pending" se reintenta unas veces porque el
// webhook puede llegar segundos después del regreso del cliente.
export const PaymentResultScreen = () => {
  const params = useLocalSearchParams<{ result: string; orderId?: string }>();
  const result: PaymentReturnResult = PAYMENT_RETURN_RESULTS.includes(
    params.result as PaymentReturnResult
  )
    ? (params.result as PaymentReturnResult)
    : 'pending';
  const orderId = params.orderId ?? null;
  const order = useOrdersStore((state) => (orderId ? state.byId[orderId] : undefined));
  const loadOrder = useOrdersStore((state) => state.loadOrder);
  const { payOrder, busy, error: payError } = usePayOrder();
  const [waiting, setWaiting] = useState(Boolean(orderId) && result !== 'failure');
  const theme = useTheme();
  const router = useRouter();

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async (attempt: number) => {
      const latest = await loadOrder(orderId);
      if (cancelled) return;
      const stillPending = !latest || latest.status === OrderStatus.PENDING;
      if (stillPending && result !== 'failure' && attempt < POLL_ATTEMPTS) {
        timer = setTimeout(() => poll(attempt + 1), POLL_INTERVAL_MS);
      } else {
        setWaiting(false);
      }
    };
    poll(1);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [orderId, result, loadOrder]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme['background-basic-color-2'] }]}>
      <View style={styles.content}>
        <PaymentResultCard
          result={result}
          orderStatus={(order?.status as OrderStatus) ?? null}
          waiting={waiting}
        />

        {orderId && order && isPayable(order.status) && result !== 'pending' && !waiting ? (
          <Button
            testID="payment-retry"
            disabled={busy}
            onPress={() => payOrder(orderId)}
          >
            Intentar de nuevo
          </Button>
        ) : null}
        {payError ? (
          <Text status="danger" category="p2">
            {payError}
          </Text>
        ) : null}

        {orderId ? (
          <Button
            testID="payment-view-order"
            appearance="outline"
            onPress={() => router.replace(`/pedidos/${orderId}`)}
          >
            Ver mi pedido
          </Button>
        ) : (
          <Button appearance="outline" onPress={() => router.replace('/pedidos')}>
            Ir a mis pedidos
          </Button>
        )}
      </View>
    </SafeAreaView>
  );
};

export default PaymentResultScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 16, flex: 1, justifyContent: 'center' },
});
