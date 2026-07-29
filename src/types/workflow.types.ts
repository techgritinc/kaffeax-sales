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

export interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
  pending?: boolean;
}
