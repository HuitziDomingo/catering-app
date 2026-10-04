import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Icon, Text } from '@ui-kitten/components';

type QuantityStepperProps = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  testID?: string;
};

// Componente de presentación pura (ADR-020): − valor +. Quien lo usa decide
// qué significa llegar al mínimo (en el carrito, bajar de 1 quita la línea).
export const QuantityStepper = ({
  value,
  onChange,
  min = 1,
  max = 99,
  testID = 'quantity-stepper',
}: QuantityStepperProps) => (
  <View style={styles.row} testID={testID}>
    <Button
      testID={`${testID}-decrement`}
      size="small"
      appearance="outline"
      accessibilityLabel="Quitar uno"
      disabled={value <= min}
      onPress={() => onChange(value - 1)}
      accessoryLeft={(props) => <Icon {...props} name="minus-outline" />}
    />
    <Text category="h6" style={styles.value} testID={`${testID}-value`}>
      {value}
    </Text>
    <Button
      testID={`${testID}-increment`}
      size="small"
      appearance="outline"
      accessibilityLabel="Agregar uno"
      disabled={value >= max}
      onPress={() => onChange(value + 1)}
      accessoryLeft={(props) => <Icon {...props} name="plus-outline" />}
    />
  </View>
);

export default QuantityStepper;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  value: {
    minWidth: 28,
    textAlign: 'center',
  },
});
