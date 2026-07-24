'use client';

import { useCallback, useRef, useState } from 'react';

import { Icon } from '@/components/ui/icon/icon';
import type { ChatMessage } from '@/types/workflow.types';

import { cannedResponse } from '../hooks/use-canned-response';
import { ChatMessages } from './chat-messages';

export interface ChatPanelProps {
  context: { company: string; signals: string };
  onClose: () => void;
}

export function ChatPanel({ context, onClose }: ChatPanelProps) {
  const idRef = useRef(1);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'm0',
      role: 'ai',
      text: `I've analyzed the meeting. ${context.company || 'This lead'} shows ${context.signals || 'distribution and pricing-transparency signals'}. What would you like to know?`,
    },
  ]);
  const [text, setText] = useState('');
  const [pending, setPending] = useState(false);

  const send = useCallback(
    (msg?: string) => {
      const q = (msg ?? text).trim();
      if (!q || pending) return;
      const userId = `m${idRef.current++}`;
      setMessages((m) => [...m, { id: userId, role: 'user', text: q }]);
      setText('');
      setPending(true);
      window.setTimeout(() => {
        const aiId = `m${idRef.current++}`;
        setMessages((m) => [...m, { id: aiId, role: 'ai', text: cannedResponse(q) }]);
        setPending(false);
      }, 600);
    },
    [text, pending],
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

      <ChatMessages messages={messages} pending={pending} onSend={send} />

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
