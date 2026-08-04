import { Fragment } from 'react';

import { Button } from '@/components/ui/button/button';
import { Icon, type IconName } from '@/components/ui/icon/icon';
import { Shimmer } from '@/components/ui/shimmer/shimmer';
import { AccentBar } from '@/components/ui/typography/accent-bar';
import { Eyebrow } from '@/components/ui/typography/eyebrow';
import { Heading } from '@/components/ui/typography/heading';
import { PROCESSING_STEPS } from '@/constants/workflow';
import { cn } from '@/lib/utils/cn';
import type { ProcessingStage } from '@/types/workflow/processing.types';

export interface ProcessingModalProps {
  procStage: ProcessingStage;
  className?: string;
  onRunInBackground: () => void;
}

type StepState = 'pending' | 'active' | 'done';

const STEP_ICONS: IconName[] = ['FileText', 'Sparkles', 'UserCheck'];

const STAGE_INDEX: Record<ProcessingStage, number> = {
  idle: -1,
  preparing: 0,
  processing: 1,
  extracting: 2,
};

const ICON_LOOK: Record<StepState, string> = {
  pending: 'bg-card-bg border-border-strong text-muted',
  active: 'bg-proc-active-bg border-mustard text-mustard animate-spin-slow',
  done: 'bg-green border-green text-white',
};

const LABEL_LOOK: Record<StepState, string> = {
  pending: 'font-medium text-muted',
  active: 'font-bold text-midnight',
  done: 'font-medium text-midnight',
};

/** Full-screen processing overlay — prototype `ProcessingModal` (3289–3339). */
export function ProcessingModal({ procStage, className, onRunInBackground }: ProcessingModalProps) {
  const activeIdx = STAGE_INDEX[procStage];
  const showBackground = procStage === 'preparing' || procStage === 'processing';

  return (
    <div
      className={cn(
        'bg-midnight/[0.35] fixed inset-0 z-[60] flex items-center justify-center backdrop-blur-[4px]',
        className,
      )}
    >
      <div className="rounded-input-sm shadow-proc w-[460px] max-w-[92vw] bg-white px-[36px] py-[32px]">
        <Eyebrow inline>Processing</Eyebrow>
        <Heading level={2}>Analysing your transcript…</Heading>
        <AccentBar variant="h2" />
        <p className="text-muted mb-[20px] text-[13px] leading-[1.55]">
          Agent is processing the transcript and extracting summary details.
        </p>

        {PROCESSING_STEPS.map((step, i) => {
          const state: StepState = i < activeIdx ? 'done' : i === activeIdx ? 'active' : 'pending';
          return (
            <Fragment key={step.label}>
              <div
                className={cn('flex items-center gap-[12px]', i === 0 ? 'mt-[4px]' : 'mt-[16px]')}
              >
                <div
                  className={cn(
                    'flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-full border-[1.5px]',
                    ICON_LOOK[state],
                  )}
                >
                  <Icon name={state === 'done' ? 'Check' : STEP_ICONS[i]} size={14} />
                </div>
                <div className={cn('flex-1 font-sans text-[13.5px]', LABEL_LOOK[state])}>
                  {step.label}
                </div>
                <div className="min-w-[46px] text-right">
                  {state === 'active' && (
                    <span className="text-mustard font-bold tracking-[2px]">…</span>
                  )}
                  {state === 'done' && (
                    <span className="text-green-deep inline-flex items-center gap-[4px] text-[11px] font-semibold">
                      <Icon name="Check" size={12} /> done
                    </span>
                  )}
                </div>
              </div>
              {state === 'active' && (
                <div className="mt-[12px] mb-[4px] ml-[40px] flex flex-col gap-[6px]">
                  <Shimmer className="w-[85%]" />
                  <Shimmer className="w-[65%]" />
                  <Shimmer className="w-[45%]" />
                </div>
              )}
            </Fragment>
          );
        })}

        {showBackground && (
          <div className="border-border mt-[24px] flex justify-center border-t pt-[20px]">
            <Button variant="ghost" size="sm" onClick={onRunInBackground}>
              Run in background
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
