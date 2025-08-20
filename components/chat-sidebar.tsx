"use client";

import { useChatStore } from "@/lib/store";
import { Plus, Trash2, Settings } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { ApiSettingsDialog } from "@/components/api-settings-dialog";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "./ui/button";

export default function ChatSidebar() {
  const { chats, deleteChat } = useChatStore();
  const router = useRouter();
  const pathname = usePathname();

  // Get current chat ID from pathname
  const currentChatId = pathname.includes("/chat/")
    ? pathname.split("/chat/")[1]
    : null;

  const handleDeleteChat = (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    e.preventDefault();
    deleteChat(chatId);

    // If we're deleting the current chat, go to home
    if (chatId === currentChatId) {
      router.push("/");
    }
  };

  return (
    <div className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <Link
          href="/"
          className="w-full bg-sidebar-primary hover:bg-sidebar-primary/90 text-sidebar-primary-foreground px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </Link>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto p-4">
        {chats.length === 0 ? (
          <div className="text-center text-sidebar-foreground/60 mt-8">
            <p className="text-sm">No chats yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {chats.map((chat) => {
              const isActive = currentChatId === chat.id;
              return (
                <Link key={chat.id} href={`/chat/${chat.id}`} className="block">
                  <div
                    className={cn(
                      "group relative cursor-pointer rounded-lg p-3 transition-colors",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "hover:bg-sidebar-accent/50 text-sidebar-foreground"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0 mr-2">
                        <div className="font-medium text-sm truncate">
                          {chat.title}
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleDeleteChat(e, chat.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 hover:text-destructive rounded transition-all"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-sidebar-border">
        <Dialog>
          <DialogTrigger asChild>
            <button className="w-full flex items-center gap-3 px-3 py-2.5 text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground rounded-lg transition-colors text-sm">
              <Settings className="w-4 h-4" />
              <span>API Settings</span>
            </button>
          </DialogTrigger>
          <ApiSettingsDialog />
        </Dialog>
      </div>
    </div>
  );
}
