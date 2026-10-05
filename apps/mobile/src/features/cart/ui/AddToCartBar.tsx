import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text, useTheme } from '@ui-kitten/components';
import { formatCurrency } from '../../../core/ui/formatCurrency';
import { QuantityStepper } from './QuantityStepper';

type AddToCartBarProps = {
  unitPrice: number;
  servesMin: number;
  servesMax: number;
  /** Unidades de este platillo que ya hay en el carrito. */
  quantityInCart: number;
  onAdd: (quantity: number) => void;
  onViewCart: () => void;
};

// Barra fija al pie del detalle del platillo (ADR-020, ui/ pura): elige
// cuántas órdenes agregar. La cantidad de personas del evento se pide en el
// checkout, no acá -- cada orden sirve el rango del platillo, que se muestra
// como referencia para elegir cuántas.
export const AddToCartBar = ({
  unitPrice,
  servesMin,
  servesMax,
  quantityInCart,
  onAdd,
  onViewCart,
}: AddToCartBarProps) => {
  const theme = useTheme();
  const [quantity, setQuantity] = useState(1);
  const servesText =
    servesMin === servesMax
      ? `Cada orden sirve ${servesMin} personas`
      : `Cada orden sirve de ${servesMin} a ${servesMax} personas`;

  return (
    <View
      testID="add-to-cart-bar"
      style={[
        styles.bar,
        {
          backgroundColor: theme['background-basic-color-1'],
          borderTopColor: theme['border-basic-color-3'],
        },
      ]}
    >
      <Text appearance="hint" category="c1">
        {servesText}
      </Text>
      <View style={styles.row}>
        <QuantityStepper value={quantity} onChange={setQuantity} testID="add-to-cart-quantity" />
        <Button testID="add-to-cart-button" style={styles.addButton} onPress={() => onAdd(quantity)}>
          {`Agregar · ${formatCurrency(unitPrice * quantity)}`}
        </Button>
      </View>
      {quantityInCart > 0 ? (
        <Button
          testID="view-cart-button"
          appearance="ghost"
          size="small"
          onPress={onViewCart}
        >
          {`En tu carrito: ${quantityInCart} · Ver carrito`}
        </Button>
      ) : null}
    </View>
  );
};

export default AddToCartBar;

const styles = StyleSheet.create({
  bar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  addButton: {
    flex: 1,
  },
});
