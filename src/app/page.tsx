import { AppShell } from '@/components/common/app-shell/app-shell';
import { SAMPLE_TRANSCRIPT } from '@/constants/workflow';
import { getRubric } from '@/features/workflow/actions/rubric.actions';
import { getTranscripts } from '@/features/workflow/actions/transcript.actions';
import { toRecentItem } from '@/features/workflow/utils/transcript.mapper';
import { RecentsProvider } from '@/providers/recents/recents-provider';
import { RubricSignalsProvider } from '@/providers/rubric-signals/rubric-signals-provider';
import { WorkflowProvider } from '@/providers/workflow/workflow-provider';

/** This page reads live DB state on every load — never statically prerender it. */
export const dynamic = 'force-dynamic';

export default async function Home() {
  const [initialRubric, storedTranscripts] = await Promise.all([getRubric(), getTranscripts()]);
  const initialRecents = storedTranscripts.map(toRecentItem);

  return (
    <RubricSignalsProvider initialRubric={initialRubric}>
      <RecentsProvider initialRecents={initialRecents}>
        <WorkflowProvider initialSample={SAMPLE_TRANSCRIPT}>
          <AppShell />
        </WorkflowProvider>
      </RecentsProvider>
    </RubricSignalsProvider>
  );
}
