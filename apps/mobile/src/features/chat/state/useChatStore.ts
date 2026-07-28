import { create } from 'zustand';

export type ChatRole = 'user' | 'assistant';

export type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  timestamp: string;
};

export type ChatState = {
  messages: ChatMessage[];
  isLoading: boolean;
  addMessage: (message: { role: ChatRole; text: string }) => ChatMessage;
  setLoading: (isLoading: boolean) => void;
  reset: () => void;
};

let messageCounter = 0;

function createMessageId(): string {
  messageCounter += 1;
  return `msg-${Date.now()}-${messageCounter}`;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isLoading: false,
  addMessage({ role, text }) {
    const message: ChatMessage = {
      id: createMessageId(),
      role,
      text,
      timestamp: new Date().toISOString(),
    };
    set((state) => ({ messages: [...state.messages, message] }));
    return message;
  },
  setLoading(isLoading) {
    set({ isLoading });
  },
  reset() {
    set({ messages: [], isLoading: false });
  },
}));
