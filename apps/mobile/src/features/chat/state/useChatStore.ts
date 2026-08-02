import { create } from 'zustand';

export type ChatRole = 'user' | 'assistant';

export type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  timestamp: string;
};

/**
 * Pedido interpretado por extractOrderIntent, pendiente de confirmación del
 * usuario (ver ADR-023) -- el tool MCP crear_pedido nunca se invoca desde el
 * primer mensaje, solo cuando el usuario confirma este draft.
 */
export type PendingOrderDraft = {
  menuItemId: string;
  menuItemName: string;
  peopleCount: number;
  /** ISO 8601 */
  scheduledFor: string;
};

export type ChatState = {
  messages: ChatMessage[];
  isLoading: boolean;
  pendingOrderDraft: PendingOrderDraft | null;
  addMessage: (message: { role: ChatRole; text: string }) => ChatMessage;
  setLoading: (isLoading: boolean) => void;
  setPendingOrderDraft: (draft: PendingOrderDraft | null) => void;
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
  pendingOrderDraft: null,
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
  setPendingOrderDraft(draft) {
    set({ pendingOrderDraft: draft });
  },
  reset() {
    set({ messages: [], isLoading: false, pendingOrderDraft: null });
  },
}));
