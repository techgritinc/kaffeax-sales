'use client';

import { type ReactNode, useState } from 'react';

import { SIDEBAR_OPEN_MIN_WIDTH } from '@/constants/workflow';
import { useWorkflowActions } from '@/features/workflow/hooks/use-workflow-actions';
import { useRecents } from '@/providers/recents/recents-context';
import { useRubricSignals } from '@/providers/rubric-signals/rubric-signals-context';
import type { MeetingRecord } from '@/types/meeting.types';
import type { Step, Toast, WorkflowStatus } from '@/types/workflow.types';

import { WorkflowContext, type WorkflowContextValue } from './workflow-context';

export interface WorkflowProviderProps {
  children: ReactNode;
  initialSample: string;
}

/** Owns the capture-session state and exposes it via {@link WorkflowContext}. */
export function WorkflowProvider({ children, initialSample }: WorkflowProviderProps) {
  const { signals } = useRubricSignals();
  const { prependRecent, updateRecent, refreshRecents } = useRecents();

  const [transcript, setTranscript] = useState<string>(initialSample);
  const [status, setStatus] = useState<WorkflowStatus>('idle');
  const [draft, setDraft] = useState<MeetingRecord | null>(null);
  const [error, setError] = useState<string>('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [step, setStep] = useState<Step>('capture');
  const [procTick, setProcTick] = useState<number>(0);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() =>
    typeof window === 'undefined' ? true : window.innerWidth > SIDEBAR_OPEN_MIN_WIDTH,
  );
  const [rubricOpen, setRubricOpen] = useState<boolean>(false);
  const [chatOpen, setChatOpen] = useState<boolean>(true);

  // --- Derived selectors (recomputed each render) ---
  const isCommitted = !!draft?.committed;
  const score = draft ? draft.leadScore.scorePercentage : 0;
  const emailMissing = !draft?.contact.email.value.trim();
  const trimmedTranscript = transcript.trim();
  const wordCount = trimmedTranscript ? trimmedTranscript.split(/\s+/).length : 0;

  const actions = useWorkflowActions({
    transcript,
    draft,
    activeId,
    isCommitted,
    sample: initialSample,
    signals,
    prependRecent,
    updateRecent,
    refreshRecents,
    setTranscript,
    setStatus,
    setDraft,
    setError,
    setActiveId,
    setToast,
    setStep,
    setProcTick,
  });

  const value: WorkflowContextValue = {
    transcript,
    status,
    draft,
    error,
    activeId,
    toast,
    step,
    procTick,
    sidebarOpen,
    rubricOpen,
    chatOpen,
    isCommitted,
    score,
    emailMissing,
    wordCount,
    setSidebarOpen,
    setRubricOpen,
    setChatOpen,
    ...actions,
  };

  return <WorkflowContext.Provider value={value}>{children}</WorkflowContext.Provider>;
}
