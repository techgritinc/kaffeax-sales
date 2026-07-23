import { Badge } from '@/components/ui/badge/badge';
import { Button } from '@/components/ui/button/button';
import { cn } from '@/lib/utils/cn';
import type { Band } from '@/types/rubric.types';

export interface ReviewHeroProps {
  title: string;
  band: Band;
  score: number;
  committed: boolean;
  emailMissing: boolean;
  onApprove: () => void;
  onReject: () => void;
  onEmail: () => void;
}

const SCORE_COLOR: Record<Band, string> = {
  hot: 'text-green-deep',
  warm: 'text-mustard',
  cold: 'text-dark-teal',
};

/** Review hero: meeting title with an inline band badge + score, and the action cluster. */
export function ReviewHero({
  title,
  band,
  score,
  committed,
  emailMissing,
  onApprove,
  onReject,
  onEmail,
}: ReviewHeroProps) {
  return (
    <div className="max-bp640:flex-col max-bp640:items-stretch max-bp640:gap-[12px] mb-1.5 flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <div className="text-mustard mb-1.5 font-sans text-[11px] leading-none font-extrabold tracking-[0.14em] uppercase">
          Meeting summary
        </div>
        <h1 className="font-display text-midnight max-bp900:text-[22px] max-bp640:text-[20px] max-bp400:text-[18px] text-[24px] leading-[1.2] font-black tracking-[-0.02em] break-words">
          {title}
          <span className="max-bp900:ml-[10px] max-bp400:ml-[8px] ml-[12px] inline-block align-[0.14em] whitespace-nowrap">
            <Badge band={band} className="align-baseline" />
            <span
              className={cn(
                'font-display max-bp900:ml-[8px] max-bp400:ml-[6px] ml-[10px] inline-flex items-baseline align-baseline leading-none font-bold tracking-[-0.02em]',
                SCORE_COLOR[band],
              )}
              title="Lead score against the rubric"
            >
              <b className="max-bp900:text-[20px] max-bp640:text-[18px] max-bp400:text-[16px] text-[22px] font-bold">
                {score}
              </b>
              <span className="text-muted max-bp640:text-[12px] max-bp400:text-[11px] ml-px text-[13px] font-medium">
                /100
              </span>
            </span>
          </span>
        </h1>
      </div>

      <div className="max-bp640:justify-start mt-[2px] inline-flex shrink-0 flex-wrap items-center justify-end gap-1.5">
        <Button
          variant="send"
          size="sm"
          iconStart="Mail"
          iconSize={11}
          onClick={onEmail}
          title="Send recap email"
        >
          Email
        </Button>
        {committed ? (
          <Button
            variant="approve"
            size="sm"
            iconStart="RefreshCw"
            iconSize={11}
            onClick={onApprove}
            disabled={emailMissing}
            title={
              emailMissing
                ? 'Prospect email is required to update the CRM record'
                : 'Update the CRM record'
            }
          >
            Update CRM
          </Button>
        ) : (
          <>
            <Button variant="reject" size="sm" onClick={onReject}>
              Reject
            </Button>
            <Button
              variant="approve"
              size="sm"
              onClick={onApprove}
              disabled={emailMissing}
              title={
                emailMissing
                  ? 'Prospect email is required to create the CRM record'
                  : 'Approve and write to CRM'
              }
            >
              Approve
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
