import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text, useTheme } from '@ui-kitten/components';
import type { PendingOrderDraft } from '../state/useChatStore';

type ConfirmOrderCardProps = {
  draft: PendingOrderDraft;
  onConfirm: () => void;
  onCancel: () => void;
  disabled?: boolean;
};

const dateFormatter = new Intl.DateTimeFormat('es-MX', { dateStyle: 'long' });

// Componente de presentación pura (sin lógica de negocio), vive en ui/ según
// ADR-020. Se muestra entre la lista de mensajes y el composer cuando hay un
// pedido interpretado pendiente de confirmación (ver ADR-023): el tool MCP
// crear_pedido nunca se invoca directo del primer mensaje.
export const ConfirmOrderCard = ({
  draft,
  onConfirm,
  onCancel,
  disabled,
}: ConfirmOrderCardProps) => {
  const theme = useTheme();
  const formattedDate = dateFormatter.format(new Date(draft.scheduledFor));

  return (
    <View
      testID="confirm-order-card"
      style={[styles.card, { backgroundColor: theme['background-basic-color-1'] }]}
    >
      <Text category="p2">
        Confirmar pedido: {draft.menuItemName} para {draft.peopleCount} personas, entrega el{' '}
        {formattedDate} -- ¿confirmas?
      </Text>
      <View style={styles.actions}>
        <Button
          testID="confirm-order-cancel-button"
          appearance="ghost"
          status="basic"
          size="small"
          disabled={disabled}
          onPress={onCancel}
        >
          Cancelar
        </Button>
        <Button
          testID="confirm-order-confirm-button"
          size="small"
          disabled={disabled}
          onPress={onConfirm}
        >
          Confirmar
        </Button>
      </View>
    </View>
  );
};

export default ConfirmOrderCard;

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
});
