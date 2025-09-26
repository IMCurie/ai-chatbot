import React from "react";
import { Message } from "@/components/message";
import Spinner from "@/components/spinner";
import { UIMessage } from "ai";

import type { SearchSession } from "@/components/search-flow-card";

interface MessageListProps {
  messages: UIMessage[];
  status: "ready" | "submitted" | "streaming" | "error";
  searchSessions?: SearchSession[];
  renderSearchCard?: (session: SearchSession) => React.ReactNode;
}

export function MessageList({
  messages,
  status,
  searchSessions = [],
  renderSearchCard,
}: MessageListProps) {
  const searchSessionMap = React.useMemo(() => {
    return new Map(
      searchSessions.map((session) => [session.messageId, session])
    );
  }, [searchSessions]);

  return (
    <ul className="space-y-12 last:mb-32">
      {messages.map((message) => {
        const session = searchSessionMap.get(message.id);

        return (
          <React.Fragment key={message.id}>
            <li>
              <Message message={message} />
            </li>
            {session && message.role === "user" && renderSearchCard && (
              <li className="mt-6">{renderSearchCard(session)}</li>
            )}
          </React.Fragment>
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
