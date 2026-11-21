"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  useStreamChannel,
  type ChannelMode,
  type RoomSignal,
  type StreamSignal,
} from "@/components/stream/use-stream-channel";
import {
  clearLegacyChatStorage,
  readChatMessages,
  writeChatMessages,
  type ChatMessage,
} from "@/lib/chat-storage";

const MAX_MESSAGES = 100;

type StreamRoomValue = {
  roomId: string;
  mode: ChannelMode;
  send: (signal: StreamSignal) => void;
  subscribe: (listener: (signal: RoomSignal) => void) => () => void;
};

type ChatFeedValue = {
  messages: ChatMessage[];
  appendMessage: (message: ChatMessage) => void;
};

const StreamRoomContext = createContext<StreamRoomValue | null>(null);
const ChatFeedContext = createContext<ChatFeedValue | null>(null);

export function useStreamRoom() {
  const value = useContext(StreamRoomContext);
  if (!value) {
    throw new Error("useStreamRoom must be used inside StreamRoomProvider");
  }
  return value;
}

export function useStreamChatFeed() {
  const value = useContext(ChatFeedContext);
  if (!value) {
    throw new Error("useStreamChatFeed must be used inside StreamRoomProvider");
  }
  return value;
}

export function StreamRoomProvider({
  roomId,
  children,
}: {
  roomId: string;
  children: ReactNode;
}) {
  const { mode, send, subscribe } = useStreamChannel(roomId);
  const [messages, setMessages] = useState<ChatMessage[]>(() => readChatMessages(roomId));

  const appendMessage = useCallback((message: ChatMessage) => {
    setMessages((current) =>
      current.some((item) => item.id === message.id)
        ? current
        : [...current, message].slice(-MAX_MESSAGES),
    );
  }, []);

  useEffect(
    () =>
      subscribe((signal) => {
        if (signal.type === "chat") {
          appendMessage({
            id: signal.id,
            author: signal.author,
            body: signal.body,
            sentAt: signal.sentAt,
          });
        }
      }),
    [appendMessage, subscribe],
  );

  useEffect(() => {
    writeChatMessages(roomId, messages);
  }, [messages, roomId]);

  useEffect(() => {
    clearLegacyChatStorage();
  }, []);

  const roomValue = useMemo(
    () => ({ roomId, mode, send, subscribe }),
    [mode, roomId, send, subscribe],
  );
  const chatValue = useMemo(() => ({ messages, appendMessage }), [appendMessage, messages]);

  return (
    <StreamRoomContext.Provider value={roomValue}>
      <ChatFeedContext.Provider value={chatValue}>{children}</ChatFeedContext.Provider>
    </StreamRoomContext.Provider>
  );
}
