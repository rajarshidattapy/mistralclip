import { create } from "zustand";

import { chat } from "@/lib/api";
import { useTimelineStore } from "@/state/timelineStore";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

type ChatState = {
  messages: ChatMessage[];
  pending: boolean;
  error: string | null;
  sendMessage: (projectId: string, message: string) => Promise<void>;
};

function messageId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random()}`;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  pending: false,
  error: null,

  sendMessage: async (projectId, message) => {
    const userMessage: ChatMessage = { id: messageId(), role: "user", text: message };
    set((state) => ({
      messages: [...state.messages, userMessage],
      pending: true,
      error: null
    }));

    try {
      const response = await chat(projectId, message);
      useTimelineStore.getState().setTimeline(response.timeline);
      const assistantText =
        response.results.length === 0
          ? "No tool call was produced."
          : response.results
              .map((result) => `${result.tool}: ${result.status} (${result.message})`)
              .join("\n");

      set((state) => ({
        messages: [...state.messages, { id: messageId(), role: "assistant", text: assistantText }],
        pending: false
      }));
    } catch (error) {
      set((state) => ({
        messages: [
          ...state.messages,
          {
            id: messageId(),
            role: "assistant",
            text: "Tool execution failed."
          }
        ],
        pending: false,
        error: String(error)
      }));
    }
  }
}));

