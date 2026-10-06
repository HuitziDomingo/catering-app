import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Icon, Text, useTheme } from '@ui-kitten/components';
import { DishImage } from '../../../core/ui/DishImage';
import { formatCurrency } from '../../../core/ui/formatCurrency';
import type { CartLine } from '../state/useCartStore';
import { QuantityStepper } from './QuantityStepper';

type CartLineItemProps = {
  line: CartLine;
  /** Ya resuelta contra el menú vigente (ver resolveCartLineImage). */
  imageUrl: string | null;
  onChangeQuantity: (quantity: number) => void;
  onRemove: () => void;
};

// Línea del carrito (ADR-020, ui/ pura). Bajar de 1 con el stepper está
// deshabilitado: para quitar el platillo está el botón de basura explícito.
export const CartLineItem = ({
  line,
  imageUrl,
  onChangeQuantity,
  onRemove,
}: CartLineItemProps) => {
  const theme = useTheme();
  const testID = `cart-line-${line.menuItemId}`;

  return (
    <View
      testID={testID}
      style={[
        styles.card,
        { backgroundColor: theme['background-basic-color-1'] },
      ]}
    >
      <View style={styles.header}>
        <DishImage
          uri={imageUrl}
          style={styles.thumbnail}
          iconSize={24}
          accessibilityLabel={line.name}
          testID={`${testID}-image`}
        />
        <View style={styles.info}>
          <Text category="s1">{line.name}</Text>
          <Text appearance="hint" category="c1">
            {`${formatCurrency(line.unitPrice)} c/u · sirve ${line.servesMin}–${line.servesMax} personas`}
          </Text>
        </View>
        <Button
          testID={`${testID}-remove`}
          appearance="ghost"
          status="danger"
          size="small"
          accessibilityLabel={`Quitar ${line.name}`}
          onPress={onRemove}
          accessoryLeft={(props) => <Icon {...props} name="trash-2-outline" />}
        />
      </View>
      <View style={styles.footer}>
        <QuantityStepper
          value={line.quantity}
          onChange={onChangeQuantity}
          testID={`${testID}-quantity`}
        />
        <Text category="s1" testID={`${testID}-subtotal`}>
          {formatCurrency(line.unitPrice * line.quantity)}
        </Text>
      </View>
    </View>
  );
};

export default CartLineItem;

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: 8,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
