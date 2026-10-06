import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Text, useTheme } from '@ui-kitten/components';
import type { OrderDetail } from '@catering-app/shared-types';
import { DishImage } from '../../../core/ui/DishImage';
import { formatCurrency } from '../../../core/ui/formatCurrency';
import { formatPaymentMethod } from '../util/orderStatus';
import { OrderStatusBadge } from './OrderStatusBadge';

type OrderDetailViewProps = { order: OrderDetail };

const dateTimeFormatter = new Intl.DateTimeFormat('es-MX', {
  dateStyle: 'full',
  timeStyle: 'short',
});

// Detalle de un pedido propio (ADR-020, ui/ pura). Los precios por línea son
// el snapshot del momento del pedido (ADR-006), no el precio vigente.
export const OrderDetailView = ({ order }: OrderDetailViewProps) => {
  const theme = useTheme();
  const section = [styles.section, { backgroundColor: theme['background-basic-color-1'] }];
  const paymentMethod = formatPaymentMethod(order.paymentMethod);

  return (
    <View style={styles.container} testID="order-detail">
      <View style={section}>
        <OrderStatusBadge status={order.status} />
        <Text category="s1" style={styles.spaced}>
          {dateTimeFormatter.format(new Date(order.scheduledFor))}
        </Text>
        <Text category="p2">{`Para ${order.peopleCount} personas`}</Text>
      </View>

      {order.needsReview ? (
        <Card status="warning" disabled testID="order-detail-review">
          <Text category="p2">
            La cantidad de personas está fuera del rango de los platillos: el negocio revisará tu
            pedido y te contactará.
          </Text>
        </Card>
      ) : null}

      <View style={section}>
        {order.items.map((item) => (
          <View key={item.id} style={[styles.line, styles.itemLine]}>
            <DishImage
              uri={item.menuItemImageUrl}
              style={styles.thumbnail}
              iconSize={20}
              accessibilityLabel={item.menuItemName}
              testID={`order-detail-line-${item.id}-image`}
            />
            <Text category="p2" style={styles.lineName}>
              {`${item.quantity} × ${item.menuItemName}`}
            </Text>
            <Text category="p2">{formatCurrency(item.subtotal)}</Text>
          </View>
        ))}
        <View style={[styles.line, styles.totalLine]}>
          <Text category="s1">Total</Text>
          <Text category="s1" testID="order-detail-total">
            {formatCurrency(order.total)}
          </Text>
        </View>
      </View>

      {order.notes ? (
        <View style={section}>
          <Text appearance="hint" category="c1">
            Notas
          </Text>
          <Text category="p2">{order.notes}</Text>
        </View>
      ) : null}

      {order.paidAt || paymentMethod ? (
        <View style={section} testID="order-detail-payment">
          <Text appearance="hint" category="c1">
            Pago
          </Text>
          {paymentMethod ? <Text category="p2">{paymentMethod}</Text> : null}
          {order.paidAt ? (
            <Text category="p2">{`Pagado el ${dateTimeFormatter.format(new Date(order.paidAt))}`}</Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
};

export default OrderDetailView;

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  section: {
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  spaced: {
    marginTop: 8,
  },
  line: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  itemLine: {
    alignItems: 'center',
  },
  thumbnail: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  lineName: {
    flex: 1,
  },
  totalLine: {
    marginTop: 8,
  },
});
