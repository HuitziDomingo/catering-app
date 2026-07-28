import React, { useRef } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { Spinner, Text } from '@ui-kitten/components';
import type { ChatMessage } from '../state/useChatStore';
import { MessageBubble } from './MessageBubble';

type ChatMessageListProps = {
  messages: ChatMessage[];
  isLoading: boolean;
};

// Componente de presentación pura (sin lógica de negocio), vive en ui/ según
// ADR-020. onContentSizeChange hace scroll al final en cada mensaje nuevo
// (o cuando aparece/desaparece el spinner de "pensando") sin necesitar que
// el padre maneje un ref.
export const ChatMessageList = ({ messages, isLoading }: ChatMessageListProps) => {
  const listRef = useRef<FlatList<ChatMessage>>(null);

  return (
    <FlatList
      ref={listRef}
      testID="chat-message-list"
      data={messages}
      keyExtractor={(message) => message.id}
      renderItem={({ item }) => <MessageBubble message={item} />}
      contentContainerStyle={styles.content}
      onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
      ListEmptyComponent={
        <Text appearance="hint" style={styles.empty}>
          Pregúntame algo como &quot;¿cuáles son mis pedidos?&quot;
        </Text>
      }
      ListFooterComponent={
        isLoading ? <Spinner testID="chat-loading" size="small" style={styles.spinner} /> : null
      }
    />
  );
};

export default ChatMessageList;

const styles = StyleSheet.create({
  content: {
    paddingVertical: 12,
    flexGrow: 1,
  },
  empty: {
    textAlign: 'center',
    marginTop: 32,
    paddingHorizontal: 24,
  },
  spinner: {
    marginTop: 8,
    alignSelf: 'center',
  },
});
