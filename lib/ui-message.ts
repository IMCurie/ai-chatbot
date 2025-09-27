import type { UIMessage } from "ai";

type UIPart = UIMessage["parts"][number];

const extractTextFromPart = (part: UIPart): string => {
  if (part.type === "text" && typeof part.text === "string") {
    return part.text;
  }

  return "";
};

export function getMessageText(message: UIMessage): string {
  return message.parts
    .map((part) => extractTextFromPart(part))
    .filter((text) => text)
    .join("\n\n");
}
