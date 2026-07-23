import { Icon } from '@/components/ui/icon/icon';
import { AccentBar } from '@/components/ui/typography/accent-bar';
import { Eyebrow } from '@/components/ui/typography/eyebrow';
import { cn } from '@/lib/utils/cn';

import { TranscriptCard, type TranscriptCardProps } from './transcript-card';

export interface CaptureScreenProps extends TranscriptCardProps {
  onOpenRubric: () => void;
}

/** Capture screen — hero + rubric pill + transcript grid (prototype 3605–3700). */
export function CaptureScreen({ onOpenRubric, className, ...transcript }: CaptureScreenProps) {
  return (
    <div className={cn('flex h-full flex-col gap-4', className)}>
      <div className="flex items-start justify-between gap-5">
        <div className="min-w-0 flex-1">
          <Eyebrow>New meeting</Eyebrow>
          <h1 className="font-display text-midnight text-[26px] leading-[1.1] font-black tracking-[-0.03em]">
            Turn a call into a scored lead.
          </h1>
          <AccentBar context="captureHero" />
          <p className="text-muted text-[13px] leading-[1.55]">
            Paste a meeting transcript. Agent extracts contacts, scores intent against your rubric —
            you review and approve before anything touches the CRM.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenRubric}
          title="Open scoring rubric"
          aria-label="Open scoring rubric"
          className="bg-midnight shadow-rubric-fab hover:shadow-rubric-fab-hover max-bp720:gap-[6px] max-bp720:px-[12px] max-bp720:py-[9px] max-bp720:tracking-[0.04em] mt-[4px] inline-flex shrink-0 items-center gap-2 rounded-full px-[16px] py-[10px] font-sans text-[11.5px] font-bold tracking-[0.06em] whitespace-nowrap text-white uppercase transition hover:-translate-y-px"
        >
          <Icon name="SlidersHorizontal" size={14} />
          <span className="max-bp720:hidden">Scoring rubric</span>
          <span
            className="bg-green h-2 w-2 rounded-full shadow-[0_0_8px_var(--green)]"
            aria-hidden="true"
          />
        </button>
      </div>

      <div className="flex min-h-0 w-full flex-1 flex-col">
        <TranscriptCard {...transcript} />
      </div>
    </div>
  );
}
