import { createContext, useContext } from 'react';

import type { MeetingRecord } from '@/types/meeting.types';
import type { AiProcessingStatus } from '@/types/transcript.types';
import type { Step, Toast, ToastTone, WorkflowStatus } from '@/types/workflow.types';
import type { ProcessingStage } from '@/types/workflow/processing.types';

/** The capture-session workflow state, derived selectors, and dispatchable actions. */
export interface WorkflowContextValue {
  // --- State ---
  transcript: string;
  status: WorkflowStatus;
  draft: MeetingRecord | null;
  error: string;
  activeId: string | null;
  toast: Toast | null;
  step: Step;
  procStage: ProcessingStage;
  sidebarOpen: boolean;
  rubricOpen: boolean;
  chatOpen: boolean;
  isCommitting: boolean;

  /** The active draft's own generation status, sourced from the recents list (covers a still-running "Run in background" generation). */
  activeAiProcessingStatus?: AiProcessingStatus;

  // --- Derived (computed in render) ---
  isCommitted: boolean;
  score: number;
  emailMissing: boolean;
  wordCount: number;

  // --- Actions ---
  setTranscript: (text: string) => void;
  loadSample: () => void;
  handleFile: (file: File) => void;
  patch: (path: string, value: unknown) => void;
  goTo: (step: Step) => void;
  newCapture: () => void;
  notify: (message: string, tone?: ToastTone) => void;
  openFromRecent: (id: string) => Promise<void>;
  summarize: () => Promise<void>;
  summarizeInBackground: () => void;
  approve: () => Promise<void>;
  reject: () => Promise<void>;
  setSidebarOpen: (open: boolean) => void;
  setRubricOpen: (open: boolean) => void;
  setChatOpen: (open: boolean) => void;
}

/** The workflow context — `null` until a `WorkflowProvider` supplies a value. */
export const WorkflowContext = createContext<WorkflowContextValue | null>(null);

/** Access the shared workflow state; throws when used outside the provider. */
export function useWorkflow(): WorkflowContextValue {
  const ctx = useContext(WorkflowContext);
  if (ctx === null) {
    throw new Error('useWorkflow must be used within a WorkflowProvider');
  }
  return ctx;
}
