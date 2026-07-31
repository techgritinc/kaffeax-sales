'use client';

import { CaptureScreen } from '@/components/capture-screen/capture-screen';
import { ProcessingModal } from '@/components/capture-screen/processing-modal';
import { ChatFab } from '@/components/chat-assistant/chat-fab';
import { ChatPanel } from '@/components/chat-assistant/chat-panel';
import { AppHeader } from '@/components/common/app-header/app-header';
import { Stepper } from '@/components/common/stepper/stepper';
import { CommitScreen } from '@/components/crm-screen/commit-screen';
import { Sidebar } from '@/components/meeting-library/sidebar';
import { SidebarRail } from '@/components/meeting-library/sidebar-rail';
import { ReviewScreen } from '@/components/review-screen/review-screen';
import { RubricModal } from '@/components/rubric-signals/rubric-modal';
import { LoadingOverlay } from '@/components/ui/overlay/loading-overlay';
import { Toast } from '@/components/ui/toast/toast';
import { RUBRIC_BANDING_RULE } from '@/constants/bands';
import { DEFAULT_CHAT_COMPANY, DEFAULT_CHAT_SIGNALS } from '@/constants/workflow';
import { cn } from '@/lib/utils/cn';
import { persist } from '@/lib/utils/workflow/persist';
import { useRubricSignals } from '@/providers/rubric-signals/rubric-signals-context';
import { useWorkflow } from '@/providers/workflow/workflow-context';
import type { Rubric } from '@/types/rubric.types';

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
  const rubricSignals = useRubricSignals();
  const rubric: Rubric = { signals: rubricSignals.signals, banding: RUBRIC_BANDING_RULE };
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
    company: wf.draft?.contact.company.value || DEFAULT_CHAT_COMPANY,
    signals: DEFAULT_CHAT_SIGNALS,
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
            activeId={wf.activeId}
            onSelect={(item) => void wf.openFromRecent(item.id)}
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
            {wf.procStage !== 'idle' && <ProcessingModal procStage={wf.procStage} />}
            {wf.isCommitting && <LoadingOverlay />}

            {wf.step === 'capture' && wf.procStage === 'idle' && (
              <CaptureScreen
                transcript={wf.transcript}
                wordCount={wf.wordCount}
                status={wf.status}
                error={wf.error}
                onTranscriptChange={wf.setTranscript}
                onFile={wf.handleFile}
                onLoadSample={wf.loadSample}
                onClear={() => wf.setTranscript('')}
                onSummarise={() => void wf.summarize()}
                onOpenRubric={() => wf.setRubricOpen(true)}
              />
            )}

            {wf.step === 'review' && wf.draft !== null && (
              <ReviewScreen
                draft={wf.draft}
                committed={wf.isCommitted}
                onPatch={wf.patch}
                onApprove={() => void wf.approve()}
                onReject={() => void wf.reject()}
              />
            )}

            {wf.step === 'commit' && (
              <CommitScreen
                record={wf.draft}
                onNewCapture={wf.newCapture}
                onOpenInReview={(id) => void wf.openFromRecent(id)}
              />
            )}
          </div>
        </main>

        {chatVisible && <ChatPanel context={chatContext} onClose={() => wf.setChatOpen(false)} />}
      </div>

      {showChat && !wf.chatOpen && <ChatFab onClick={() => wf.setChatOpen(true)} />}

      <RubricModal
        open={wf.rubricOpen}
        rubric={rubric}
        onClose={() => wf.setRubricOpen(false)}
        onAddSignal={(label, weight) =>
          persist('addSignal', rubricSignals.addSignal({ label, weight }))
        }
        onUpdateSignal={(id, patch) =>
          persist('updateSignal', rubricSignals.updateSignal(id, patch))
        }
        onRemoveSignal={(id) => persist('removeSignal', rubricSignals.removeSignal(id))}
      />

      {wf.toast !== null && <Toast message={wf.toast.message} tone={wf.toast.tone} />}
    </div>
  );
}
