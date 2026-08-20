'use client';

import { useEffect, useRef } from 'react';

import mammoth from 'mammoth';

import {
  ACTIVE_FOREGROUND_GENERATION_KEY,
  MAX_TRANSCRIPT_FILE_SIZE_BYTES,
  TOAST_DURATION_MS,
  TRANSCRIPT_DOCX_EXTENSION,
  TRANSCRIPT_FILE_EXTENSIONS,
} from '@/constants/workflow';
import { cancelProcessing } from '@/server-actions/workflow/transcript-ai.actions';
import { getTranscriptById } from '@/server-actions/workflow/transcript.actions';
import type { MeetingRecord } from '@/types/meeting.types';
import type { Step, ToastTone } from '@/types/workflow.types';

import type { WorkflowActionDeps } from '../../types/workflow/workflow-action-deps.types';
import {
  abandonForegroundGeneration,
  runApprove,
  runReject,
  runSummarize,
} from './workflow-actions.utils';

export type { WorkflowActionDeps } from '../../types/workflow/workflow-action-deps.types';

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

  useEffect(() => {
    const id = sessionStorage.getItem(ACTIVE_FOREGROUND_GENERATION_KEY);
    if (!id) return;
    sessionStorage.removeItem(ACTIVE_FOREGROUND_GENERATION_KEY);
    void cancelProcessing(id);
  }, []);

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
    const extension = `.${file.name.split('.').pop()?.toLowerCase() ?? ''}`;

    if (
      !TRANSCRIPT_FILE_EXTENSIONS.includes(extension as (typeof TRANSCRIPT_FILE_EXTENSIONS)[number])
    ) {
      setStatus('error');
      setError(`Unsupported file type. Attach a ${TRANSCRIPT_FILE_EXTENSIONS.join(', ')} file.`);
      return;
    }

    if (file.size > MAX_TRANSCRIPT_FILE_SIZE_BYTES) {
      setStatus('error');
      setError('That file is too large. Attach a transcript under 10MB.');
      return;
    }

    if (extension === TRANSCRIPT_DOCX_EXTENSION) {
      setStatus('processing');
      file
        .arrayBuffer()
        .then((buffer) => mammoth.extractRawText({ arrayBuffer: buffer }))
        .then(({ value }) => {
          setTranscriptSafe(value.trim());
          setStatus('idle');
        })
        .catch((err: unknown) => {
          console.error('[useWorkflowActions] docx parse failed', err);
          setStatus('error');
          setError('Could not read that Word document. Make sure it is a valid .docx file.');
        });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setTranscript(String(reader.result ?? ''));
    reader.onerror = () => {
      setStatus('error');
      setError('Could not read the transcript file.');
    };
    reader.readAsText(file);
  }

  /** Client-side draft mutation — the prospect email is the only field the Review screen exposes for editing. */
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
      if (record.aiProcessingStatus !== 'success') {
        setTranscript(record.originalTranscript);
      }
      setStep(record.aiProcessingStatus === 'success' ? 'review' : 'capture');
      deps.updateRecent(id, {
        aiProcessingStatus: record.aiProcessingStatus,
        title: record.summary?.meetingTitle ?? undefined,
        badge:
          record.aiProcessingStatus === 'success'
            ? (record.leadScore.band.toUpperCase() as 'HOT' | 'WARM' | 'COLD')
            : undefined,
      });
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

  function summarizeInBackground() {
    abandonForegroundGeneration();
    sessionStorage.removeItem(ACTIVE_FOREGROUND_GENERATION_KEY);
    deps.setProcStage('idle');
    deps.setStatus('idle');
    deps.setStep('capture');
    if (deps.activeId) {
      deps.updateRecent(deps.activeId, { aiProcessingStatus: 'processing' });
    }
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
    summarizeInBackground,
    approve: () => runApprove(deps, notify),
    reject: () => runReject(deps, notify),
  };
}
