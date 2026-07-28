import { createContext, useContext } from 'react';

import type { MeetingRecord } from '@/types/meeting.types';
import type { Rubric, RubricSignal, Weight } from '@/types/rubric.types';
import type {
  AuditEntry,
  CrmRecord,
  Step,
  Toast,
  ToastTone,
  WorkflowStatus,
} from '@/types/workflow.types';

/** The full shared workflow state, derived selectors, and dispatchable actions. */
export interface WorkflowContextValue {
  // --- State ---
  transcript: string;
  rubric: Rubric;
  status: WorkflowStatus;
  draft: MeetingRecord | null;
  error: string;
  crm: CrmRecord[];
  audit: AuditEntry[];
  library: MeetingRecord[];
  activeId: string | null;
  toast: Toast | null;
  step: Step;
  procTick: number;
  sidebarOpen: boolean;
  rubricOpen: boolean;
  chatOpen: boolean;

  // --- Derived (computed in render) ---
  activeRecord: MeetingRecord | null;
  isCommitted: boolean;
  score: number;
  emailMissing: boolean;
  wordCount: number;

  // --- Actions ---
  setTranscript: (text: string) => void;
  loadSample: () => void;
  handleFile: (file: File) => void;
  process: () => void;
  patch: (path: string, value: unknown) => void;
  approve: () => void;
  reject: () => void;
  goTo: (step: Step) => void;
  resetDemo: () => void;
  newCapture: () => void;
  notify: (message: string, tone?: ToastTone) => void;
  openFromLibrary: (record: MeetingRecord) => void;
  setSidebarOpen: (open: boolean) => void;
  setRubricOpen: (open: boolean) => void;
  setChatOpen: (open: boolean) => void;
  addSignal: (label: string, weight: Weight) => void;
  updateSignal: (id: string, patch: Partial<RubricSignal>) => void;
  removeSignal: (id: string) => void;
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
