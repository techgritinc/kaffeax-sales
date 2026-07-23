'use client';

import { AppHeader } from '@/components/common/app-header';
import { Stepper } from '@/components/common/stepper';
import { Toast } from '@/components/ui/toast';
import { ChatFab, ChatPanel } from '@/features/assistant-chat/components';
import { CommitScreen } from '@/features/crm-commit/components';
import { CaptureScreen, ProcessingModal } from '@/features/meeting-capture/components';
import { Sidebar, SidebarRail } from '@/features/meeting-library/components';
import { ReviewScreen } from '@/features/meeting-review/components';
import { RubricModal } from '@/features/scoring-rubric/components';
import { cn } from '@/lib/utils/cn';
import { useWorkflow } from '@/providers/workflow/workflow-context';

const SHELL_COLS = {
  sidebarChat:
    'grid-cols-[260px_minmax(0,1fr)_340px] max-bp1100:grid-cols-[220px_minmax(0,1fr)_300px] max-bp900:grid-cols-[minmax(0,1fr)]',
  sidebarOnly:
    'grid-cols-[260px_minmax(0,1fr)] max-bp1100:grid-cols-[220px_minmax(0,1fr)] max-bp900:grid-cols-[minmax(0,1fr)]',
  railChat:
    'grid-cols-[56px_minmax(0,1fr)_340px] max-bp1100:grid-cols-[56px_minmax(0,1fr)_300px] max-bp900:grid-cols-[56px_minmax(0,1fr)]',
  railOnly: 'grid-cols-[56px_minmax(0,1fr)] max-bp900:grid-cols-[56px_minmax(0,1fr)]',
};

/** Application shell: fixed header + the responsive [sidebar | main | chat] grid. */
export function AppShell() {
  const wf = useWorkflow();
  const canReview = wf.draft !== null || wf.isCommitted;
  const showChat = wf.step !== 'capture';
  const chatVisible = showChat && wf.chatOpen;

  const shellCols = wf.sidebarOpen
    ? chatVisible
      ? SHELL_COLS.sidebarChat
      : SHELL_COLS.sidebarOnly
    : chatVisible
      ? SHELL_COLS.railChat
      : SHELL_COLS.railOnly;

  const chatContext = {
    company: wf.draft?.contact.company.value || wf.crm[0]?.contact.company.value || 'Cascade Ember',
    signals: 'distribution pain, price-transparency pain, and a listing/marketplace need',
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <AppHeader />
      <div className={cn('grid h-[calc(100vh-56px)]', shellCols)}>
        {wf.sidebarOpen && (
          <div
            className="animate-fade-in bg-midnight/40 max-bp900:block fixed inset-[56px_0_0_0] z-[44] hidden"
            onClick={() => wf.setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {wf.sidebarOpen ? (
          <Sidebar
            library={wf.library}
            activeId={wf.activeId}
            onSelect={wf.openFromLibrary}
            onNew={wf.newCapture}
            onCollapse={() => wf.setSidebarOpen(false)}
          />
        ) : (
          <SidebarRail onExpand={() => wf.setSidebarOpen(true)} />
        )}

        <main className="flex min-h-0 min-w-0 flex-col overflow-hidden">
          <div className="max-bp900:p-[12px_20px_4px] max-bp560:p-[10px_14px_4px] z-[6] flex shrink-0 items-center gap-4 p-[12px_40px_4px]">
            <Stepper
              step={wf.step}
              canReview={canReview}
              canCommit={wf.isCommitted}
              onGoTo={wf.goTo}
            />
          </div>

          <div className="max-bp900:p-[10px_20px_28px] max-bp560:p-[8px_14px_24px] min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-[12px_40px_40px]">
            {wf.status === 'processing' && <ProcessingModal procTick={wf.procTick} />}

            {wf.step === 'capture' && wf.status !== 'processing' && (
              <CaptureScreen
                transcript={wf.transcript}
                wordCount={wf.wordCount}
                status={wf.status}
                error={wf.error}
                onTranscriptChange={wf.setTranscript}
                onFile={wf.handleFile}
                onLoadSample={wf.loadSample}
                onClear={() => wf.setTranscript('')}
                onSummarise={wf.process}
                onOpenRubric={() => wf.setRubricOpen(true)}
              />
            )}

            {wf.step === 'review' && wf.draft !== null && (
              <ReviewScreen
                draft={wf.draft}
                committed={wf.isCommitted}
                onPatch={wf.patch}
                onApprove={wf.approve}
                onReject={wf.reject}
              />
            )}

            {wf.step === 'commit' && (
              <CommitScreen
                crm={wf.crm}
                activeId={wf.activeId}
                library={wf.library}
                onNewCapture={wf.newCapture}
                onOpenInReview={wf.openFromLibrary}
              />
            )}
          </div>
        </main>

        {chatVisible && <ChatPanel context={chatContext} onClose={() => wf.setChatOpen(false)} />}
      </div>

      {showChat && !wf.chatOpen && <ChatFab onClick={() => wf.setChatOpen(true)} />}

      <RubricModal
        open={wf.rubricOpen}
        rubric={wf.rubric}
        onClose={() => wf.setRubricOpen(false)}
        onAddSignal={wf.addSignal}
        onUpdateSignal={wf.updateSignal}
        onRemoveSignal={wf.removeSignal}
      />

      {wf.toast !== null && <Toast message={wf.toast.message} tone={wf.toast.tone} />}
    </div>
  );
}
