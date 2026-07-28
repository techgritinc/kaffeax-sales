'use client';

import { type Dispatch, type SetStateAction, useEffect, useRef } from 'react';

import {
  AUDIT_MODEL,
  AUDIT_REVIEWER,
  AUDIT_RUBRIC_VERSION,
  AUDIT_TARGET,
  AUDIT_TARGET_NONE,
  CRM_ID_PREFIX,
  DRAFT_ID_PREFIX,
  PROC_TICK_MS,
  REJECT_ID_PREFIX,
  TOAST_DURATION_MS,
} from '@/constants/workflow';
import {
  createTranscript,
  deleteTranscript,
  resetTranscripts,
  updateTranscript,
} from '@/features/workflow/actions/transcript.actions';
import { persist } from '@/features/workflow/utils/persist';
import type { MeetingRecord } from '@/types/meeting.types';
import type { Rubric } from '@/types/rubric.types';
import type {
  AuditEntry,
  CrmRecord,
  Step,
  Toast,
  ToastTone,
  WorkflowStatus,
} from '@/types/workflow.types';

import { runProcessing } from './engine';

/** State values and setters the actions operate over. */
export interface WorkflowActionDeps {
  transcript: string;
  rubric: Rubric;
  draft: MeetingRecord | null;
  activeId: string | null;
  isCommitted: boolean;
  /** The default sample transcript (fetched on the server, injected by the provider). */
  sample: string;
  /** The server-fetched seed library, used to restore state on demo reset. */
  initialLibrary: MeetingRecord[];
  setTranscript: Dispatch<SetStateAction<string>>;
  setStatus: Dispatch<SetStateAction<WorkflowStatus>>;
  setDraft: Dispatch<SetStateAction<MeetingRecord | null>>;
  setError: Dispatch<SetStateAction<string>>;
  setCrm: Dispatch<SetStateAction<CrmRecord[]>>;
  setAudit: Dispatch<SetStateAction<AuditEntry[]>>;
  setLibrary: Dispatch<SetStateAction<MeetingRecord[]>>;
  setActiveId: Dispatch<SetStateAction<string | null>>;
  setToast: Dispatch<SetStateAction<Toast | null>>;
  setStep: Dispatch<SetStateAction<Step>>;
  setProcTick: Dispatch<SetStateAction<number>>;
}

const mintId = (prefix: string): string => `${prefix}-${String(Date.now()).slice(-6)}`;

const auditEntry = (id: string, outcome: AuditEntry['outcome'], target: string): AuditEntry => ({
  id,
  model: AUDIT_MODEL,
  reviewer: AUDIT_REVIEWER,
  rubric: AUDIT_RUBRIC_VERSION,
  outcome,
  target,
  at: new Date(),
});

const toCrmRecord = (record: MeetingRecord, id: string): CrmRecord => ({
  id,
  contact: record.contact,
  band: record.lead_score.band,
  rationale: record.lead_score.rationale,
  recap: record.recap_email,
  nextSteps: record.summary.next_steps,
  at: new Date(),
});

