"use client";

import { useChatStore } from "@/lib/store";
import { Plus, MessageCircle, Trash2 } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export default function ChatSidebar() {
  const { chats, deleteChat, setActiveChat } = useChatStore();
  const router = useRouter();
  const pathname = usePathname();

  // Get current chat ID from pathname
  const currentChatId = pathname.includes('/chat/') 
    ? pathname.split('/chat/')[1] 
    : null;

  const handleNewChat = () => {
    router.push('/');
  };

  const handleChatClick = (chatId: string) => {
    setActiveChat(chatId);
    router.push(`/chat/${chatId}`);
  };

  const handleDeleteChat = (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation(); // Prevent chat selection when deleting
    deleteChat(chatId);
    
    // If we're deleting the current chat, go to home
    if (chatId === currentChatId) {
      router.push('/');
    }
  };


  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <button
          onClick={handleNewChat}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </button>
      </div>


      {/* Chat List */}
      <div className="flex-1 overflow-y-auto p-4">
        {chats.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <MessageCircle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm">No chats yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {chats.map((chat) => (
              <div
                key={chat.id}
                className={cn(
                  "group relative cursor-pointer rounded-lg p-3 transition-colors",
                  currentChatId === chat.id
                    ? "bg-blue-100 text-blue-700"
                    : "hover:bg-gray-200 text-gray-700"
                )}
                onClick={() => handleChatClick(chat.id)}
              >
                <div className="flex items-start gap-2">
                  <MessageCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {chat.title}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {chat.messages.length} messages
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDeleteChat(e, chat.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 hover:text-red-600 rounded transition-all"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <div className="text-xs text-gray-500 text-center">
          AI Chatbot v1.0
        </div>
      </div>
    </div>
  );
}