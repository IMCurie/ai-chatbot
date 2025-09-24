import type { UIMessage } from "ai";

type UIPart = UIMessage["parts"][number];

const toolPrefix = "tool-";
const dataPrefix = "data-";

function extractTextFromPart(part: UIPart): string {
  if (part.type === "text") {
    return part.text;
  }

  if (part.type === "reasoning") {
    return part.text;
  }

  if (
    part.type === "dynamic-tool" &&
    (part.state === "output-available" || part.state === "output-error")
  ) {
    if ("output" in part && typeof part.output === "string") {
      return part.output;
    }
    if ("errorText" in part && typeof part.errorText === "string") {
      return part.errorText;
    }
  }

  if (typeof part.type === "string" && part.type.startsWith(dataPrefix)) {
    const data = (part as { data?: unknown }).data;
    if (typeof data === "string") {
      return data;
    }
  }

  if (typeof part.type === "string" && part.type.startsWith(toolPrefix)) {
    const toolPart = part as { output?: unknown; errorText?: unknown; state?: string };
    if (toolPart.state === "output-available" && typeof toolPart.output === "string") {
      return toolPart.output;
    }
    if (toolPart.state === "output-error" && typeof toolPart.errorText === "string") {
      return toolPart.errorText;
    }
  }

  return "";
}

export function getMessageText(message: UIMessage): string {
  return message.parts
    .map((part) => extractTextFromPart(part))
    .filter((text) => text)
    .join("");
}