/** Build the workflow action set over the provider's state + setters. */
export function useWorkflowActions(deps: WorkflowActionDeps) {
  const {
    transcript,
    rubric,
    draft,
    activeId,
    isCommitted,
    sample,
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
  } = deps;

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );

  function notify(message: string, tone: ToastTone = 'success') {
    setToast({ message, tone });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), TOAST_DURATION_MS);
  }

  function setTranscriptSafe(text: string) {
    setTranscript(text);
    setError('');
  }

  function loadSample() {
    setTranscript(sample);
  }

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => setTranscript(String(reader.result ?? ''));
    reader.onerror = () => {
      setStatus('error');
      setError('Could not read the transcript file.');
    };
    reader.readAsText(file);
  }

  async function process() {
    setError('');
    setStatus('processing');
    setProcTick(0);
    const ticker = window.setInterval(() => setProcTick((t) => t + 1), PROC_TICK_MS);
    try {
      const r = await runProcessing(transcript, rubric);
      const draftId = mintId(DRAFT_ID_PREFIX);
      const draftRec: MeetingRecord = {
        ...r,
        id: draftId,
        committed: false,
        when: 'Just now',
        band: r.lead_score.band,
      };
      setLibrary((L) => [draftRec, ...L]);
      setDraft(draftRec);
      setActiveId(draftId);
      setStatus('idle');
      setStep('review');
      persist('process', createTranscript(draftRec));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not process the transcript.');
      setStatus('error');
    } finally {
      window.clearInterval(ticker);
    }
  }

  function patch(path: string, value: unknown) {
    setDraft((d) => {
      if (!d) return d;
      const next = structuredClone(d);
      let cursor = next as unknown as Record<string, unknown>;
      const keys = path.split('.');
      for (let i = 0; i < keys.length - 1; i++) {
        cursor = cursor[keys[i]] as Record<string, unknown>;
      }
      cursor[keys[keys.length - 1]] = value;
      return next;
    });
  }

  function approve() {
    if (!draft) return;
    if (isCommitted) {
      const zid = draft.id;
      const updated: MeetingRecord = {
        ...draft,
        id: zid,
        committed: true,
        when: 'Updated just now',
      };
      setCrm((c) => c.map((r) => (r.id === zid ? toCrmRecord(draft, zid) : r)));
      setLibrary((L) => L.map((r) => (r.id === zid ? updated : r)));
      setAudit((a) => [auditEntry(zid, 'updated', AUDIT_TARGET), ...a]);
      notify(`${zid} updated in Zoho sandbox`, 'success');
      persist('approve:update', updateTranscript(updated));
      return;
    }
    const zid = mintId(CRM_ID_PREFIX);
    const committed: MeetingRecord = {
      ...draft,
      id: zid,
      committed: true,
      when: 'Committed just now',
      band: draft.lead_score.band,
    };
    const draftId = activeId;
    setCrm((c) => [toCrmRecord(draft, zid), ...c]);
    setAudit((a) => [auditEntry(zid, 'written', AUDIT_TARGET), ...a]);
    setLibrary((L) => [committed, ...L.filter((r) => r.id !== activeId)]);
    setDraft(committed);
    setActiveId(zid);
    setStatus('idle');
    setStep('commit');
    notify(`${zid} written to Zoho sandbox`, 'success');
    persist('approve:create', createTranscript(committed));
    if (draftId && draftId !== zid) persist('approve:deleteDraft', deleteTranscript(draftId));
  }

  function reject() {
    const rid = mintId(REJECT_ID_PREFIX);
    const rejectedId = activeId;
    setAudit((a) => [auditEntry(rid, 'rejected', AUDIT_TARGET_NONE), ...a]);
    setLibrary((L) => L.filter((r) => r.id !== activeId));
    setDraft(null);
    setActiveId(null);
    setStatus('idle');
    setStep('capture');
    notify('Draft rejected · no CRM write · logged internally', 'reject');
    if (rejectedId) persist('reject', deleteTranscript(rejectedId));
  }

  function goTo(target: Step) {
    if (target === 'review' && !draft) return;
    if (target === 'commit' && !isCommitted) return;
    setStep(target);
  }

  function resetDemo() {
    setTranscript(sample);
    setStatus('idle');
    setDraft(null);
    setError('');
    setCrm([]);
    setAudit([]);
    setLibrary(initialLibrary);
    setActiveId(null);
    setStep('capture');
    notify('Demo reset', 'info');
    persist('resetDemo', resetTranscripts());
  }

  function newCapture() {
    setTranscript('');
    setDraft(null);
    setActiveId(null);
    setStatus('idle');
    setError('');
    setStep('capture');
  }

  function openFromLibrary(record: MeetingRecord) {
    setDraft(record);
    setActiveId(record.id);
    setStep('review');
    setStatus('idle');
    setError('');
  }

  return {
    setTranscript: setTranscriptSafe,
    loadSample,
    handleFile,
    process,
    patch,
    approve,
    reject,
    goTo,
    resetDemo,
    newCapture,
    notify,
    openFromLibrary,
  };
}
