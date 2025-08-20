import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Model, ModelProvider } from "./models";
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
  model: Model | null;
  apiKeys: ApiKeys;
  apiBaseUrls: ApiBaseUrls;
  allAvailableModels: Model[];  // 所有获取的模型
  availableModels: Model[];     // 仅启用的模型（计算属性）
  enabledModelIds: Set<string>; // 启用的模型ID集合
  isLoadingModels: boolean;
  modelErrors: Record<string, string>;

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

  // Dynamic model management
  fetchModels: () => Promise<void>;
  refreshModels: () => Promise<void>;
  
  // Model enable/disable management
  enableModel: (modelId: string) => void;
  disableModel: (modelId: string) => void;
  toggleModel: (modelId: string) => void;
  isModelEnabled: (modelId: string) => boolean;
  getAvailableModels: () => Model[];  // 返回启用的模型
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      chats: [],
      model: null,
      apiKeys: {},
      apiBaseUrls: {},
      allAvailableModels: [],
      availableModels: [],
      enabledModelIds: new Set<string>(),
      isLoadingModels: false,
      modelErrors: {},

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
        
        // 当API密钥更新后，重新获取模型
        get().fetchModels();
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

      // Dynamic model management
      fetchModels: async () => {
        const state = get();
        
        // 收集所有已配置的API密钥
        const apiKeys: Record<string, string> = {};
        Object.entries(state.apiKeys).forEach(([provider, encryptedKey]) => {
          try {
            const decryptedKey = decryptApiKey(encryptedKey);
            if (decryptedKey) {
              apiKeys[provider] = decryptedKey;
            }
          } catch (error) {
            console.error(`Failed to decrypt API key for ${provider}:`, error);
          }
        });

        // 如果没有配置任何API密钥，清空模型列表
        if (Object.keys(apiKeys).length === 0) {
          set({
            availableModels: [],
            model: null,
            isLoadingModels: false,
            modelErrors: {},
          });
          return;
        }

        set({ isLoadingModels: true, modelErrors: {} });

        try {
          const response = await fetch("/api/models", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ apiKeys }),
          });

          if (!response.ok) {
            throw new Error(`Failed to fetch models: ${response.status}`);
          }

          const data = await response.json();
          
          set((state) => {
            const allModels = data.models || [];
            
            // 如果没有启用过任何模型，默认启用所有获取的模型
            let newEnabledModelIds = new Set(state.enabledModelIds);
            if (state.enabledModelIds.size === 0 && allModels.length > 0) {
              newEnabledModelIds = new Set(allModels.map((m: Model) => m.id));
            }
            
            // 过滤出启用的模型
            const enabledModels = allModels.filter((m: Model) => newEnabledModelIds.has(m.id));
            
            const newState: Partial<ChatStore> = {
              allAvailableModels: allModels,
              availableModels: enabledModels,
              enabledModelIds: newEnabledModelIds,
              isLoadingModels: false,
              modelErrors: data.errors || {},
            };

            // 如果没有选中的模型，或当前模型不在启用的列表中，自动选择第一个启用的模型
            if (!state.model || !enabledModels.find((m: Model) => m.id === state.model?.id)) {
              if (enabledModels.length > 0) {
                newState.model = enabledModels[0];
              } else {
                newState.model = null;
              }
            }

            return newState;
          });
        } catch (error) {
          console.error("Error fetching models:", error);
          set({
            allAvailableModels: [],
            availableModels: [],
            isLoadingModels: false,
            modelErrors: { general: "Failed to fetch models" },
          });
        }
      },

      refreshModels: async () => {
        await get().fetchModels();
      },

      // Model enable/disable management
      enableModel: (modelId: string) => {
        set((state) => {
          const newEnabledModelIds = new Set(state.enabledModelIds);
          newEnabledModelIds.add(modelId);
          
          const enabledModels = state.allAvailableModels.filter(m => newEnabledModelIds.has(m.id));
          
          return {
            enabledModelIds: newEnabledModelIds,
            availableModels: enabledModels,
          };
        });
      },

      disableModel: (modelId: string) => {
        set((state) => {
          const newEnabledModelIds = new Set(state.enabledModelIds);
          newEnabledModelIds.delete(modelId);
          
          const enabledModels = state.allAvailableModels.filter(m => newEnabledModelIds.has(m.id));
          
          // 如果禁用的是当前选中的模型，自动切换到第一个启用的模型
          let newModel = state.model;
          if (state.model?.id === modelId) {
            newModel = enabledModels.length > 0 ? enabledModels[0] : null;
          }
          
          return {
            enabledModelIds: newEnabledModelIds,
            availableModels: enabledModels,
            model: newModel,
          };
        });
      },

      toggleModel: (modelId: string) => {
        const state = get();
        if (state.enabledModelIds.has(modelId)) {
          state.disableModel(modelId);
        } else {
          state.enableModel(modelId);
        }
      },

      isModelEnabled: (modelId: string) => {
        return get().enabledModelIds.has(modelId);
      },

      getAvailableModels: () => {
        return get().availableModels;
      },
    }),
    {
      name: "chat-store",
      partialize: (state) => ({
        chats: state.chats,
        model: state.model,
        apiKeys: state.apiKeys,
        apiBaseUrls: state.apiBaseUrls,
        allAvailableModels: state.allAvailableModels,
        enabledModelIds: Array.from(state.enabledModelIds), // 序列化Set为数组
      }),
      
      // 自定义反序列化逻辑，将数组转换回Set
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.log('An error happened during hydration', error);
        } else if (state) {
          // 将数组转换回Set
          if (Array.isArray((state as any).enabledModelIds)) {
            state.enabledModelIds = new Set((state as any).enabledModelIds);
          }
          // 重新计算可用模型列表
          const enabledModels = state.allAvailableModels.filter(m => state.enabledModelIds.has(m.id));
          state.availableModels = enabledModels;
        }
      },
    }
  )
);
