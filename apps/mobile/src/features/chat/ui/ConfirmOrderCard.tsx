import React from 'react';
import { View } from 'react-native';
import { Button, Text, useTheme } from '@ui-kitten/components';
import { BlurView } from 'expo-blur';
import { hexToRgba } from '../../../core/ui/hexToRgba';
import { useResolvedColorScheme } from '../../theme/state/useThemeStore';
import type { PendingOrderDraft } from '../state/useChatStore';
import { styles } from './ConfirmOrderCard.styles';

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
//
// Acento de vidrio (ADR-025): BlurView reemplaza el fondo sólido por una
// tarjeta esmerilada translúcida, con un borde sutil (theme
// border-basic-color-3) para definir el borde del vidrio. Igual que TabBar,
// se suma una capa con el color real de Eva (background-basic-color-1 vía
// hexToRgba) encima del blur nativo -- el tint light/dark de BlurView por sí
// solo es un material fijo de iOS, no toma los colores del tema. El tint
// respeta claro/oscuro vía useResolvedColorScheme.
export const ConfirmOrderCard = ({
  draft,
  onConfirm,
  onCancel,
  disabled,
}: ConfirmOrderCardProps) => {
  const theme = useTheme();
  const resolved = useResolvedColorScheme();
  const formattedDate = dateFormatter.format(new Date(draft.scheduledFor));

  return (
    <BlurView
      testID="confirm-order-card"
      tint={resolved === 'dark' ? 'dark' : 'light'}
      intensity={35}
      style={[styles.card, { borderColor: theme['border-basic-color-3'] }]}
    >
      <View
        pointerEvents="none"
        style={[
          styles.tint,
          { backgroundColor: hexToRgba(theme['background-basic-color-1'], 0.6) },
        ]}
      />
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
    </BlurView>
  );
};

export default ConfirmOrderCard;
