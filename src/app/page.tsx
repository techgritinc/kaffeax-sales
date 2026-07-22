import { AppShell } from '@/components/common/app-shell';
import { WorkflowProvider } from '@/providers/workflow/workflow-provider';

export default function Home() {
  return (
    <WorkflowProvider>
      <AppShell />
    </WorkflowProvider>
  );
}
