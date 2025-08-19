import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
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
  activeChat: Chat | null;
  
  // Actions
  createChat: () => Chat;
  addMessage: (chatId: string, message: Omit<ChatMessage, 'id' | 'createdAt'>) => void;
  setActiveChat: (chatId: string) => void;
  deleteChat: (chatId: string) => void;
  updateChatTitle: (chatId: string, title: string) => void;
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      chats: [],
      activeChat: null,

      createChat: () => {
        const newChat: Chat = {
          id: uuidv4(),
          title: 'New Chat',
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        set((state) => ({
          chats: [newChat, ...state.chats],
          activeChat: newChat,
        }));
        
        return newChat;
      },

      addMessage: (chatId, message) => {
        const newMessage: ChatMessage = {
          id: uuidv4(),
          ...message,
          createdAt: new Date(),
        };

        set((state) => {
          const updatedChats = state.chats.map((chat) =>
            chat.id === chatId
              ? {
                  ...chat,
                  messages: [...chat.messages, newMessage],
                  updatedAt: new Date(),
                  // Use first user message as title if no title set
                  title: chat.messages.length === 0 && message.role === 'user'
                    ? message.content.slice(0, 30) + (message.content.length > 30 ? '...' : '')
                    : chat.title
                }
              : chat
          );

          // Update activeChat if it's the current chat
          const updatedActiveChat = state.activeChat?.id === chatId
            ? updatedChats.find(chat => chat.id === chatId) || null
            : state.activeChat;

          return {
            chats: updatedChats,
            activeChat: updatedActiveChat,
          };
        });
      },

      setActiveChat: (chatId) => {
        const chat = get().chats.find(c => c.id === chatId);
        if (chat) {
          set({ activeChat: chat });
        }
      },

      deleteChat: (chatId) => {
        set((state) => ({
          chats: state.chats.filter(chat => chat.id !== chatId),
          activeChat: state.activeChat?.id === chatId ? null : state.activeChat,
        }));
      },

      updateChatTitle: (chatId, title) => {
        set((state) => ({
          chats: state.chats.map(chat =>
            chat.id === chatId ? { ...chat, title, updatedAt: new Date() } : chat
          ),
          activeChat: state.activeChat?.id === chatId 
            ? { ...state.activeChat, title, updatedAt: new Date() }
            : state.activeChat,
        }));
      },
    }),
    {
      name: 'chat-store',
      // Only persist chats data, not activeChat
      partialize: (state) => ({ chats: state.chats }),
    }
  )
);