import type { Contact, NextStep, RecapEmail } from './meeting.types';
import type { Band } from './rubric.types';

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

/** Audit outcome recorded on approve / update / reject. */
export type Outcome = 'written' | 'updated' | 'rejected';

/** A committed CRM activity record. */
export interface CrmRecord {
  id: string;
  contact: Contact;
  band: Band;
  rationale: string;
  recap: RecapEmail;
  nextSteps: NextStep[];
  at: Date;
}

/** A single entry in the audit log. */
export interface AuditEntry {
  id: string;
  model: string;
  reviewer: string;
  rubric: string;
  outcome: Outcome;
  target: string;
  at: Date;
}

export type ChatRole = 'user' | 'ai';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
  pending?: boolean;
}
