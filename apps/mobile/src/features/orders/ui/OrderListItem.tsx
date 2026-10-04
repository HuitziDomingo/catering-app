import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, useTheme } from '@ui-kitten/components';
import type { OrderDetail } from '@catering-app/shared-types';
import { formatCurrency } from '../../../core/ui/formatCurrency';
import { OrderStatusBadge } from './OrderStatusBadge';

type OrderListItemProps = {
  order: OrderDetail;
  onPress: (order: OrderDetail) => void;
};

const eventDateFormatter = new Intl.DateTimeFormat('es-MX', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

/** "2 × Chilaquiles, 1 × Tamales" (corta a 2 platillos + "y N más"). */
export function summarizeItems(order: OrderDetail): string {
  const names = order.items.map((item) => `${item.quantity} × ${item.menuItemName}`);
  return names.length > 2
    ? `${names.slice(0, 2).join(', ')} y ${names.length - 2} más`
    : names.join(', ');
}

// Fila de "Mis pedidos" (ADR-020, ui/ pura): status, fecha del evento,
// platillos y total.
export const OrderListItem = ({ order, onPress }: OrderListItemProps) => {
  const theme = useTheme();
  return (
    <Pressable
      testID={`order-item-${order.id}`}
      onPress={() => onPress(order)}
      style={[styles.card, { backgroundColor: theme['background-basic-color-1'] }]}
    >
      <View style={styles.header}>
        <OrderStatusBadge status={order.status} />
        <Text category="s1">{formatCurrency(order.total)}</Text>
      </View>
      <Text category="p2">{eventDateFormatter.format(new Date(order.scheduledFor))}</Text>
      <Text appearance="hint" category="c1" numberOfLines={2}>
        {`${summarizeItems(order)} · ${order.peopleCount} personas`}
      </Text>
    </Pressable>
  );
};

export default OrderListItem;

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
});
