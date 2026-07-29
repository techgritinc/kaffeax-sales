'use client';

import { useEffect, useRef } from 'react';

import { TOAST_DURATION_MS } from '@/constants/workflow';
import { getTranscriptById } from '@/features/workflow/actions/transcript.actions';
import type { MeetingRecord } from '@/types/meeting.types';
import type { Step, ToastTone } from '@/types/workflow.types';

import type { WorkflowActionDeps } from '../types/workflow-action-deps.types';
import { runApprove, runReject, runSummarize } from './workflow-actions.utils';

export type { WorkflowActionDeps } from '../types/workflow-action-deps.types';

export function useWorkflowActions(deps: WorkflowActionDeps) {
  const {
    draft,
    isCommitted,
    sample,
    setTranscript,
    setDraft,
    setError,
    setActiveId,
    setToast,
    setStep,
    setStatus,
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

  function patch(path: string, value: unknown) {
    setDraft((d: MeetingRecord | null) => {
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

  function goTo(target: Step) {
    const gated = !draft || draft.aiProcessingStatus !== 'success';
    if (target === 'review' && gated) return;
    if (target === 'commit' && (gated || !isCommitted)) return;
    setStep(target);
  }

  async function openFromRecent(id: string) {
    try {
      const record = await getTranscriptById(id);
      if (!record) {
        notify('That summary could not be found.', 'reject');
        return;
      }
      setDraft(record);
      setActiveId(record.id);
      setError('');
      setStep(record.aiProcessingStatus === 'success' ? 'review' : 'capture');
    } catch (err) {
      console.error('[useWorkflowActions] openFromRecent failed', err);
      notify('Unable to load that summary. Please try again.', 'reject');
    }
  }

  function newCapture() {
    setTranscript('');
    setDraft(null);
    setActiveId(null);
    setStatus('idle');
    setError('');
    setStep('capture');
  }

  return {
    setTranscript: setTranscriptSafe,
    loadSample,
    handleFile,
    patch,
    goTo,
    newCapture,
    notify,
    openFromRecent,
    summarize: () => runSummarize(deps),
    approve: () => runApprove(deps, notify),
    reject: () => runReject(deps, notify),
  };
}
