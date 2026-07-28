import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from '@ui-kitten/components';
import type { ChatMessage } from '../state/useChatStore';

type MessageBubbleProps = {
  message: ChatMessage;
};

// Componente de presentación pura (sin lógica de negocio), vive en ui/ según
// ADR-020. user se alinea a la derecha con el color primario del tema;
// assistant a la izquierda con la superficie "card" del tema -- ambos
// colores vienen de theme[...] (no hardcodeados), igual que
// MenuItemCard.tsx, para que el modo oscuro se aplique solo.
export const MessageBubble = ({ message }: MessageBubbleProps) => {
  const theme = useTheme();
  const isUser = message.role === 'user';

  return (
    <View
      testID="chat-message-bubble"
      style={[styles.row, isUser ? styles.rowUser : styles.rowAssistant]}
    >
      <View
        style={[
          styles.bubble,
          isUser
            ? { backgroundColor: theme['color-primary-500'] }
            : { backgroundColor: theme['background-basic-color-1'] },
        ]}
      >
        <Text category="p2" style={isUser ? styles.textUser : undefined}>
          {message.text}
        </Text>
      </View>
    </View>
  );
};

export default MessageBubble;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 4,
  },
  rowUser: {
    justifyContent: 'flex-end',
  },
  rowAssistant: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  textUser: {
    color: '#FFFFFF',
  },
});
