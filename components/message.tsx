import { UIMessage } from "ai";
import Markdown from "react-markdown";
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
      {message.role === "assistant" && (
        <div className="flex items-start justify-center border border-neutral-200 shadow-sm rounded-full p-1.5 mr-3">
          <span className="icon-[logos--openai-icon] w-5 h-5"></span>
        </div>
      )}
      <div
        className={cn(
          "rounded-3xl",
          message.role === "user" ? "bg-neutral-100 px-4 py-2" : "py-0.5"
        )}
      >
        <Markdown>{message.content}</Markdown>
      </div>
    </div>
  );
}
