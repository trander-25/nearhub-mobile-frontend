import type { SendChatMessageRequest, SendChatMessageResponse } from '@/types';
import { apiRequest } from './apiClient';

export async function sendAiChatMessage(
  input: SendChatMessageRequest,
): Promise<SendChatMessageResponse> {
  return apiRequest<SendChatMessageResponse>('/realtime/chat/messages', {
    method: 'POST',
    requireAuth: true,
    body: input,
  });
}
