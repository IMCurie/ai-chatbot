import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Model, ModelProvider } from "./models";
import CryptoJS from "crypto-js";

// Deduplicate concurrent model fetches
let modelsFetchInFlight: Promise<void> | null = null;

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

export interface SearchExtensionConfig {
  queryModelProvider: string;
  queryModelId: string;
  queryLanguage: string;
  excludeWebsites: string;
  maxResults: number;
}

export interface ExtensionSettings {
  tavilyApiKey?: string;
  searchConfig?: SearchExtensionConfig;
}

export interface McpToolSetting {
  name: string;
  description?: string;
  enabled: boolean;
  lastSyncedAt?: string;
}

export interface McpHeaderEntry {
  id: string;
  key: string;
  value: string; // Encrypted value
}

export interface McpServerConfig {
  id: string;
  name: string;
  url: string;
  headers: McpHeaderEntry[];
  tools: McpToolSetting[];
}

export interface McpSettings {
  enabled: boolean;
  servers: McpServerConfig[];
}

export interface McpRuntimeServerConfig {
  id: string;
  name: string;
  url: string;
  headers: Array<{ id: string; key: string; value: string }>;
  enabledTools: string[];
}

export interface McpRuntimeConfig {
  enabled: boolean;
  servers: McpRuntimeServerConfig[];
}

const DEFAULT_SEARCH_CONFIG: SearchExtensionConfig = {
  queryModelProvider: "google",
  queryModelId: "gemini-2.5-flash",
  queryLanguage: "en-US",
  excludeWebsites: "",
  maxResults: 5,
};

const clampSearchResults = (value: number) => {
  if (!Number.isFinite(value)) {
    return DEFAULT_SEARCH_CONFIG.maxResults;
  }
  return Math.max(1, Math.min(50, Math.round(value)));
};

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

