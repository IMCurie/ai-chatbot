"use client";

import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { v4 as uuidv4 } from "uuid";

import { Greeting } from "@/components/greeting";
import Input from "@/components/input";
import { MessageList } from "@/components/message-list";
import ModelSelector from "@/components/model-selector";
import {
  SearchFlowCard,
  type SearchSession,
  type SearchSessionMeta,
} from "@/components/search-flow-card";
import { ModelProvider, type Model } from "@/lib/models";
import { useChatStore } from "@/lib/store";
import { getMessageText } from "@/lib/ui-message";
import type { SearchResultItem } from "@/lib/search";

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

  const tavilyApiKey = getTavilyApiKey();
  const hasTavilyKey = Boolean(tavilyApiKey);
  const searchConfig = getSearchExtensionConfig();
  const {
    queryLanguage: searchLanguage,
    excludeWebsites: searchExcludeWebsites,
    maxResults: searchMaxResults,
    queryModelProvider: searchModelProvider,
    queryModelId: searchModelId,
  } = searchConfig;

  const [input, setInput] = useState("");
  const [isNetworkSearchEnabled, setIsNetworkSearchEnabled] = useState(false);
  const [searchSessions, setSearchSessions] = useState<SearchSession[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  

  useEffect(() => {
    if (!hasTavilyKey) {
      setIsNetworkSearchEnabled(false);
    }
  }, [hasTavilyKey]);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // no-op

  const existingChat = chats.find((chat) => chat.id === id);
  // Keep transport payload in sync with the latest selected model across hydration.
  const modelRef = useRef<Model | null>(model);
  modelRef.current = model;
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
        body: () => {
          const currentModel = modelRef.current;
          return {
            ...(currentModel ? { model: currentModel } : {}),
            apiKeys: getUserApiKeys(),
            baseUrls: getUserApiBaseUrls(),
          };
        },
      }),
    [getUserApiBaseUrls, getUserApiKeys]
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

  const fetchTavilySearch = useCallback(
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
    [tavilyApiKey, searchExcludeWebsites, searchLanguage, searchMaxResults]
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
      const sessionMeta: SearchSessionMeta = {
        providerLabel: "tavily",
        modelProvider: searchModelProvider,
        modelId: searchModelId,
        language: searchLanguage,
        excludeWebsites: searchExcludeWebsites,
        maxResults: searchMaxResults,
      };

      setSearchSessions((prev) => [
        ...prev,
        {
          messageId,
          query: trimmed,
          status: "processing",
          results: [],
          expanded: false,
          meta: sessionMeta,
        },
      ]);

      try {
        const searchResponse = await fetchTavilySearch(trimmed);
        setSearchSessions((prev) =>
          prev.map((session) =>
            session.messageId === messageId
              ? {
                  ...session,
                  status: "complete",
                  results: searchResponse.results,
                  expanded: false,
                }
              : session
          )
        );

        searchPayload = {
          provider: sessionMeta.providerLabel,
          query: searchResponse.query,
          results: searchResponse.results,
          language: sessionMeta.language,
          maxResults: sessionMeta.maxResults,
          excludeWebsites: sessionMeta.excludeWebsites,
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "联网搜索失败，请稍后重试";

        console.error("Tavily search error", error);
        setSearchSessions((prev) =>
          prev.map((session) =>
            session.messageId === messageId
              ? {
                  ...session,
                  status: "error",
                  error: message,
                }
              : session
          )
        );
      }
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

  const handleNetworkSearchToggle = useCallback(
    (nextValue?: boolean) => {
      if (!hasTavilyKey) {
        return;
      }
      setIsNetworkSearchEnabled((prev) =>
        typeof nextValue === "boolean" ? nextValue : !prev
      );
    },
    [hasTavilyKey]
  );

  const handleToggleSearchSession = useCallback((messageId: string) => {
    setSearchSessions((prev) =>
      prev.map((session) =>
        session.messageId === messageId
          ? { ...session, expanded: !session.expanded }
          : session
      )
    );
  }, []);

  const handleRetrySearchSession = useCallback(
    async (messageId: string) => {
      let queryToRetry = "";

      setSearchSessions((prev) => {
        const target = prev.find((session) => session.messageId === messageId);
        if (target) {
          queryToRetry = target.query;
        }

        return prev.map((session) =>
          session.messageId === messageId
            ? { ...session, status: "processing", error: undefined }
            : session
        );
      });

      if (!queryToRetry) {
        return;
      }

      try {
        const searchResponse = await fetchTavilySearch(queryToRetry);
        setSearchSessions((prev) =>
          prev.map((session) =>
            session.messageId === messageId
              ? {
                  ...session,
                  status: "complete",
                  results: searchResponse.results,
                  expanded: true,
                }
              : session
          )
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "联网搜索失败，请稍后重试";

        setSearchSessions((prev) =>
          prev.map((session) =>
            session.messageId === messageId
              ? { ...session, status: "error", error: message }
              : session
          )
        );
      }
    },
    [fetchTavilySearch]
  );

  return (
    // 三段式布局：顶部模型/标题 + 中部滚动会话 + 底部输入框
    <div className="flex h-full min-h-0 flex-col font-sans">
      {/* Header */}
      <div className="shrink-0 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="grid h-14 w-full grid-cols-3 items-center px-4">
          <div className="justify-self-start">
            <ModelSelector selectedModel={model} onModelChange={setModel} />
          </div>
          <div />
          <div />
        </div>
      </div>

      {/* Conversation (scrollable) */}
      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-gutter-stable">
        <div className="mx-auto max-w-3xl px-4">
          <div className="min-h-full flex flex-col">
            <div className="pt-3">
              {messages.length === 0 ? (
                <Greeting />
              ) : (
                <MessageList
                  messages={messages}
                  status={status}
                  searchSessions={searchSessions}
                  renderSearchCard={(session) => (
                    <SearchFlowCard
                      session={session}
                      onToggleExpanded={handleToggleSearchSession}
                      onRetry={handleRetrySearchSession}
                    />
                  )}
                />
              )}
            </div>

            {/* Sticky input inside scroll area with background fade to prevent text peeking around rounded corners */}
            <div className="sticky bottom-0 z-10 mt-auto">
              <div className="pointer-events-none bg-gradient-to-t from-background via-background/95 to-background/0 pt-3 pb-3">
                <div className="pointer-events-auto">
                  <Input
                    inputValue={input}
                    onInputChange={(e) => setInput(e.target.value)}
                    onSubmit={handleFormSubmit}
                    status={status}
                    stop={stop}
                    disabled={!model}
                    placeholder={
                      !model ? "请先在设置中配置API密钥并选择模型" : undefined
                    }
                    networkSearchEnabled={isNetworkSearchEnabled}
                    onToggleNetworkSearch={handleNetworkSearchToggle}
                    networkSearchAvailable={hasTavilyKey}
                    networkSearchLoading={searchSessions.some(
                      (session) => session.status === "processing"
                    )}
                    showNetworkSearchToggle={isHydrated}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
