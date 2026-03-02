"use client";

import { FormEvent, useState } from "react";

import { Message } from "@/components/Chat/Message";
import { useChatStore } from "@/state/chatStore";
import { useTimelineStore } from "@/state/timelineStore";

export function ChatPanel() {
  const projectId = useTimelineStore((state) => state.projectId);
  const { messages, pending, error, sendMessage } = useChatStore();
  const [value, setValue] = useState("");

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = value.trim();
    if (!text) {
      return;
    }
    setValue("");
    await sendMessage(projectId, text);
  };

  return (
    <div className="stack">
      <h2>AI Chat (Mistral)</h2>

      <div className="chat-list">
        {messages.length === 0 ? <p className="muted">Try: trim clip clip_123 to 2.5</p> : null}
        {messages.map((message) => (
          <Message key={message.id} message={message} />
        ))}
      </div>

      <form className="stack" onSubmit={onSubmit}>
        <textarea
          rows={3}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder='Example: add text "Hello" at 1 for 2'
        />
        <button type="submit" disabled={pending}>
          {pending ? "Calling tools..." : "Send"}
        </button>
      </form>

      {error ? <p className="error">{error}</p> : null}
    </div>
  );
}

