import { AppShell } from '@/components/common/app-shell/app-shell';
import { getRubric } from '@/features/workflow/actions/rubric.actions';
import {
  getSampleTranscript,
  getTranscripts,
} from '@/features/workflow/actions/transcript.actions';
import { WorkflowProvider } from '@/providers/workflow/workflow-provider';

export default async function Home() {
  const [initialLibrary, initialRubric, initialSample] = await Promise.all([
    getTranscripts(),
    getRubric(),
    getSampleTranscript(),
  ]);

  return (
    <WorkflowProvider
      initialLibrary={initialLibrary}
      initialRubric={initialRubric}
      initialSample={initialSample}
    >
      <AppShell />
    </WorkflowProvider>
  );
}
