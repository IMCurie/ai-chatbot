"use client";

import { useState } from "react";
import { Model } from "@/lib/models";
import { models } from "@/lib/models";
import { useChatStore } from "@/lib/store";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const [selectedModel, setSelectedModel] = useState<Model>(
    models.find((m) => m.id === "openai/gpt-4.1-mini-2025-04-14") || models[0]
  );
  const [input, setInput] = useState("");

  const { createChat, addMessage } = useChatStore();
  const router = useRouter();

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (input.trim()) {
      // Create a new chat
      const newChat = createChat();
      
      // Add user message to store
      addMessage(newChat.id, {
        role: 'user',
        content: input.trim(),
      });

      // Navigate to the new chat page
      router.push(`/chat/${newChat.id}`);
    }
  };

  return (
    <div className="flex flex-col h-screen font-sans">
      <div className="flex-1">
        <div className="max-w-3xl mx-auto">
          <div className="py-10 pb-32">
            {/* Welcome message */}
            <div className="text-center space-y-4 mt-20">
              <h1 className="text-4xl font-bold text-gray-900">
                Welcome to AI Chat
              </h1>
              <p className="text-xl text-gray-600">
                Start a conversation by typing a message below
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 w-full max-w-3xl mx-auto pb-4">
        <div className="relative backdrop-blur-md bg-white/80 border border-neutral-200/50 shadow-lg rounded-3xl">
          <div className="px-5 pt-3 pb-2 border-b border-neutral-100">
            <select 
              value={selectedModel.id}
              onChange={(e) => {
                const model = models.find(m => m.id === e.target.value);
                if (model) setSelectedModel(model);
              }}
              className="bg-transparent text-sm font-medium text-neutral-900 outline-none"
            >
              {models.map(model => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex items-end px-5 pt-2 pb-3 gap-3">
            <form onSubmit={handleFormSubmit} className="flex w-full items-end gap-3">
              <div className="flex-1">
                <textarea
                  value={input}
                  onChange={handleInputChange}
                  placeholder="Ask anything"
                  className="w-full bg-transparent text-neutral-900 placeholder-neutral-500 text-base outline-none resize-none min-h-[64px] max-h-32 py-2 leading-6"
                  rows={3}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = "auto";
                    target.style.height = `${Math.max(target.scrollHeight, 64)}px`;
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && input.trim()) {
                      e.preventDefault();
                      handleFormSubmit(e as any);
                    }
                  }}
                />
              </div>

              <div className="flex-shrink-0">
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="w-8 h-8 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg flex items-center justify-center transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}