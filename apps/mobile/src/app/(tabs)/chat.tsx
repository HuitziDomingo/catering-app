import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, useTheme } from '@ui-kitten/components';

// Placeholder del tab Chat (Expo Router, ADR-017): el chat real vía MCP
// llega en una tarea posterior. Sin lógica que separar en features/ todavía
// -- por eso vive directo en la ruta (ver ADR-020).
export const ChatRoute = () => {
  const theme = useTheme();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme['background-basic-color-2'] }]}
    >
      <Text appearance="hint" category="s1" testID="chat-placeholder">
        Próximamente
      </Text>
    </SafeAreaView>
  );
};

export default ChatRoute;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
