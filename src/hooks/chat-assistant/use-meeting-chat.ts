'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { CHAT_ERROR_MESSAGES, CHAT_RESTORE_ERROR } from '@/constants/grounded-chat';
import { toChatMessages } from '@/lib/utils/chat-assistant/chat-message.mapper';
import {
  askAboutMeeting,
  getMeetingConversation,
} from '@/server-actions/chat-assistant/meeting-chat.actions';
import type { ChatMessage } from '@/types/workflow.types';

export interface UseMeetingChatOptions {
  transcriptId: string | null;
  openingMessage: string;
}

export interface UseMeetingChatResult {
  messages: ChatMessage[];
  pending: boolean;
  restoring: boolean;
  send: (question: string) => void;
}

export function useMeetingChat({
  transcriptId,
  openingMessage,
}: UseMeetingChatOptions): UseMeetingChatResult {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pending, setPending] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [shownMeeting, setShownMeeting] = useState<string | null>(transcriptId);
  const generation = useRef(0);
  const nextId = useRef(0);

  const openingRef = useRef(openingMessage);
  useEffect(() => {
    openingRef.current = openingMessage;
  }, [openingMessage]);

  const makeId = useCallback((prefix: string) => {
    nextId.current += 1;
    return `${prefix}${nextId.current}`;
  }, []);

  const openingBubble = useCallback(
    (): ChatMessage => ({ id: 'opening', role: 'ai', text: openingRef.current }),
    [],
  );

  if (shownMeeting !== transcriptId) {
    setShownMeeting(transcriptId);
    setMessages([]);
    setPending(false);
    setRestoring(transcriptId !== null);
  }

  useEffect(() => {
    generation.current += 1;
    const gen = generation.current;
    if (transcriptId === null) return;

    void getMeetingConversation(transcriptId)
      .then((exchanges) => {
        if (gen !== generation.current) return;
        const restored = toChatMessages(exchanges);
        setMessages(restored.length > 0 ? restored : [openingBubble()]);
      })
      .catch((error: unknown) => {
        if (gen !== generation.current) return;
        console.error('[useMeetingChat] restore failed', error);
        setMessages([
          openingBubble(),
          { id: 'restore-error', role: 'ai', text: CHAT_RESTORE_ERROR, kind: 'failure' },
        ]);
      })
      .finally(() => {
        if (gen === generation.current) setRestoring(false);
      });
  }, [openingBubble, transcriptId]);

  const send = useCallback(
    (raw: string) => {
      const question = raw.trim();
      if (!question || pending || transcriptId === null) return;

      generation.current += 1;
      const gen = generation.current;
      setMessages((current) => [...current, { id: makeId('q'), role: 'user', text: question }]);
      setPending(true);

      void askAboutMeeting({ transcriptId, question })
        .then((result) => {
          if (gen !== generation.current) return; // meeting changed — discard (FR-017)
          setMessages((current) => [
            ...current,
            result.success
              ? { id: makeId('a'), role: 'ai', text: result.answer, kind: result.kind }
              : { id: makeId('a'), role: 'ai', text: result.message, kind: 'failure' },
          ]);
        })
        .catch((error: unknown) => {
          if (gen !== generation.current) return;
          console.error('[useMeetingChat] question failed', error);
          setMessages((current) => [
            ...current,
            { id: makeId('a'), role: 'ai', text: CHAT_ERROR_MESSAGES.api_error, kind: 'failure' },
          ]);
        })
        .finally(() => {
          if (gen === generation.current) setPending(false);
        });
    },
    [makeId, pending, transcriptId],
  );

  return { messages, pending, restoring, send };
}
