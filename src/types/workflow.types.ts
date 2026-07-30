/** The three linear workflow steps. */
export type Step = 'capture' | 'review' | 'commit';

/** Processing status for the capture → dossier transition. */
export type WorkflowStatus = 'idle' | 'processing' | 'error';

/** Toast visual tone. */
export type ToastTone = 'success' | 'reject' | 'info';

export interface Toast {
  message: string;
  tone: ToastTone;
}

export type ChatRole = 'user' | 'ai';

/**
 * How an AI chat bubble should read. Answers and refusals render identically —
 * a refusal is the assistant working correctly. Only `failure` is styled apart.
 * `failure` exists for the live session only; it is never persisted.
 */
export type ChatMessageKind = 'answer' | 'refusal' | 'failure';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
  pending?: boolean;
  kind?: ChatMessageKind;
}
