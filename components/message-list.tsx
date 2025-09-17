import { Message } from "@/components/message";
import Spinner from "@/components/spinner";
import { UIMessage } from "ai";

export function MessageList({
  messages,
  status,
}: {
  messages: UIMessage[];
  status: "ready" | "submitted" | "streaming" | "error";
}) {
  return (
    <ul className="space-y-12">
      {messages.map((message) => {
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
