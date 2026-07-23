'use client';

import { type ReactNode, useState } from 'react';

import { SCORE_BY_BAND } from '@/constants/bands';
import { SIDEBAR_OPEN_MIN_WIDTH } from '@/constants/workflow';
import {
  createRubricSignal,
  deleteRubricSignal,
  updateRubricSignal,
} from '@/features/workflow/actions/rubric.actions';
import { persist } from '@/features/workflow/utils/persist';
import type { MeetingRecord } from '@/types/meeting.types';
import type { Rubric, RubricSignal, Weight } from '@/types/rubric.types';
import type { AuditEntry, CrmRecord, Step, Toast, WorkflowStatus } from '@/types/workflow.types';

import { useWorkflowActions } from './use-workflow-actions';
import { WorkflowContext, type WorkflowContextValue } from './workflow-context';

export interface WorkflowProviderProps {
  children: ReactNode;
  initialLibrary: MeetingRecord[];
  initialRubric: Rubric;
  initialSample: string;
}

/** Owns all shared workflow state and exposes it via {@link WorkflowContext}. */
export function WorkflowProvider({
  children,
  initialLibrary,
  initialRubric,
  initialSample,
}: WorkflowProviderProps) {
  const [transcript, setTranscript] = useState<string>(initialSample);
  const [rubric, setRubric] = useState<Rubric>(initialRubric);
  const [status, setStatus] = useState<WorkflowStatus>('idle');
  const [draft, setDraft] = useState<MeetingRecord | null>(null);
  const [error, setError] = useState<string>('');
  const [crm, setCrm] = useState<CrmRecord[]>(() =>
    initialLibrary
      .filter((r) => r.committed)
      .map((r) => ({
        id: r.id,
        contact: r.contact,
        band: r.band,
        rationale: r.lead_score.rationale,
        recap: r.recap_email,
        nextSteps: r.summary.next_steps,
        at: new Date(),
      })),
  );
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [library, setLibrary] = useState<MeetingRecord[]>(() => initialLibrary);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [step, setStep] = useState<Step>('capture');
  const [procTick, setProcTick] = useState<number>(0);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() =>
    typeof window === 'undefined' ? true : window.innerWidth > SIDEBAR_OPEN_MIN_WIDTH,
  );
  const [rubricOpen, setRubricOpen] = useState<boolean>(false);
  const [chatOpen, setChatOpen] = useState<boolean>(true);

  const addSignal = (label: string, weight: Weight) => {
    const signal: RubricSignal = {
      id: `custom_${Date.now()}`,
      label,
      weight,
      source: 'proposed',
      hints: [],
    };
    setRubric((r) => ({ ...r, signals: [...r.signals, signal] }));
    persist('addSignal', createRubricSignal(signal));
  };
  const updateSignal = (id: string, patch: Partial<RubricSignal>) => {
    setRubric((r) => ({
      ...r,
      signals: r.signals.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }));
    persist('updateSignal', updateRubricSignal(id, patch));
  };
  const removeSignal = (id: string) => {
    setRubric((r) => ({ ...r, signals: r.signals.filter((s) => s.id !== id) }));
    persist('removeSignal', deleteRubricSignal(id));
  };

  // --- Derived selectors (recomputed each render) ---
  const activeRecord = library.find((r) => r.id === activeId) ?? null;
  const isCommitted = !!activeRecord?.committed;
  const score = draft ? SCORE_BY_BAND[draft.lead_score.band] : 0;
  const emailMissing = !draft?.contact.email.value.trim();
  const trimmedTranscript = transcript.trim();
  const wordCount = trimmedTranscript ? trimmedTranscript.split(/\s+/).length : 0;

  const actions = useWorkflowActions({
    transcript,
    rubric,
    draft,
    activeId,
    isCommitted,
    sample: initialSample,
    initialLibrary,
    setTranscript,
    setStatus,
    setDraft,
    setError,
    setCrm,
    setAudit,
    setLibrary,
    setActiveId,
    setToast,
    setStep,
    setProcTick,
  });

  const value: WorkflowContextValue = {
    transcript,
    rubric,
    status,
    draft,
    error,
    crm,
    audit,
    library,
    activeId,
    toast,
    step,
    procTick,
    sidebarOpen,
    rubricOpen,
    chatOpen,
    activeRecord,
    isCommitted,
    score,
    emailMissing,
    wordCount,
    setSidebarOpen,
    setRubricOpen,
    setChatOpen,
    addSignal,
    updateSignal,
    removeSignal,
    ...actions,
  };

  return <WorkflowContext.Provider value={value}>{children}</WorkflowContext.Provider>;
}
