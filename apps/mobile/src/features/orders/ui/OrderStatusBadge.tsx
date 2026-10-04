import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from '@ui-kitten/components';
import type { OrderStatus } from '@catering-app/shared-types';
import { ORDER_STATUS_APPEARANCE, ORDER_STATUS_LABELS } from '../util/orderStatus';

type OrderStatusBadgeProps = { status: OrderStatus };

// Etiqueta de status con el color del tema (ADR-020, ui/ pura).
export const OrderStatusBadge = ({ status }: OrderStatusBadgeProps) => {
  const theme = useTheme();
  const appearance = ORDER_STATUS_APPEARANCE[status] ?? 'basic';
  return (
    <View
      testID={`order-status-${status}`}
      style={[styles.badge, { backgroundColor: theme[`color-${appearance}-transparent-200`] }]}
    >
      <Text category="c2" status={appearance === 'basic' ? undefined : appearance}>
        {ORDER_STATUS_LABELS[status] ?? status}
      </Text>
    </View>
  );
};

export default OrderStatusBadge;

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
});
