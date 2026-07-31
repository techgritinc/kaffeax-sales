import { AppShell } from '@/components/common/app-shell/app-shell';
import { SAMPLE_TRANSCRIPT } from '@/constants/workflow';
import { RECENTS_PAGE_SIZE } from '@/constants/workflow/recents.constants';
import { toRecentItem } from '@/lib/utils/workflow/transcript.mapper';
import { RecentsProvider } from '@/providers/recents/recents-provider';
import { RubricSignalsProvider } from '@/providers/rubric-signals/rubric-signals-provider';
import { WorkflowProvider } from '@/providers/workflow/workflow-provider';
import { getRubric } from '@/server-actions/workflow/rubric.actions';
import { getTranscriptPage } from '@/server-actions/workflow/transcript.actions';

/** This page reads live DB state on every load — never statically prerender it. */
export const dynamic = 'force-dynamic';

export default async function Home() {
  const [initialRubric, initialPage] = await Promise.all([
    getRubric(),
    getTranscriptPage(1, RECENTS_PAGE_SIZE),
  ]);
  const initialRecents = initialPage.items.map(toRecentItem);

  return (
    <RubricSignalsProvider initialRubric={initialRubric}>
      <RecentsProvider initialRecents={initialRecents} initialTotal={initialPage.total}>
        <WorkflowProvider initialSample={SAMPLE_TRANSCRIPT}>
          <AppShell />
        </WorkflowProvider>
      </RecentsProvider>
    </RubricSignalsProvider>
  );
}
