import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Spinner, Text, useTheme } from '@ui-kitten/components';
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { isOrderPaid, OrderStatus } from '@catering-app/shared-types';
import { usePayOrder } from '../../payments/feature/usePayOrder';
import { useOrdersStore } from '../state/useOrdersStore';
import { isPayable } from '../util/orderStatus';
import { OrderDetailView } from '../ui/OrderDetailView';
import { useOrderReceipt } from './useOrderReceipt';

// Detalle de un pedido propio (ADR-020): GET /orders/:id al tomar foco
// (así refleja el status que dejó el webhook tras pagar) + botón Pagar si el
// pedido está pending o payment_failed (reintento), o Ver recibo si ya está
// pagado (ADR-028).
export const OrderDetailScreen = () => {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const order = useOrdersStore((state) => state.byId[orderId]);
  const detailStatus = useOrdersStore((state) => state.detailStatus);
  const detailError = useOrdersStore((state) => state.detailError);
  const loadOrder = useOrdersStore((state) => state.loadOrder);
  const { payOrder, busy, error: payError } = usePayOrder();
  const receipt = useOrderReceipt();
  const theme = useTheme();

  useFocusEffect(
    useCallback(() => {
      loadOrder(orderId);
    }, [loadOrder, orderId])
  );

  const background = { backgroundColor: theme['background-basic-color-2'] };

  if (!order) {
    return (
      <View style={[styles.centered, background]}>
        <Stack.Screen options={{ title: 'Pedido' }} />
        {detailStatus === 'error' ? (
          <>
            <Text status="danger" style={styles.message} testID="order-detail-error">
              {detailError ?? 'No se pudo cargar el pedido.'}
            </Text>
            <Button appearance="outline" status="danger" onPress={() => loadOrder(orderId)}>
              Reintentar
            </Button>
          </>
        ) : (
          <Spinner size="large" />
        )}
      </View>
    );
  }

  return (
    <ScrollView style={background} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: 'Pedido' }} />
      <OrderDetailView order={order} />

      {isPayable(order.status) ? (
        <View style={styles.pay}>
          {order.status === OrderStatus.PAYMENT_FAILED ? (
            <Text appearance="hint" category="p2">
              El último intento de pago fue rechazado. Puedes intentarlo de nuevo.
            </Text>
          ) : null}
          <Button
            testID="order-pay"
            disabled={busy}
            accessoryLeft={busy ? () => <Spinner size="tiny" status="control" /> : undefined}
            onPress={() => payOrder(order.id)}
          >
            {order.status === OrderStatus.PAYMENT_FAILED ? 'Reintentar pago' : 'Pagar'}
          </Button>
          {payError ? (
            <Text status="danger" category="p2" testID="order-pay-error">
              {payError}
            </Text>
          ) : null}
        </View>
      ) : null}

      {isOrderPaid(order) ? (
        <View style={styles.pay}>
          <Button
            testID="order-receipt"
            appearance="outline"
            disabled={receipt.busy}
            accessoryLeft={receipt.busy ? () => <Spinner size="tiny" /> : undefined}
            onPress={() => receipt.openReceipt(order.id)}
          >
            Ver recibo
          </Button>
          {receipt.error ? (
            <Text status="danger" category="p2" testID="order-receipt-error">
              {receipt.error}
            </Text>
          ) : null}
        </View>
      ) : null}
    </ScrollView>
  );
};

export default OrderDetailScreen;

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  message: { marginBottom: 16, textAlign: 'center' },
  pay: { gap: 8 },
});
