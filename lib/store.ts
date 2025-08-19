import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Model, models } from "./models";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
}

export interface Chat {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

interface ChatStore {
  chats: Chat[];
  model: Model;

  // Actions
  createChat: (chatId: string) => Chat;
  addMessage: (chatId: string, message: ChatMessage) => void;
  deleteChat: (chatId: string) => void;
  updateChatTitle: (chatId: string, title: string) => void;
  setModel: (model: Model) => void;
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set) => ({
      chats: [],
      model:
        models.find((m) => m.id === "openai/gpt-4.1-mini-2025-04-14") ||
        models[0],

      createChat: (chatId: string) => {
        const newChat: Chat = {
          id: chatId,
          title: "New Chat",
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        set((state) => ({
          chats: [newChat, ...state.chats],
        }));

        return newChat;
      },

      addMessage: (chatId: string, message: ChatMessage) => {
        set((state) => {
          const updatedChats = state.chats.map((chat) =>
            chat.id === chatId
              ? {
                  ...chat,
                  messages: [...chat.messages, message],
                  updatedAt: new Date(),
                  // Use first user message as title if no title set
                  title:
                    chat.messages.length === 0 && message.role === "user"
                      ? message.content.slice(0, 30) +
                        (message.content.length > 30 ? "..." : "")
                      : chat.title,
                }
              : chat
          );

          return {
            chats: updatedChats,
          };
        });
      },

      deleteChat: (chatId) => {
        set((state) => ({
          chats: state.chats.filter((chat) => chat.id !== chatId),
        }));
      },

      updateChatTitle: (chatId, title) => {
        set((state) => ({
          chats: state.chats.map((chat) =>
            chat.id === chatId
              ? { ...chat, title, updatedAt: new Date() }
              : chat
          ),
        }));
      },

      setModel: (model) => {
        set({ model });
      },
    }),
    {
      name: "chat-store",
      partialize: (state) => ({
        chats: state.chats,
        model: state.model,
      }),
    }
  )
);
