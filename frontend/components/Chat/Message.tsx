import { ChatMessage } from "@/state/chatStore";

type Props = {
  message: ChatMessage;
};

export function Message({ message }: Props) {
  return <div className={`chat-message ${message.role}`}>{message.text}</div>;
}

