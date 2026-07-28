import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Icon, Input, useTheme } from '@ui-kitten/components';

type ChatComposerProps = {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  disabled?: boolean;
};

// Componente de presentación pura (sin lógica de negocio), vive en ui/ según
// ADR-020. El texto (controlado) y el envío viven en ChatScreen.tsx.
export const ChatComposer = ({ value, onChangeText, onSend, disabled }: ChatComposerProps) => {
  const theme = useTheme();
  const canSend = value.trim().length > 0 && !disabled;

  return (
    <View style={[styles.container, { backgroundColor: theme['background-basic-color-1'] }]}>
      <Input
        testID="chat-input"
        style={styles.input}
        placeholder="Escribe un mensaje..."
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={canSend ? onSend : undefined}
        returnKeyType="send"
      />
      <Button
        testID="chat-send-button"
        accessoryLeft={(evaProps) => <Icon {...evaProps} name="paper-plane-outline" />}
        disabled={!canSend}
        onPress={onSend}
      />
    </View>
  );
};

export default ChatComposer;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
  },
  input: {
    flex: 1,
  },
});
