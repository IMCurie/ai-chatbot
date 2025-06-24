"use client";

import React, { ReactNode, useRef, useActionState, useOptimistic } from "react";

type Message = {
  content: ReactNode;
  pending: boolean;
};

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(() => resolve(), ms));

function MessageList({ messages }: { messages: Message[] }) {
  return (
    <ul>
      {messages.map((message: Message, idx: number) => {
        return (
          <li key={idx}>
            {message.content} {message.pending && "(loading)"}
          </li>
        );
      })}
    </ul>
  );
}
export default function Chat() {
  const formRef = useRef<HTMLFormElement>(null);
  const [messages, formAction, isPending] = useActionState<Message[], FormData>(
    async (state, payload) => {
      const message = payload.get("message") as string;
      addOptimistic([
        ...state,
        {
          content: message,
          pending: true,
        },
      ]);

      formRef.current?.reset();
      await sleep(1000);

      return [
        ...state,
        {
          content: message,
          pending: false,
        },
      ];
    },
    []
  );

  const [optimisticMessage, addOptimistic] = useOptimistic<Message[]>(messages);

  return (
    <div>
      <MessageList messages={optimisticMessage} />
      <form className="flex flex-row" action={formAction} ref={formRef}>
        <input className="border" name="message" type="text" />
        <button
          className={`border bg-white ${
            isPending ? "cursor-not-allowed" : "cursor-pointer"
          }`}
          type="submit"
          disabled={isPending}
        >
          Send
        </button>
      </form>
    </div>
  );
}
