import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Card, Text } from '@ui-kitten/components';

type ServesRangeWarningProps = {
  peopleCount: number;
  rangesText: string;
  submitting: boolean;
  onConfirmAnyway: () => void;
  onAdjust: () => void;
};

// Aviso antes de confirmar cuando ningún platillo cubre la cantidad de
// personas (ADR-021). No bloquea: la API crea el pedido marcado para
// revisión del negocio (needsReview, ADR-023), y así se le explica al
// cliente en vez de rechazarle el pedido.
export const ServesRangeWarning = ({
  peopleCount,
  rangesText,
  submitting,
  onConfirmAnyway,
  onAdjust,
}: ServesRangeWarningProps) => (
  <Card testID="serves-range-warning" status="warning" disabled>
    <Text category="s1" style={styles.title}>
      {`Ningún platillo de tu pedido está pensado para ${peopleCount} personas`}
    </Text>
    <Text category="p2" style={styles.ranges}>
      {rangesText}
    </Text>
    <Text appearance="hint" category="p2">
      Puedes confirmarlo así y el negocio lo revisará contigo antes de prepararlo, o ajustar
      la cantidad de personas.
    </Text>
    <View style={styles.actions}>
      <Button testID="serves-range-adjust" appearance="outline" status="basic" onPress={onAdjust}>
        Ajustar
      </Button>
      <Button
        testID="serves-range-confirm"
        status="warning"
        disabled={submitting}
        onPress={onConfirmAnyway}
      >
        Confirmar de todos modos
      </Button>
    </View>
  </Card>
);

export default ServesRangeWarning;

const styles = StyleSheet.create({
  title: {
    marginBottom: 8,
  },
  ranges: {
    marginBottom: 8,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
  },
});
