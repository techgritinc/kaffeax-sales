export type Step = 'capture' | 'review' | 'commit';

export type WorkflowStatus = 'idle' | 'processing' | 'error';

export type ToastTone = 'success' | 'reject' | 'info';

export interface Toast {
  message: string;
  tone: ToastTone;
}

export type ChatRole = 'user' | 'ai';

export type ChatMessageKind = 'answer' | 'refusal' | 'failure';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
  pending?: boolean;
  kind?: ChatMessageKind;
}
