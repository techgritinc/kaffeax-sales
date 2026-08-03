import type { StoredChatExchange } from '@/types/chat.types';
import type { ChatMessage } from '@/types/workflow.types';

export function toChatMessages(exchanges: StoredChatExchange[]): ChatMessage[] {
  return exchanges.flatMap((exchange): ChatMessage[] => [
    { id: `${exchange.id}-q`, role: 'user', text: exchange.fields.question },
    {
      id: `${exchange.id}-a`,
      role: 'ai',
      text: exchange.fields.answer,
      kind: exchange.fields.kind,
    },
  ]);
}
