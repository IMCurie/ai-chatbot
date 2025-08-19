"use client";

import React, { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { MessageList } from "@/components/message-list";
import Input from "@/components/input";
import { useChatStore } from "@/lib/store";
import { Greeting } from "@/components/greeting";
import { v4 as uuidv4 } from "uuid";

export default function Chat({ id }: { id: string }) {
  const { chats, addMessage, createChat, model, setModel } = useChatStore();
  const [input, setInput] = useState("");

  const existingChat = chats.find((chat) => chat.id === id);
  const initialMessages = existingChat?.messages || [];

  const { status, stop, append } = useChat({
    body: {
      model: model,
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
          model={model}
          onModelChange={setModel}
        />
      </div>
    </div>
  );
}
