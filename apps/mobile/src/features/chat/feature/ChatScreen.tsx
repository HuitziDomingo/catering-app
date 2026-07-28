import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, useTheme } from '@ui-kitten/components';
import { useSessionStore } from '../../session/state/useSessionStore';
import { useChatStore } from '../state/useChatStore';
import { consultarPedidosPorCliente } from '../data-access/mcpClient';
import { formatOrdersReply } from '../util/formatOrdersReply';
import { looksOrderRelated } from '../util/looksOrderRelated';
import { ChatMessageList } from '../ui/ChatMessageList';
import { ChatComposer } from '../ui/ChatComposer';

const FALLBACK_REPLY =
  'Puedo ayudarte a consultar tus pedidos, prueba preguntando algo como ' +
  '"¿cuáles son mis pedidos?"';

// Pantalla del feature de chat (ver ADR-020, ADR-002). v1 funcional y
// pattern-based (sin LLM real todavía): detecta si el mensaje suena a una
// pregunta sobre pedidos (looksOrderRelated) y, si es así, invoca el tool
// MCP real consultar_pedidos_por_cliente; si no, responde con un mensaje de
// ayuda fijo. La integración con un LLM real queda para una tarea futura.
export const ChatScreen = () => {
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated);
  const accessToken = useSessionStore((state) => state.accessToken);
  const messages = useChatStore((state) => state.messages);
  const isLoading = useChatStore((state) => state.isLoading);
  const addMessage = useChatStore((state) => state.addMessage);
  const setLoading = useChatStore((state) => state.setLoading);
  const theme = useTheme();
  const [draft, setDraft] = useState('');

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || !accessToken) {
      return;
    }
    addMessage({ role: 'user', text });
    setDraft('');

    if (!looksOrderRelated(text)) {
      addMessage({ role: 'assistant', text: FALLBACK_REPLY });
      return;
    }

    setLoading(true);
    try {
      const result = await consultarPedidosPorCliente(accessToken);
      addMessage({ role: 'assistant', text: formatOrdersReply(result) });
    } catch (err) {
      addMessage({
        role: 'assistant',
        text:
          'No pude consultar tus pedidos en este momento. ' +
          (err instanceof Error ? err.message : 'Intenta de nuevo más tarde.'),
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView
        style={[styles.centered, { backgroundColor: theme['background-basic-color-2'] }]}
      >
        <Text appearance="hint" testID="chat-signed-out-message">
          Inicia sesión para usar el chat
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme['background-basic-color-2'] }]}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ChatMessageList messages={messages} isLoading={isLoading} />
        <ChatComposer
          value={draft}
          onChangeText={setDraft}
          onSend={handleSend}
          disabled={isLoading}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ChatScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
});
