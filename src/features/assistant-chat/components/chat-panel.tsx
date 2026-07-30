'use client';

import { useCallback, useState } from 'react';

import { Icon } from '@/components/ui/icon/icon';

import { useMeetingChat } from '../hooks/use-meeting-chat';
import { ChatMessages } from './chat-messages';

export interface ChatPanelProps {
  /** The meeting the panel answers about, or null when none is open. */
  transcriptId: string | null;
  openingMessage: string;
  /** This meeting's generated chips. Static per meeting, so it stays out of the hook. */
  suggestedQuestions: string[];
  onClose: () => void;
}

export function ChatPanel({
  transcriptId,
  openingMessage,
  suggestedQuestions,
  onClose,
}: ChatPanelProps) {
  const {
    messages,
    pending,
    restoring,
    send: ask,
  } = useMeetingChat({
    transcriptId,
    openingMessage,
  });
  const [text, setText] = useState('');

  const send = useCallback(
    (msg?: string) => {
      const q = (msg ?? text).trim();
      if (!q || pending) return;
      ask(q);
      setText('');
    },
    [ask, pending, text],
  );

  return (
    <aside className="border-border from-chat-bg-start to-chat-bg-end max-bp900:fixed max-bp900:inset-x-0 max-bp900:top-[56px] max-bp900:bottom-0 max-bp900:z-50 max-bp900:h-auto max-bp900:animate-chat-slide-up max-bp900:border-l-0 max-bp900:p-[16px_16px_14px] flex h-full flex-col overflow-hidden border-l bg-linear-to-b p-[20px_18px]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-mustard max-bp900:mb-1 mb-[6px] font-sans text-[11px] font-extrabold tracking-[0.14em] uppercase">
            Follow-up
          </div>
          <div className="font-display text-midnight max-bp900:mb-1 max-bp900:text-[18px] mb-[6px] text-[20px] font-bold">
            Ask about this lead
          </div>
          <div className="bg-bright-blue mb-[16px] h-[6px] w-[72px] rounded-[2px]" />
        </div>
        <button
          type="button"
          className="border-border-strong text-muted hover:border-midnight hover:bg-page-bg hover:text-midnight max-bp900:h-[36px] max-bp900:w-[36px] max-bp900:rounded-[8px] max-bp900:border-border max-bp900:bg-white max-bp900:text-midnight inline-flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[6px] border p-0 transition-colors"
          onClick={onClose}
          title="Close chat"
          aria-label="Close chat"
        >
          <Icon name="X" size={14} />
        </button>
      </div>

      <ChatMessages
        messages={messages}
        pending={pending}
        restoring={restoring}
        suggestedQuestions={suggestedQuestions}
        onSend={send}
      />

      <div className="border-border-warm max-bp900:mt-[10px] max-bp900:pt-[10px] mt-[14px] flex gap-2 border-t pt-[12px]">
        <input
          type="text"
          className="border-border-warm focus:border-green max-bp900:px-[14px] max-bp900:py-[12px] max-bp900:text-[14px] flex-1 border bg-white px-3 py-[10px] text-[12.5px] outline-none"
          placeholder="Ask a follow-up question..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') send();
          }}
        />
        <button
          type="button"
          className="bg-midnight hover:bg-midnight-send-hover max-bp900:h-[44px] max-bp900:w-[44px] inline-flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[2px] text-white transition-colors"
          onClick={() => send()}
          title="Send"
        >
          <Icon name="Send" size={16} />
        </button>
      </div>
    </aside>
  );
}
