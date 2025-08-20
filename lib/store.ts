import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Model, models, ModelProvider } from "./models";
import CryptoJS from "crypto-js";

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

export interface ApiKeys {
  openai?: string;
  anthropic?: string;
  google?: string;
  openrouter?: string;
  grok?: string;
}

export interface ApiBaseUrls {
  openai?: string;
  anthropic?: string;
  google?: string;
  openrouter?: string;
  grok?: string;
}

// Encryption key for API keys (in production, this should be more secure)
const ENCRYPTION_KEY = "ai-chatbot-secret-key-2024";

// Helper functions for API key encryption
const encryptApiKey = (key: string): string => {
  return CryptoJS.AES.encrypt(key, ENCRYPTION_KEY).toString();
};

const decryptApiKey = (encryptedKey: string): string => {
  const bytes = CryptoJS.AES.decrypt(encryptedKey, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
};

interface ChatStore {
  chats: Chat[];
  model: Model;
  apiKeys: ApiKeys;
  apiBaseUrls: ApiBaseUrls;

  // Actions
  createChat: (chatId: string) => Chat;
  addMessage: (chatId: string, message: ChatMessage) => void;
  deleteChat: (chatId: string) => void;
  updateChatTitle: (chatId: string, title: string) => void;
  setModel: (model: Model) => void;
  
  // API Key management
  setApiKey: (provider: ModelProvider, apiKey: string) => void;
  getApiKey: (provider: ModelProvider) => string | undefined;
  clearApiKey: (provider: ModelProvider) => void;
  clearAllApiKeys: () => void;
  hasApiKey: (provider: ModelProvider) => boolean;
  
  // API Base URL management
  setApiBaseUrl: (provider: ModelProvider, baseUrl: string) => void;
  getApiBaseUrl: (provider: ModelProvider) => string | undefined;
  clearApiBaseUrl: (provider: ModelProvider) => void;
  clearAllApiBaseUrls: () => void;
  hasApiBaseUrl: (provider: ModelProvider) => boolean;
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      chats: [],
      model:
        models.find((m) => m.id === "openai/gpt-4.1-mini-2025-04-14") ||
        models[0],
      apiKeys: {},
      apiBaseUrls: {},

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

      // API Key management functions
      setApiKey: (provider: ModelProvider, apiKey: string) => {
        set((state) => {
          const newApiKeys = { ...state.apiKeys };
          
          if (!apiKey.trim()) {
            // 如果为空，则删除该provider的密钥
            delete newApiKeys[provider];
          } else {
            // 如果有内容，则加密保存
            newApiKeys[provider] = encryptApiKey(apiKey.trim());
          }
          
          return { apiKeys: newApiKeys };
        });
      },

      getApiKey: (provider: ModelProvider) => {
        const state = get();
        const encryptedKey = state.apiKeys[provider];
        if (!encryptedKey) return undefined;
        
        try {
          return decryptApiKey(encryptedKey);
        } catch (error) {
          console.error("Failed to decrypt API key:", error);
          return undefined;
        }
      },

      clearApiKey: (provider: ModelProvider) => {
        set((state) => {
          const newApiKeys = { ...state.apiKeys };
          delete newApiKeys[provider];
          return { apiKeys: newApiKeys };
        });
      },

      clearAllApiKeys: () => {
        set({ apiKeys: {} });
      },

      hasApiKey: (provider: ModelProvider) => {
        const state = get();
        return !!state.apiKeys[provider];
      },
      
      // API Base URL management functions
      setApiBaseUrl: (provider: ModelProvider, baseUrl: string) => {
        set((state) => {
          const newApiBaseUrls = { ...state.apiBaseUrls };
          
          if (!baseUrl.trim()) {
            // 如果为空，则删除该provider的base URL
            delete newApiBaseUrls[provider];
          } else {
            // 如果有内容，则加密保存
            newApiBaseUrls[provider] = encryptApiKey(baseUrl.trim());
          }
          
          return { apiBaseUrls: newApiBaseUrls };
        });
      },

      getApiBaseUrl: (provider: ModelProvider) => {
        const state = get();
        const encryptedBaseUrl = state.apiBaseUrls[provider];
        if (!encryptedBaseUrl) return undefined;
        
        try {
          return decryptApiKey(encryptedBaseUrl);
        } catch (error) {
          console.error("Failed to decrypt API base URL:", error);
          return undefined;
        }
      },

      clearApiBaseUrl: (provider: ModelProvider) => {
        set((state) => {
          const newApiBaseUrls = { ...state.apiBaseUrls };
          delete newApiBaseUrls[provider];
          return { apiBaseUrls: newApiBaseUrls };
        });
      },

      clearAllApiBaseUrls: () => {
        set({ apiBaseUrls: {} });
      },

      hasApiBaseUrl: (provider: ModelProvider) => {
        const state = get();
        return !!state.apiBaseUrls[provider];
      },
    }),
    {
      name: "chat-store",
      partialize: (state) => ({
        chats: state.chats,
        model: state.model,
        apiKeys: state.apiKeys,
        apiBaseUrls: state.apiBaseUrls,
      }),
    }
  )
);
