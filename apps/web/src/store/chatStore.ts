import { create } from "zustand";
import type { Message } from "@supportvision/types";

interface ChatStore {
  messages: Message[];
  isOpen: boolean;
  unreadCount: number;

  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  toggleChat: () => void;
  openChat: () => void;
  resetUnread: () => void;
  reset: () => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  messages: [],
  isOpen: false,
  unreadCount: 0,

  setMessages: (messages) => set({ messages }),
  addMessage: (message) =>
    set((s) => ({
      messages: [...s.messages, message],
      unreadCount: s.isOpen ? 0 : s.unreadCount + 1,
    })),
  toggleChat: () =>
    set((s) => ({ isOpen: !s.isOpen, unreadCount: s.isOpen ? s.unreadCount : 0 })),
  openChat: () => set({ isOpen: true, unreadCount: 0 }),
  resetUnread: () => set({ unreadCount: 0 }),
  reset: () => set({ messages: [], isOpen: false, unreadCount: 0 }),
}));
