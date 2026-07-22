'use client';

import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils/cn';
import type { ChatMessage } from '@/types/workflow.types';

import { useAutoScroll } from '../hooks/use-auto-scroll';

export interface ChatMessagesProps {
  messages: ChatMessage[];
  pending: boolean;
  onSend: (msg: string) => void;
}

const CHIPS = [
  'What pricing did they mention?',
  'Any competitor references?',
  'Summarize next steps',
] as const;

const AI_BUBBLE =
  'bg-white border border-border rounded-[2px_12px_12px_12px] p-[12px_14px] text-[13px] leading-[1.55] flex-1 min-w-0';

/** AI chat avatar (`.kx-chat-avatar` 707–714), reused by messages + pending row. */
function AiAvatar() {
  return <Avatar variant="image" src="/icons/favicon.png" alt="Kaffea-X" size={32} />;
}

/** Scrollable message list with inline suggested chips and pending row (2701–2738). */
export function ChatMessages({ messages, pending, onSend }: ChatMessagesProps) {
  const scrollRef = useAutoScroll<HTMLDivElement>([messages, pending]);

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
              <div className={cn(AI_BUBBLE, 'text-text')}>{m.text}</div>
            </div>
          ) : (
            <div className="mb-3.5 flex justify-end">
              <div className="bg-midnight max-w-[85%] rounded-[12px_2px_12px_12px] p-[10px_14px] text-[13px] leading-[1.55] text-white">
                {m.text}
              </div>
            </div>
          )}
          {i === 0 && m.role === 'ai' && (
            <>
              <div className="text-muted mb-1.5 ml-[42px] text-[9.5px] font-extrabold tracking-[0.12em] uppercase">
                Suggested
              </div>
              <div className="mb-3.5 ml-[42px] flex flex-wrap gap-1.5">
                {CHIPS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className="rounded-pill border-tan text-midnight hover:border-green hover:bg-green/[0.10] hover:text-green-deep border bg-white/[0.72] px-3 py-1.5 text-[11.5px] font-semibold"
                    onClick={() => onSend(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      ))}
      {pending && (
        <div className="mb-3.5 flex items-start gap-2.5">
          <AiAvatar />
          <div className={cn(AI_BUBBLE, 'text-muted italic')}>Thinking…</div>
        </div>
      )}
    </div>
  );
}
