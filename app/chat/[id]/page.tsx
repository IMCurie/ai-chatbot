"use client";

import { useChat } from "@ai-sdk/react";
import { MessageList } from "@/components/message-list";
import Input from "@/components/input";
import { useEffect, useState, useRef } from "react";
import { ArrowDown } from "lucide-react";
import { Model } from "@/lib/models";
import { models } from "@/lib/models";
import { useChatStore } from "@/lib/store";
import { useParams } from "next/navigation";

export default function ChatPage() {
  const params = useParams();
  const chatId = params.id as string;

  const [selectedModel, setSelectedModel] = useState<Model>(
    models.find((m) => m.id === "openai/gpt-4.1-mini-2025-04-14") || models[0]
  );

  const { chats, addMessage, setActiveChat } = useChatStore();

  // Find the current chat
  const currentChat = chats.find((chat) => chat.id === chatId);

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    status,
    stop,
    reload,
  } = useChat({
    body: {
      model: selectedModel,
    },
    // Initialize with messages from store
    initialMessages:
      currentChat?.messages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
      })) || [],
    onFinish: (message) => {
      // Add assistant message to store
      addMessage(chatId, {
        role: "assistant",
        content: message.content,
      });
    },
  });

  const [showScrollButton, setShowScrollButton] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Set this chat as active when the page loads
  useEffect(() => {
    if (currentChat) {
      setActiveChat(chatId);
    }
  }, [chatId, currentChat, setActiveChat]);

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

  // 当页面首次加载且最后一条消息来自用户时，自动向 AI 发送请求以获取回复
  useEffect(() => {
    if (
      messages.length > 0 &&
      messages[messages.length - 1].role === "user" &&
      !messages.some((m) => m.role === "assistant") &&
      status === "ready"
    ) {
      // 触发 AI 回复
      reload();
    }
    // 我们只在 messages 或 status 变化时评估该逻辑
  }, [messages, status, reload]);

  const scrollToBottom = () => {
    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      scrollContainer.scrollTo({
        top: scrollContainer.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  // Custom form submit handler
  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (input.trim()) {
      // Add user message to store
      addMessage(chatId, {
        role: "user",
        content: input,
      });

      // Call the original handleSubmit
      handleSubmit(e);
    }
  };

  // If chat not found, show error
  if (!currentChat) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Chat not found
          </h2>
          <p className="text-gray-600">
            The chat you're looking for doesn't exist.
          </p>
        </div>
      </div>
    );
  }

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
          onSubmit={handleFormSubmit}
          status={status}
          stop={stop}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
        />
      </div>
    </div>
  );
}
