"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { v4 as uuidv4 } from "uuid";

import { Greeting } from "@/components/greeting";
import Input from "@/components/input";
import { MessageList } from "@/components/message-list";
import ModelSelector from "@/components/model-selector";
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
  } = useChatStore();
  const [input, setInput] = useState("");

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

  const { messages, status, stop, sendMessage } = useChat({
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

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (input.trim() && model) {
      if (!existingChat) {
        createChat(id);
      }

      window.history.replaceState({}, "", `/chat/${id}`);
      sendMessage({ text: input.trim() });
      addMessage(id, {
        id: uuidv4(),
        createdAt: new Date(),
        role: "user",
        content: input.trim(),
      });
    }

    setInput("");
  };

  return (
    <div className="flex flex-col h-screen font-sans overflow-y-auto scrollbar-gutter-stable">
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur px-4 pt-4 pb-2 border-b">
        <ModelSelector selectedModel={model} onModelChange={setModel} />
      </div>
      <div className="flex-1">
        <div className="max-w-3xl mx-auto">
          <div className="py-10 pb-32">
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
        />
      </div>
    </div>
  );
}
