import { PROC_TICK_MS } from '@/constants/workflow';
import { runAiSummarization } from '@/features/workflow/actions/transcript-ai.actions';
import {
  createDraftTranscript,
  deleteTranscript,
  updateTranscript,
} from '@/features/workflow/actions/transcript.actions';
import { toSimplifiedSignals } from '@/features/workflow/utils/rubric.mapper';
import { formatWhen } from '@/features/workflow/utils/transcript.mapper';
import type { RecentItem } from '@/providers/recents/recents-context';

import type { NotifyFn, WorkflowActionDeps } from '../types/workflow-action-deps.types';

export async function runSummarize(deps: WorkflowActionDeps): Promise<void> {
  const {
    transcript,
    activeId,
    signals,
    prependRecent,
    updateRecent,
    setStatus,
    setError,
    setActiveId,
    setDraft,
    setStep,
    setProcTick,
  } = deps;

  const rawTranscript = transcript.trim();
  if (!rawTranscript) return;

  setStatus('processing');
  setError('');
  setProcTick(0);
  const ticker = window.setInterval(() => setProcTick((t: number) => t + 1), PROC_TICK_MS);

  let id: string | undefined = activeId ?? undefined;
  try {
    if (id) {
      updateRecent(id, { aiProcessingStatus: 'pending' });
    } else {
      ({ id } = await createDraftTranscript({ rawTranscript }));
      setActiveId(id);
      const now = formatWhen(new Date());
      prependRecent({
        id,
        title: `Meeting on ${now}`,
        status: 'DRAFT',
        aiProcessingStatus: 'pending',
        when: now,
      });
    }

    const result = await runAiSummarization({ id, signals: toSimplifiedSignals(signals) });

    if (result.success) {
      updateRecent(id, {
        title: result.record.summary.meetingTitle,
        aiProcessingStatus: 'success',
        badge: result.record.leadScore.band.toUpperCase() as RecentItem['badge'],
      });
      setDraft(result.record);
      setStatus('idle');
      setStep('review');
    } else {
      updateRecent(id, { aiProcessingStatus: 'failed' });
      setError(result.error);
      setStatus('error');
    }
  } catch (err) {
    if (id) updateRecent(id, { aiProcessingStatus: 'failed' });
    setError(err instanceof Error ? err.message : 'Could not process the transcript.');
    setStatus('error');
  } finally {
    window.clearInterval(ticker);
  }
}

export async function runApprove(deps: WorkflowActionDeps, notify: NotifyFn): Promise<void> {
  const { draft, isCommitted, updateRecent, setDraft } = deps;
  if (!draft) return;
  try {
    const updated = await updateTranscript({ ...draft, committed: true });
    if (!updated) {
      notify('That summary could not be found.', 'reject');
      return;
    }
    updateRecent(updated.id, { status: 'CRM' });
    setDraft(updated);
    notify(isCommitted ? 'CRM record updated.' : 'Approved and written to CRM.', 'success');
  } catch (err) {
    notify(
      err instanceof Error ? err.message : 'Unable to save changes. Please try again.',
      'reject',
    );
  }
}

export async function runReject(deps: WorkflowActionDeps, notify: NotifyFn): Promise<void> {
  const { draft, refreshRecents, setDraft, setActiveId, setStatus, setError, setStep } = deps;
  if (!draft) return;
  try {
    await deleteTranscript(draft.id);
    await refreshRecents();
  } catch (err) {
    notify(
      err instanceof Error ? err.message : 'Unable to reject the draft. Please try again.',
      'reject',
    );
    return;
  }
  setDraft(null);
  setActiveId(null);
  setStatus('idle');
  setError('');
  setStep('capture');
  notify('Draft rejected · no CRM write.', 'reject');
}
