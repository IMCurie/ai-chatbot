"use client";

import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { Message } from "@/components/message";
import Spinner from "@/components/spinner";
import Input from "@/components/input";
import { useEffect, useState, useRef } from "react";
import { ArrowDown } from "lucide-react";

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
        <div className="flex flex-row items-start justify-start">
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

  const [showScrollButton, setShowScrollButton] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 20;
      setShowScrollButton(!isAtBottom);
    };

    scrollContainer.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => scrollContainer.removeEventListener("scroll", handleScroll);
  }, [messages]);

  const scrollToBottom = () => {
    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      scrollContainer.scrollTo({
        top: scrollContainer.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  return (
    <div
      className="flex flex-col h-screen font-sans overflow-y-auto scrollbar-gutter-stable"
      ref={scrollContainerRef}
    >
      <div className="flex-1">
        <div className="max-w-3xl mx-auto">
          <div className="py-10 pb-32">
            <MessageList messages={messages} status={status} />
          </div>
        </div>
      </div>

      {showScrollButton && (
        <div className="sticky bottom-36">
          <div className="w-full max-w-3xl mx-auto flex justify-center">
            <button
              onClick={scrollToBottom}
              className="w-8 h-8 bg-white rounded-full border border-neutral-200 hover:cursor-pointer flex items-center justify-center"
            >
              <ArrowDown
                className="w-6 h-6"
                size={24}
                strokeWidth={1.5}
                color="black"
              />
            </button>
          </div>
        </div>
      )}

      <div className="sticky bottom-0 w-full max-w-3xl mx-auto pb-4">
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
