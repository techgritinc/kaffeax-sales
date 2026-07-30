'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { CHAT_ERROR_MESSAGES, CHAT_RESTORE_ERROR } from '@/constants/grounded-chat';
import type { ChatMessage } from '@/types/workflow.types';

import { askAboutMeeting, getMeetingConversation } from '../actions/meeting-chat.actions';
import { toChatMessages } from '../utils/chat-message.mapper';

export interface UseMeetingChatOptions {
  /** The meeting the panel is currently showing, or null when none is open. */
  transcriptId: string | null;
  /** Greeting seeded as the first bubble when the conversation is empty. */
  openingMessage: string;
}

export interface UseMeetingChatResult {
  messages: ChatMessage[];
  pending: boolean;
  /** True while a meeting's stored conversation is being loaded. */
  restoring: boolean;
  send: (question: string) => void;
}

/**
 * Owns the panel's conversation state for one meeting.
 *
 * A monotonic generation counter guards every async result: it is bumped on each
 * send and whenever the open meeting changes, and a resolved response is only
 * applied while its generation still matches. An AbortController alone would not
 * be enough — a server action that has already completed can still resolve into a
 * component whose meeting changed underneath it, so the guard has to sit on the
 * apply side. A plain id comparison would not be enough either: switching away
 * and back would let a stale response through.
 */
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

  // Held in a ref so that editing the meeting title in the review screen — which
  // changes the greeting text — cannot reset a conversation in progress. Only the
  // open meeting changing should do that.
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

  // Adjusting state during render when a prop changes, rather than in an effect:
  // the panel never paints one meeting's messages under another meeting's header
  // (FR-013), and there is no cascading re-render.
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
        // The greeting is seeded only for an empty conversation — a restored one
        // must not be topped by a fresh greeting, and keeping it inside the
        // message array is what lets the suggested chips keep attaching to
        // bubble zero exactly as they do today.
        setMessages(restored.length > 0 ? restored : [openingBubble()]);
      })
      .catch((error: unknown) => {
        if (gen !== generation.current) return;
        console.error('[useMeetingChat] restore failed', error);
        // A failed restore must not block asking new questions.
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
