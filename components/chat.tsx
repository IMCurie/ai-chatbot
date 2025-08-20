"use client";

import React, { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { MessageList } from "@/components/message-list";
import Input from "@/components/input";
import { useChatStore } from "@/lib/store";
import { Greeting } from "@/components/greeting";
import ModelSelector from "@/components/model-selector";
import { v4 as uuidv4 } from "uuid";
import { ModelProvider } from "@/lib/models";
import { usePathname } from "next/navigation";

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
  const pathname = usePathname();

  const existingChat = chats.find((chat) => chat.id === id);
  const initialMessages = existingChat?.messages || [];

  // Get user API keys for the current model provider
  const getUserApiKeys = () => {
    const apiKeys: Record<string, string> = {};
    const providers: ModelProvider[] = [
      "openai",
      "anthropic",
      "google",
      "openrouter",
      "grok",
    ];

    providers.forEach((provider) => {
      const key = getApiKey(provider);
      if (key) {
        apiKeys[provider] = key;
      }
    });

    return apiKeys;
  };

  // Get user API base URLs for the current model provider
  const getUserApiBaseUrls = () => {
    const baseUrls: Record<string, string> = {};
    const providers: ModelProvider[] = [
      "openai",
      "anthropic",
      "google",
      "openrouter",
      "grok",
    ];

    providers.forEach((provider) => {
      const baseUrl = getApiBaseUrl(provider);
      if (baseUrl) {
        baseUrls[provider] = baseUrl;
      }
    });

    return baseUrls;
  };

  const { status, stop, append } = useChat({
    body: {
      model: model,
      apiKeys: getUserApiKeys(),
      baseUrls: getUserApiBaseUrls(),
    },
    initialMessages: initialMessages,
    onFinish: (message) => {
      if (id) {
        addMessage(id, {
          id: uuidv4(),
          role: "assistant",
          content: message.content,
          createdAt: new Date(),
        });
      }
    },
  });

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (input.trim()) {
      if (!existingChat) {
        createChat(id);
      }

      window.history.replaceState({}, "", `/chat/${id}`);

      addMessage(id, {
        id: uuidv4(),
        createdAt: new Date(),
        role: "user",
        content: input.trim(),
      });
      append({ role: "user", content: input.trim() });
    }

    setInput("");
  };

  return (
    <div className="flex flex-col h-screen font-sans overflow-y-auto scrollbar-gutter-stable">
      <div className="flex-1">
        {pathname.includes("/chat/") && (
          <div className="px-4 pt-4">
            <ModelSelector selectedModel={model} onModelChange={setModel} />
          </div>
        )}
        <div className="max-w-3xl mx-auto">
          <div className="py-10 pb-32">
            {initialMessages.length === 0 ? (
              <Greeting />
            ) : (
              <MessageList messages={initialMessages} status={status} />
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
        />
      </div>
    </div>
  );
}
