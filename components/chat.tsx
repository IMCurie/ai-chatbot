"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { v4 as uuidv4 } from "uuid";

import { Greeting } from "@/components/greeting";
import Input from "@/components/input";
import { MessageList } from "@/components/message-list";
import ModelSelector from "@/components/model-selector";
import SearchResultsPanel, {
  type SearchResultItem,
} from "@/components/search-results-panel";
import { ModelProvider } from "@/lib/models";
import { useChatStore } from "@/lib/store";
import { getMessageText } from "@/lib/ui-message";

const PROVIDERS: ModelProvider[] = [
  "openai",
  "anthropic",
  "google",
  "openrouter",
  "grok",
];

export default function Chat({ id }: { id: string }) {
  const {
    chats,
    addMessage,
    createChat,
    model,
    setModel,
    getApiKey,
    getApiBaseUrl,
    getTavilyApiKey,
    getSearchExtensionConfig,
  } = useChatStore();
  const [input, setInput] = useState("");
  const [isNetworkSearchEnabled, setIsNetworkSearchEnabled] = useState(false);
  const [isFetchingSearch, setIsFetchingSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [lastSearchQuery, setLastSearchQuery] = useState("");
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  const tavilyApiKey = getTavilyApiKey();
  const hasTavilyKey = Boolean(tavilyApiKey);
  const searchConfig = getSearchExtensionConfig();
  const {
    queryLanguage: searchLanguage,
    excludeWebsites: searchExcludeWebsites,
    maxResults: searchMaxResults,
  } = searchConfig;

  useEffect(() => {
    if (!hasTavilyKey && isNetworkSearchEnabled) {
      setIsNetworkSearchEnabled(false);
      setSearchResults([]);
      setLastSearchQuery("");
      setSearchError(null);
    }
  }, [hasTavilyKey, isNetworkSearchEnabled]);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const existingChat = chats.find((chat) => chat.id === id);
  const initialMessages = useMemo<UIMessage[]>(() => {
    if (!existingChat) {
      return [];
    }

    return existingChat.messages.map((message) => ({
      id: message.id,
      role: message.role,
      parts: [{ type: "text" as const, text: message.content }],
    }));
  }, [existingChat]);

  // Get user API keys for the current model provider
  const getUserApiKeys = useCallback(() => {
    const apiKeys: Record<string, string> = {};

    PROVIDERS.forEach((provider) => {
      const key = getApiKey(provider);
      if (key) {
        apiKeys[provider] = key;
      }
    });

    return apiKeys;
  }, [getApiKey]);

  // Get user API base URLs for the current model provider
  const getUserApiBaseUrls = useCallback(() => {
    const baseUrls: Record<string, string> = {};

    PROVIDERS.forEach((provider) => {
      const baseUrl = getApiBaseUrl(provider);
      if (baseUrl) {
        baseUrls[provider] = baseUrl;
      }
    });

    return baseUrls;
  }, [getApiBaseUrl]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        body: () => ({
          model,
          apiKeys: getUserApiKeys(),
          baseUrls: getUserApiBaseUrls(),
        }),
      }),
    [getUserApiBaseUrls, getUserApiKeys, model]
  );

  const { messages, status, stop, sendMessage, setMessages } = useChat({
    id,
    transport,
    messages: initialMessages,
    onFinish: ({ message, isAbort, isError }) => {
      if (id && !isAbort && !isError) {
        const content = getMessageText(message);

        if (!content) {
          return;
        }

        addMessage(id, {
          id: uuidv4(),
          role: "assistant",
          content,
          createdAt: new Date(),
        });
      }
    },
  });

  interface TavilySearchResponse {
    query: string;
    searchDepth?: string;
    results: SearchResultItem[];
  }

  const runTavilySearch = useCallback(
    async (query: string): Promise<TavilySearchResponse> => {
      const response = await fetch("/api/extensions/tavily-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          apiKey: tavilyApiKey || undefined,
          maxResults: searchMaxResults,
          searchDepth: "basic",
          language: searchLanguage,
          excludeWebsites: searchExcludeWebsites,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "联网搜索失败");
      }

      const data = (await response.json()) as TavilySearchResponse;
      return {
        query: data.query,
        searchDepth: data.searchDepth,
        results: Array.isArray(data.results) ? data.results : [],
      };
    },
    [
      tavilyApiKey,
      searchExcludeWebsites,
      searchLanguage,
      searchMaxResults,
    ]
  );

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const trimmed = input.trim();
    if (!trimmed || !model) {
      return;
    }

    if (!existingChat) {
      createChat(id);
    }

    window.history.replaceState({}, "", `/chat/${id}`);

    const messageId = uuidv4();

    setMessages((prev) => [
      ...prev,
      {
        id: messageId,
        role: "user" as const,
        parts: [{ type: "text" as const, text: trimmed }],
      },
    ]);

    addMessage(id, {
      id: messageId,
      createdAt: new Date(),
      role: "user",
      content: trimmed,
    });

    setInput("");

    let searchPayload:
      | {
          provider: string;
          query: string;
          results: SearchResultItem[];
          language?: string;
          maxResults?: number;
          excludeWebsites?: string;
        }
      | undefined;

    if (isNetworkSearchEnabled && hasTavilyKey) {
      setIsFetchingSearch(true);
      setSearchError(null);
      try {
        const searchResponse = await runTavilySearch(trimmed);
        setSearchResults(searchResponse.results);
        setLastSearchQuery(searchResponse.query);
        searchPayload = {
          provider: "Tavily 搜索",
          query: searchResponse.query,
          results: searchResponse.results,
          language: searchLanguage,
          maxResults: searchMaxResults,
          excludeWebsites: searchExcludeWebsites,
        };
      } catch (error) {
        console.error("Tavily search error", error);
        setSearchResults([]);
        setLastSearchQuery(trimmed);
        setSearchError(
          error instanceof Error ? error.message : "联网搜索失败，请稍后重试"
        );
      } finally {
        setIsFetchingSearch(false);
      }
    } else {
      setSearchResults([]);
      setLastSearchQuery("");
      setSearchError(null);
    }

    await sendMessage(
      { text: trimmed, messageId },
      {
        body: {
          search: searchPayload,
        },
      }
    );
  };

  const handleNetworkSearchToggle = (next: boolean) => {
    if (!hasTavilyKey) {
      setSearchError("请先在设置中保存 Tavily API Key");
      setIsNetworkSearchEnabled(false);
      return;
    }

    setIsNetworkSearchEnabled(next);

    if (!next) {
      setSearchResults([]);
      setLastSearchQuery("");
      setSearchError(null);
    }
  };

  return (
    <div className="flex flex-col h-screen font-sans overflow-y-auto scrollbar-gutter-stable">
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur px-4 pt-4 pb-2 border-b">
        <ModelSelector selectedModel={model} onModelChange={setModel} />
      </div>
      <div className="flex-1">
        <div className="max-w-3xl mx-auto">
          <div className="py-10 pb-32">
            {searchResults.length > 0 && (
              <SearchResultsPanel
                providerLabel="Tavily 搜索"
                query={lastSearchQuery}
                results={searchResults}
                isStreaming={status === "streaming"}
              />
            )}
            {searchError && (
              <div className="mb-6 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {searchError}
              </div>
            )}
            {messages.length === 0 ? (
              <Greeting />
            ) : (
              <MessageList messages={messages} status={status} />
            )}
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 w-full max-w-3xl mx-auto pb-4">
        <Input
          inputValue={input}
          onInputChange={(e) => setInput(e.target.value)}
          onSubmit={handleFormSubmit}
          status={status}
          stop={stop}
          disabled={!model}
          placeholder={!model ? "请先在设置中配置API密钥并选择模型" : undefined}
          networkSearchEnabled={isNetworkSearchEnabled}
          onToggleNetworkSearch={handleNetworkSearchToggle}
          networkSearchAvailable={hasTavilyKey}
          networkSearchLoading={isFetchingSearch}
          showNetworkSearchToggle={isHydrated}
        />
      </div>
    </div>
  );
}