const generateId = () => {
  if (typeof globalThis !== "undefined" && globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `mcp-${Math.random().toString(36).slice(2, 11)}`;
};

const encryptHeaders = (
  headers: Array<{ id?: string; key: string; value: string }>,
  previous?: McpHeaderEntry[]
): McpHeaderEntry[] => {
  const previousMap = new Map<string, McpHeaderEntry>();
  previous?.forEach((entry) => {
    previousMap.set(entry.id, entry);
  });

  const result: McpHeaderEntry[] = [];

  headers.forEach(({ id, key, value }) => {
    const headerKey = typeof key === "string" ? key.trim() : "";
    const headerValue = typeof value === "string" ? value.trim() : "";

    const headerId = id && previousMap.has(id) ? id : generateId();

    try {
      result.push({
        id: headerId,
        key: headerKey,
        value: encryptApiKey(headerValue),
      });
    } catch (error) {
      console.error("Failed to encrypt MCP header", error);
    }
  });

  return result;
};

const decryptHeaders = (headers: McpHeaderEntry[]) => {
  const result: Array<{ id: string; key: string; value: string }> = [];

  headers.forEach((entry) => {
    try {
      const value = decryptApiKey(entry.value);
      result.push({
        id: entry.id,
        key: typeof entry.key === "string" ? entry.key : "",
        value,
      });
    } catch (error) {
      console.error(`Failed to decrypt MCP header ${entry.key}:`, error);
    }
  });

  return result;
};

const mergeToolSettings = (
  incoming: Array<Partial<McpToolSetting> & { name: string }>,
  existing: McpToolSetting[]
) => {
  const existingMap = new Map<string, McpToolSetting>();
  existing.forEach((tool) => {
    existingMap.set(tool.name, tool);
  });

  return incoming.map<McpToolSetting>((tool) => {
    const previous = existingMap.get(tool.name);
    const enabled =
      typeof tool.enabled === "boolean"
        ? tool.enabled
        : previous?.enabled ?? true;

    const description =
      tool.description !== undefined
        ? tool.description
        : previous?.description;

    const lastSyncedAt =
      tool.lastSyncedAt ?? previous?.lastSyncedAt ?? new Date().toISOString();

    return {
      name: tool.name,
      description,
      enabled,
      lastSyncedAt,
    };
  });
};

interface ChatStore {
  chats: Chat[];
  model: Model | null;
  apiKeys: ApiKeys;
  apiBaseUrls: ApiBaseUrls;
  extensionSettings: ExtensionSettings;
  mcpSettings: McpSettings;
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

  // Extension management
  setTavilyApiKey: (apiKey: string) => void;
  getTavilyApiKey: () => string | undefined;
  clearTavilyApiKey: () => void;

  // Extension search settings
  setSearchExtensionConfig: (config: Partial<SearchExtensionConfig>) => void;
  getSearchExtensionConfig: () => SearchExtensionConfig;

  // MCP settings
  setMcpEnabled: (enabled: boolean) => void;
  addMcpServer: (config: {
    name: string;
    url: string;
    headers?: Array<{ key: string; value: string }>;
    tools?: Array<Partial<McpToolSetting> & { name: string }>;
  }) => McpServerConfig;
  removeMcpServer: (serverId: string) => void;
  updateMcpServerMetadata: (serverId: string, metadata: { name?: string; url?: string }) => void;
  setMcpServerHeaders: (
    serverId: string,
    headers: Array<{ id?: string; key: string; value: string }>
  ) => void;
  setMcpServerTools: (
    serverId: string,
    tools: Array<Partial<McpToolSetting> & { name: string }>
  ) => void;
  toggleMcpTool: (serverId: string, toolName: string, enabled?: boolean) => void;
  getMcpRuntimeConfig: () => McpRuntimeConfig;
  getMcpRuntimeServer: (serverId: string) => McpRuntimeServerConfig | null;

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
      extensionSettings: {
        searchConfig: { ...DEFAULT_SEARCH_CONFIG },
      },
      mcpSettings: {
        enabled: false,
        servers: [],
      },
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

      // Extension management
      setTavilyApiKey: (apiKey: string) => {
        set((state) => {
          const newSettings: ExtensionSettings = { ...state.extensionSettings };

          if (!apiKey.trim()) {
            delete newSettings.tavilyApiKey;
          } else {
            newSettings.tavilyApiKey = encryptApiKey(apiKey.trim());
          }

          return { extensionSettings: newSettings };
        });
      },

      getTavilyApiKey: () => {
        const encryptedKey = get().extensionSettings.tavilyApiKey;
        if (!encryptedKey) return undefined;

        try {
          return decryptApiKey(encryptedKey);
        } catch (error) {
          console.error("Failed to decrypt Tavily API key:", error);
          return undefined;
        }
      },

      clearTavilyApiKey: () => {
        set((state) => {
          const newSettings: ExtensionSettings = { ...state.extensionSettings };
          delete newSettings.tavilyApiKey;
          return { extensionSettings: newSettings };
        });
      },

      setSearchExtensionConfig: (config: Partial<SearchExtensionConfig>) => {
        set((state) => {
          const previous = state.extensionSettings.searchConfig ?? {
            ...DEFAULT_SEARCH_CONFIG,
          };
          const next: SearchExtensionConfig = {
            ...previous,
            ...config,
          };

          if (config.maxResults !== undefined) {
            next.maxResults = clampSearchResults(config.maxResults);
          }

          return {
            extensionSettings: {
              ...state.extensionSettings,
              searchConfig: next,
            },
          };
        });
      },

      getSearchExtensionConfig: () => {
        const state = get();
        const persisted = state.extensionSettings.searchConfig;
        const merged = {
          ...DEFAULT_SEARCH_CONFIG,
          ...(persisted ?? {}),
        };

        return {
          ...merged,
          maxResults: clampSearchResults(merged.maxResults),
        };
      },

      setMcpEnabled: (enabled) => {
        set((state) => ({
          mcpSettings: {
            ...state.mcpSettings,
            enabled,
          },
        }));
      },

      addMcpServer: ({ name, url, headers, tools }) => {
        const serverId = generateId();
        const sanitizedName = name.trim() || "MCP Server";
        const sanitizedUrl = url.trim();

        const headerInputs = Array.isArray(headers) ? headers : [];

        const encryptedHeaders = encryptHeaders(headerInputs);
        const normalizedTools = Array.isArray(tools)
          ? mergeToolSettings(tools, [])
          : [];

        const server: McpServerConfig = {
          id: serverId,
          name: sanitizedName,
          url: sanitizedUrl,
          headers: encryptedHeaders,
          tools: normalizedTools,
        };

        set((state) => ({
          mcpSettings: {
            ...state.mcpSettings,
            servers: [...state.mcpSettings.servers, server],
          },
        }));

        return server;
      },

      removeMcpServer: (serverId) => {
        set((state) => ({
          mcpSettings: {
            ...state.mcpSettings,
            servers: state.mcpSettings.servers.filter(
              (server) => server.id !== serverId
            ),
          },
        }));
      },

      updateMcpServerMetadata: (serverId, metadata) => {
        set((state) => ({
          mcpSettings: {
            ...state.mcpSettings,
            servers: state.mcpSettings.servers.map((server) => {
              if (server.id !== serverId) {
                return server;
              }

              const nextName =
                metadata.name !== undefined ? metadata.name : server.name;
              const nextUrl =
                metadata.url !== undefined
                  ? metadata.url.trim()
                  : server.url;

              return {
                ...server,
                name: nextName,
                url: nextUrl,
              };
            }),
          },
        }));
      },

      setMcpServerHeaders: (serverId, headers) => {
        set((state) => ({
          mcpSettings: {
            ...state.mcpSettings,
            servers: state.mcpSettings.servers.map((server) => {
              if (server.id !== serverId) {
                return server;
              }

              return {
                ...server,
                headers: encryptHeaders(headers, server.headers),
              };
            }),
          },
        }));
      },

      setMcpServerTools: (serverId, tools) => {
        set((state) => ({
          mcpSettings: {
            ...state.mcpSettings,
            servers: state.mcpSettings.servers.map((server) => {
              if (server.id !== serverId) {
                return server;
              }

              const merged = mergeToolSettings(tools, server.tools);

              return {
                ...server,
                tools: merged,
              };
            }),
          },
        }));
      },

      toggleMcpTool: (serverId, toolName, enabled) => {
        set((state) => ({
          mcpSettings: {
            ...state.mcpSettings,
            servers: state.mcpSettings.servers.map((server) => {
              if (server.id !== serverId) {
                return server;
              }

              const updatedTools = server.tools.map((tool) => {
                if (tool.name !== toolName) {
                  return tool;
                }

                const nextEnabled =
                  typeof enabled === "boolean" ? enabled : !tool.enabled;

                return {
                  ...tool,
                  enabled: nextEnabled,
                };
              });

              return {
                ...server,
                tools: updatedTools,
              };
            }),
          },
        }));
      },

      getMcpRuntimeConfig: () => {
        const state = get();
        const runtimeServers: McpRuntimeServerConfig[] = state.mcpSettings.servers
          .map((server) => ({
            id: server.id,
            name: server.name,
            url: server.url,
            headers: decryptHeaders(server.headers).map((header) => ({
              id: header.id,
              key: header.key,
              value: header.value,
            })),
            enabledTools: server.tools
              .filter((tool) => tool.enabled !== false)
              .map((tool) => tool.name),
          }));

        return {
          enabled: state.mcpSettings.enabled,
          servers: runtimeServers,
        };
      },

      getMcpRuntimeServer: (serverId) => {
        const state = get();
        const target = state.mcpSettings.servers.find(
          (server) => server.id === serverId
        );

        if (!target) {
          return null;
        }

        return {
          id: target.id,
          name: target.name,
          url: target.url,
          headers: decryptHeaders(target.headers).map((header) => ({
            id: header.id,
            key: header.key,
            value: header.value,
          })),
          enabledTools: target.tools
            .filter((tool) => tool.enabled !== false)
            .map((tool) => tool.name),
        } satisfies McpRuntimeServerConfig;
      },

      // Dynamic model management
      fetchModels: async () => {
        if (modelsFetchInFlight) return modelsFetchInFlight;
        
        modelsFetchInFlight = (async () => {
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

        // 如果没有任何用户配置的 API 密钥，则不请求模型列表
        if (Object.keys(apiKeys).length === 0) {
          set({
            allAvailableModels: [],
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
            body: JSON.stringify(Object.keys(apiKeys).length > 0 ? { apiKeys } : {}),
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
        })();

        try {
          await modelsFetchInFlight;
        } finally {
          modelsFetchInFlight = null;
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
        extensionSettings: state.extensionSettings,
        mcpSettings: state.mcpSettings,
        allAvailableModels: state.allAvailableModels,
        enabledModelIds: Array.from(state.enabledModelIds), // 序列化Set为数组
      }),
      
      // 自定义反序列化逻辑，将数组转换回Set
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.log("An error happened during hydration", error);
          return;
        }

        if (!state) {
          return;
        }

        if (!state.extensionSettings) {
          state.extensionSettings = { searchConfig: { ...DEFAULT_SEARCH_CONFIG } };
        } else {
          state.extensionSettings.searchConfig = {
            ...DEFAULT_SEARCH_CONFIG,
            ...(state.extensionSettings.searchConfig ?? {}),
          };
          state.extensionSettings.searchConfig.maxResults = clampSearchResults(
            state.extensionSettings.searchConfig.maxResults
          );
        }

        if (!state.mcpSettings) {
          state.mcpSettings = { enabled: false, servers: [] };
        } else {
          state.mcpSettings.enabled = Boolean(state.mcpSettings.enabled);

          if (!Array.isArray(state.mcpSettings.servers)) {
            state.mcpSettings.servers = [];
          } else {
            state.mcpSettings.servers = state.mcpSettings.servers
              .map((server) => {
                if (!server || typeof server !== "object") {
                  return null;
                }

                const id =
                  typeof server.id === "string" && server.id.trim()
                    ? server.id
                    : generateId();
                const name =
                  typeof server.name === "string" && server.name.trim()
                    ? server.name
                    : "MCP Server";
                const url =
                  typeof server.url === "string" ? server.url : "";

                const headers: McpHeaderEntry[] = Array.isArray(server.headers)
                  ? server.headers
                      .map((header) => {
                        if (!header || typeof header !== "object") {
                          return null;
                        }

                        const headerId =
                          typeof header.id === "string" && header.id.trim()
                            ? header.id
                            : generateId();
                        return {
                          id: headerId,
                          key:
                            typeof header.key === "string" ? header.key : "",
                          value:
                            typeof header.value === "string"
                              ? header.value
                              : "",
                        } satisfies McpHeaderEntry;
                      })
                      .filter((entry): entry is McpHeaderEntry => entry !== null)
                  : [];

                const tools: McpToolSetting[] = Array.isArray(server.tools)
                  ? server.tools
                      .filter(
                        (tool): tool is McpToolSetting & { lastSyncedAt?: string } =>
                          !!tool && typeof tool.name === "string"
                      )
                      .map((tool) => ({
                        name: tool.name,
                        description:
                          typeof tool.description === "string"
                            ? tool.description
                            : undefined,
                        enabled:
                          typeof tool.enabled === "boolean" ? tool.enabled : true,
                        lastSyncedAt:
                          typeof tool.lastSyncedAt === "string"
                            ? tool.lastSyncedAt
                            : undefined,
                      }))
                  : [];

                return {
                  id,
                  name,
                  url,
                  headers,
                  tools,
                } satisfies McpServerConfig;
              })
              .filter((server): server is McpServerConfig => server !== null);
          }
        }

        const persistedIds = state.enabledModelIds as unknown;
        if (Array.isArray(persistedIds)) {
          const normalizedIds = persistedIds.filter(
            (id): id is string => typeof id === "string"
          );
          state.enabledModelIds = new Set(normalizedIds);
        }

        const enabledModels = state.allAvailableModels.filter((model) =>
          state.enabledModelIds.has(model.id)
        );
        state.availableModels = enabledModels;
      },
    }
  )
);
