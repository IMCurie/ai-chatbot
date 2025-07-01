import { UIMessage } from "ai";
import EnhancedMarkdown from "./enhance-markdown";
import { cn } from "@/lib/utils";

export function Message({ message }: { message: UIMessage }) {
  return (
    <div
      className={cn(
        "flex flex-row items-start",
        message.role === "user"
          ? "justify-end max-w-2xl ml-auto"
          : "justify-start"
      )}
    >
      <div
        className={cn(
          "rounded-3xl",
          message.role === "user" ? "bg-neutral-100 px-4 py-2" : "py-0.5"
        )}
      >
        {message.role === "assistant" ? (
          <EnhancedMarkdown message={message.content} />
        ) : (
          <div className="text-black">{message.content}</div>
        )}
      </div>
    </div>
  );
}
