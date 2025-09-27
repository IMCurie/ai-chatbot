import type { DynamicToolUIPart, UIMessage } from "ai";
import type { ReactNode } from "react";

import { getMessageText } from "@/lib/ui-message";
import { cn } from "@/lib/utils";
import MemoizedMarkdown from "./enhance-markdown";
import { ToolCallCard } from "./tool-call-card";

interface MessageProps {
  message: UIMessage;
}

export function Message({ message }: MessageProps) {
  if (message.role === "assistant") {
    return <AssistantMessage message={message} />;
  }

  const textContent = getMessageText(message);

  if (!textContent) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex flex-row items-start",
        message.role === "user"
          ? "justify-end w-3/5 ml-auto"
          : "justify-start w-full"
      )}
    >
      <div
        className={cn(
          "rounded-3xl",
          message.role === "user"
            ? "bg-secondary text-secondary-foreground px-4 py-2"
            : "py-0.5 w-full"
        )}
      >
        {message.role === "user" ? (
          <div className="text-foreground">{textContent}</div>
        ) : (
          <MemoizedMarkdown content={textContent} id={message.id} />
        )}
      </div>
    </div>
  );
}

function AssistantMessage({ message }: MessageProps) {
  const renderedParts: ReactNode[] = [];
  let textBuffer: string[] = [];

  // Determine the last occurrence index for each toolCallId so we only
  // render a single row per tool call (and allow it to update from loading → done)
  const lastIndexByToolId = new Map<string, number>();
  message.parts.forEach((part, index) => {
    if (part.type === "dynamic-tool") {
      const dyn = part as DynamicToolUIPart;
      const id = String(dyn.toolCallId ?? `${dyn.toolName}-${index}`);
      lastIndexByToolId.set(id, index);
    }
  });

  const flushText = () => {
    if (textBuffer.length === 0) {
      return;
    }

    const text = textBuffer.join("\n\n");
    renderedParts.push(
      <div
        key={`assistant-text-${renderedParts.length}`}
        className="rounded-3xl py-0.5 w-full"
      >
        <MemoizedMarkdown
          content={text}
          id={`${message.id}-text-${renderedParts.length}`}
        />
      </div>
    );
    textBuffer = [];
  };

  message.parts.forEach((part, index) => {
    if (part.type === "text" && typeof part.text === "string") {
      textBuffer.push(part.text);
      return;
    }

    if (part.type === "dynamic-tool") {
      const dynamicPart = part as DynamicToolUIPart;
      const toolKey = String(dynamicPart.toolCallId ?? `${dynamicPart.toolName}-${index}`);
      const lastIdx = lastIndexByToolId.get(toolKey);
      if (lastIdx !== index) {
        // Only render the most recent state for this tool call
        return;
      }

      // Render the tool row (supports pending, success, and error)
      flushText();
      renderedParts.push(
        <div
          key={`tool-${toolKey}`}
          className="flex justify-start"
        >
          <ToolCallCard
            part={dynamicPart}
            className="w-full max-w-3xl"
          />
        </div>
      );
    }
  });

  flushText();

  if (renderedParts.length === 0) {
    const textContent = getMessageText(message);
    if (!textContent) {
      return null;
    }
    renderedParts.push(
      <div key="assistant-fallback" className="rounded-3xl py-0.5 w-full">
        <MemoizedMarkdown content={textContent} id={message.id} />
      </div>
    );
  }

  return (
    <div className={cn("flex flex-row items-start", "justify-start w-full")}> 
      <div className="flex w-full flex-col gap-4">{renderedParts}</div>
    </div>
  );
}
