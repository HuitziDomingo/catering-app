import { useChatStore } from './useChatStore';

beforeEach(() => {
  useChatStore.setState({ messages: [], isLoading: false });
});

test('addMessage appends a message with role, text, id and timestamp', () => {
  const message = useChatStore.getState().addMessage({ role: 'user', text: 'Hola' });

  expect(useChatStore.getState().messages).toEqual([message]);
  expect(message.role).toBe('user');
  expect(message.text).toBe('Hola');
  expect(message.id).toBeTruthy();
  expect(message.timestamp).toBeTruthy();
});

test('addMessage appends multiple messages in order with unique ids', () => {
  useChatStore.getState().addMessage({ role: 'user', text: 'primero' });
  useChatStore.getState().addMessage({ role: 'assistant', text: 'segundo' });

  const { messages } = useChatStore.getState();
  expect(messages).toHaveLength(2);
  expect(messages[0].text).toBe('primero');
  expect(messages[1].text).toBe('segundo');
  expect(messages[0].id).not.toBe(messages[1].id);
});

test('setLoading toggles the loading flag', () => {
  useChatStore.getState().setLoading(true);
  expect(useChatStore.getState().isLoading).toBe(true);

  useChatStore.getState().setLoading(false);
  expect(useChatStore.getState().isLoading).toBe(false);
});

test('reset clears messages and loading state', () => {
  useChatStore.getState().addMessage({ role: 'user', text: 'hola' });
  useChatStore.getState().setLoading(true);

  useChatStore.getState().reset();

  expect(useChatStore.getState().messages).toEqual([]);
  expect(useChatStore.getState().isLoading).toBe(false);
});
