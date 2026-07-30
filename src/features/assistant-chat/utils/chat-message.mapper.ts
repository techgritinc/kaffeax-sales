import type { StoredChatExchange } from '@/types/chat.types';
import type { ChatMessage } from '@/types/workflow.types';

/**
 * Expand stored exchanges into the panel's message bubbles.
 *
 * One exchange becomes two messages. Ids derive from the exchange id so React
 * keys stay stable across re-renders without a client-side counter.
 */
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
