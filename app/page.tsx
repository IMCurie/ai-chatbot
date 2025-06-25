"use client";

import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { Message } from "@/components/message";
import Spinner from "@/components/spinner";
import Input from "@/components/input";

function MessageList({
  messages,
  status,
}: {
  messages: UIMessage[];
  status: "ready" | "submitted" | "streaming" | "error";
}) {
  return (
    <ul className="space-y-12">
      {messages.map((message: UIMessage) => {
        return (
          <li key={message.id}>
            <Message message={message} />
          </li>
        );
      })}
      {status === "submitted" && (
        <div className="ml-2.5 flex flex-row items-start justify-start">
          <div className="rounded-3xl">
            <Spinner />
          </div>
        </div>
      )}
    </ul>
  );
}

export default function Chat() {
  const { messages, input, handleInputChange, handleSubmit, status, stop } =
    useChat();

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 overflow-y-auto py-10">
        <div className="max-w-3xl mx-auto">
          <MessageList messages={messages} status={status} />
        </div>
      </div>
      <div className="max-w-3xl mx-auto w-full">
        <Input
          inputValue={input}
          onInputChange={handleInputChange}
          onSubmit={handleSubmit}
          status={status}
          stop={stop}
        />
      </div>
    </div>
  );
}
