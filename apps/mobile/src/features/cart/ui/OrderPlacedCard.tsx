import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Text } from '@ui-kitten/components';
import type { OrderDetail } from '@catering-app/shared-types';
import { formatCurrency } from '../../../core/ui/formatCurrency';

type OrderPlacedCardProps = {
  order: OrderDetail;
};

const dateFormatter = new Intl.DateTimeFormat('es-MX', {
  dateStyle: 'full',
  timeStyle: 'short',
});

// Confirmación tras crear el pedido (ADR-020, ui/ pura). Muestra el total
// que calculó la API (snapshot de precios, ADR-006), no el estimado del
// carrito.
export const OrderPlacedCard = ({ order }: OrderPlacedCardProps) => (
  <Card testID="order-placed" status="success" disabled>
    <Text category="h6" style={styles.title}>
      ¡Pedido recibido!
    </Text>
    <View style={styles.rows}>
      {order.items.map((item) => (
        <Text key={item.id} category="p2">
          {`${item.quantity} × ${item.menuItemName}`}
        </Text>
      ))}
      <Text category="p2">{`Para ${order.peopleCount} personas`}</Text>
      <Text category="p2">{dateFormatter.format(new Date(order.scheduledFor))}</Text>
      <Text category="s1" testID="order-placed-total">
        {`Total: ${formatCurrency(order.total)}`}
      </Text>
    </View>
    {order.needsReview ? (
      <Text status="warning" category="p2" style={styles.note} testID="order-placed-review">
        La cantidad de personas está fuera del rango de los platillos: el negocio revisará tu
        pedido y te contactará.
      </Text>
    ) : null}
    <Text appearance="hint" category="p2" style={styles.note}>
      Tu pedido queda pendiente de pago: puedes pagarlo ahora o después desde Mis pedidos.
    </Text>
  </Card>
);

export default OrderPlacedCard;

const styles = StyleSheet.create({
  title: {
    marginBottom: 8,
  },
  rows: {
    gap: 4,
  },
  note: {
    marginTop: 12,
  },
});
