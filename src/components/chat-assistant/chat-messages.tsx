'use client';

import { Avatar } from '@/components/ui/avatar/avatar';
import { useAutoScroll } from '@/hooks/chat-assistant/use-auto-scroll';
import { cn } from '@/lib/utils/cn';
import type { ChatMessage } from '@/types/workflow.types';

import { SuggestedQuestions } from './suggested-questions';

export interface ChatMessagesProps {
  messages: ChatMessage[];
  pending: boolean;
  restoring?: boolean;
  /** This meeting's generated chips — three, or empty when it has none. */
  suggestedQuestions: string[];
  onSend: (msg: string) => void;
}

const AI_BUBBLE =
  'bg-white border border-border rounded-[2px_12px_12px_12px] p-[12px_14px] text-[13px] leading-[1.55] flex-1 min-w-0';

/** AI chat avatar (`.kx-chat-avatar` 707–714), reused by messages + pending row. */
function AiAvatar() {
  return <Avatar variant="image" src="/icons/favicon.png" alt="Kaffea-X" size={32} />;
}

/** Scrollable message list with inline suggested chips and pending row (2701–2738). */
export function ChatMessages({
  messages,
  pending,
  restoring = false,
  suggestedQuestions,
  onSend,
}: ChatMessagesProps) {
  const scrollRef = useAutoScroll<HTMLDivElement>([messages, pending, restoring]);

  return (
    <div
      ref={scrollRef}
      className="flex flex-1 [scrollbar-width:none] flex-col overflow-y-auto [&::-webkit-scrollbar]:hidden"
    >
      {messages.map((m, i) => (
        <div key={m.id} className="contents">
          {m.role === 'ai' ? (
            <div className="mb-3.5 flex items-start gap-2.5">
              <AiAvatar />
              {/* Answers and refusals are indistinguishable — a refusal is the
                  assistant working correctly. Only a failure is set apart. */}
              <div className={cn(AI_BUBBLE, m.kind === 'failure' ? 'text-muted' : 'text-text')}>
                {m.text}
              </div>
            </div>
          ) : (
            <div className="mb-3.5 flex justify-end">
              <div className="bg-midnight max-bp900:max-w-[82%] max-w-[85%] rounded-[12px_2px_12px_12px] p-[10px_14px] text-[13px] leading-[1.55] text-white">
                {m.text}
              </div>
            </div>
          )}
          {/* Attached to the opening bubble only — a restored conversation starts
              with a user message, so it is never topped with a fresh chip row. */}
          {i === 0 && m.role === 'ai' && (
            <SuggestedQuestions questions={suggestedQuestions} onSelect={onSend} />
          )}
        </div>
      ))}
      {restoring && (
        <div className="mb-3.5 flex items-start gap-2.5">
          <AiAvatar />
          <div className={cn(AI_BUBBLE, 'text-muted italic')}>Loading earlier questions…</div>
        </div>
      )}
      {pending && (
        <div className="mb-3.5 flex items-start gap-2.5">
          <AiAvatar />
          <div className={cn(AI_BUBBLE, 'text-muted italic')}>Thinking…</div>
        </div>
      )}
    </div>
  );
}
