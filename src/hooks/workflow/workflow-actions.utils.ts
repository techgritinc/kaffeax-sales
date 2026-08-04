import { ACTIVE_FOREGROUND_GENERATION_KEY } from '@/constants/workflow';
import { AI_SUMMARIZATION_ERROR } from '@/constants/workflow/action.constants';
import { RECENT_STATUS } from '@/constants/workflow/recents.constants';
import { toSimplifiedSignals } from '@/lib/utils/workflow/rubric.mapper';
import { formatWhen } from '@/lib/utils/workflow/transcript.mapper';
import type { RecentItem } from '@/providers/recents/recents-context';
import { commitToCrm } from '@/server-actions/crm-commit/commit-to-crm';
import {
  runAiSummarization,
  runAiSummarizationInBackground,
} from '@/server-actions/workflow/transcript-ai.actions';
import {
  createDraftTranscript,
  deleteTranscript,
  getTranscriptById,
  updateTranscriptEmail,
} from '@/server-actions/workflow/transcript.actions';

import type { NotifyFn, WorkflowActionDeps } from '../../types/workflow/workflow-action-deps.types';

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
    setProcStage,
  } = deps;

  const rawTranscript = transcript.trim();
  if (!rawTranscript) return;

  setStatus('processing');
  setError('');
  setProcStage('preparing');

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
        status: RECENT_STATUS.DRAFT,
        aiProcessingStatus: 'pending',
        when: now,
      });
    }

    sessionStorage.setItem(ACTIVE_FOREGROUND_GENERATION_KEY, id);
    setProcStage('processing');
    const result = await runAiSummarization({ id, signals: toSimplifiedSignals(signals) });

    if (result.success) {
      setProcStage('extracting');
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
  } catch {
    if (id) updateRecent(id, { aiProcessingStatus: 'failed' });
    setError(AI_SUMMARIZATION_ERROR);
    setStatus('error');
  } finally {
    sessionStorage.removeItem(ACTIVE_FOREGROUND_GENERATION_KEY);
    setProcStage('idle');
  }
}

export async function runSummarizeInBackground(deps: WorkflowActionDeps): Promise<void> {
  const { activeId, signals, updateRecent } = deps;
  if (!activeId) return;

  await runAiSummarizationInBackground({ id: activeId, signals: toSimplifiedSignals(signals) });
  updateRecent(activeId, { aiProcessingStatus: 'processing' });
}

export async function runApprove(deps: WorkflowActionDeps, notify: NotifyFn): Promise<void> {
  const { draft, updateRecent, setDraft, setStep, setIsCommitting } = deps;
  if (!draft) return;
  setIsCommitting(true);
  try {
    // Persist the (possibly corrected) email first — commitToCrm re-reads the transcript
    // from the DB by id, so the CRM lookup must see this saved value, not the in-memory
    // draft. This targets only the email field; see updateTranscriptEmail's doc comment.
    const persistedOk = await updateTranscriptEmail(draft.id, draft.contact.email.value);
    if (!persistedOk) {
      notify('That summary could not be found.', 'reject');
      return;
    }

    const result = await commitToCrm(draft.id);
    if (!result.success) {
      notify(result.error ?? 'Unable to save changes. Please try again.', 'reject');
      return;
    }

    const updated = await getTranscriptById(draft.id);
    if (!updated) {
      notify('That summary could not be found.', 'reject');
      return;
    }
    updateRecent(updated.id, { status: RECENT_STATUS.CRM });
    setDraft(updated);
    notify('Approved and written to CRM.', 'success');
    setStep('commit');
  } catch (err) {
    notify(
      err instanceof Error ? err.message : 'Unable to save changes. Please try again.',
      'reject',
    );
  } finally {
    setIsCommitting(false);
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
