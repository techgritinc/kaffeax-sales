'use client';

import { type ReactNode, useEffect, useRef, useState } from 'react';

import { BACKGROUND_POLL_INTERVAL_MS, SIDEBAR_OPEN_MIN_WIDTH } from '@/constants/workflow';
import { RECENTS_PAGE_SIZE } from '@/constants/workflow/recents.constants';
import { useWorkflowActions } from '@/hooks/workflow/use-workflow-actions';
import { toRecentItem } from '@/lib/utils/workflow/transcript.mapper';
import { useRecents } from '@/providers/recents/recents-context';
import { useRubricSignals } from '@/providers/rubric-signals/rubric-signals-context';
import { getTranscriptPage } from '@/server-actions/workflow/transcript.actions';
import type { MeetingRecord } from '@/types/meeting.types';
import type { Step, Toast, WorkflowStatus } from '@/types/workflow.types';
import type { ProcessingStage } from '@/types/workflow/processing.types';

import { WorkflowContext, type WorkflowContextValue } from './workflow-context';

export interface WorkflowProviderProps {
  children: ReactNode;
  initialSample: string;
}

/** Owns the capture-session state and exposes it via {@link WorkflowContext}. */
export function WorkflowProvider({ children, initialSample }: WorkflowProviderProps) {
  const { signals } = useRubricSignals();
  const { recents, prependRecent, updateRecent, refreshRecents } = useRecents();

  const [transcript, setTranscript] = useState<string>('');
  const [status, setStatus] = useState<WorkflowStatus>('idle');
  const [draft, setDraft] = useState<MeetingRecord | null>(null);
  const [error, setError] = useState<string>('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [step, setStep] = useState<Step>('capture');
  const [procStage, setProcStage] = useState<ProcessingStage>('idle');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() =>
    typeof window === 'undefined' ? true : window.innerWidth > SIDEBAR_OPEN_MIN_WIDTH,
  );
  const [rubricOpen, setRubricOpen] = useState<boolean>(false);
  const [chatOpen, setChatOpen] = useState<boolean>(true);
  const [isCommitting, setIsCommitting] = useState<boolean>(false);

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
    setProcStage,
    setIsCommitting,
  });

  const recentsRef = useRef<typeof recents>(recents);
  useEffect(() => {
    recentsRef.current = recents;
  });

  const hasProcessing = recents.some((r) => r.aiProcessingStatus === 'processing');
  useEffect(() => {
    if (!hasProcessing) return;
    const pollId = setInterval(() => {
      void (async () => {
        try {
          const result = await getTranscriptPage(1, RECENTS_PAGE_SIZE);
          const freshItems = result.items.map(toRecentItem);
          for (const fresh of freshItems) {
            const prev = recentsRef.current.find((r) => r.id === fresh.id);
            if (
              prev?.aiProcessingStatus === 'processing' &&
              fresh.aiProcessingStatus === 'success'
            ) {
              actions.notify('Summary generation is successful', 'success');
            }
            if (prev && prev.aiProcessingStatus !== fresh.aiProcessingStatus) {
              updateRecent(fresh.id, {
                aiProcessingStatus: fresh.aiProcessingStatus,
                title: fresh.title,
                badge: fresh.badge,
              });
            }
          }
        } catch (err) {
          console.error('[WorkflowProvider] background poll failed', err);
        }
      })();
    }, BACKGROUND_POLL_INTERVAL_MS);
    return () => clearInterval(pollId);
  }, [hasProcessing]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeAiProcessingStatus = activeId
    ? recents.find((r) => r.id === activeId)?.aiProcessingStatus
    : undefined;

  const value: WorkflowContextValue = {
    transcript,
    status,
    draft,
    error,
    activeId,
    toast,
    step,
    procStage,
    sidebarOpen,
    rubricOpen,
    chatOpen,
    isCommitting,
    activeAiProcessingStatus,
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
