import type { Dispatch, SetStateAction } from 'react';

import type { RecentItem } from '@/providers/recents/recents-context';
import type { MeetingRecord } from '@/types/meeting.types';
import type { RubricSignal } from '@/types/rubric.types';
import type { Step, Toast, ToastTone, WorkflowStatus } from '@/types/workflow.types';

export type NotifyFn = (message: string, tone?: ToastTone) => void;

/** State values and setters the workflow actions operate over. */
export interface WorkflowActionDeps {
  transcript: string;
  draft: MeetingRecord | null;
  activeId: string | null;
  isCommitted: boolean;
  sample: string;
  signals: RubricSignal[];
  prependRecent: (item: RecentItem) => void;
  updateRecent: (id: string, patch: Partial<RecentItem>) => void;
  refreshRecents: () => Promise<void>;
  setTranscript: Dispatch<SetStateAction<string>>;
  setStatus: Dispatch<SetStateAction<WorkflowStatus>>;
  setDraft: Dispatch<SetStateAction<MeetingRecord | null>>;
  setError: Dispatch<SetStateAction<string>>;
  setActiveId: Dispatch<SetStateAction<string | null>>;
  setToast: Dispatch<SetStateAction<Toast | null>>;
  setStep: Dispatch<SetStateAction<Step>>;
  setProcTick: Dispatch<SetStateAction<number>>;
}
