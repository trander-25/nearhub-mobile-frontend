export type ChatMessageRole = 'user' | 'assistant';

export interface ChatMessageItem {
  id: string;
  role: ChatMessageRole;
  content: string;
  createdAt: string;
}

export interface SendChatMessageRequest {
  sessionId: string;
  message: string;
  eventId?: string | null;
}

export interface SendChatMessageResponse {
  sessionId: string;
  eventId: string | null;
  message: string;
  createdAt: string;
}
