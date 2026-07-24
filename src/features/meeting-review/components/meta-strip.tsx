import { Icon } from '@/components/ui/icon/icon';
import { InlineInput } from '@/components/ui/input/inline-input';
import { MEETING_DATE } from '@/constants/workflow';
import type { Attendee } from '@/types/meeting.types';

export interface MetaStripProps {
  attendees: Attendee[];
  email: string;
  onEmailChange: (value: string) => void;
}

const MetaDot = () => (
  <span className="bg-border-strong inline-block h-[3px] w-[3px] rounded-full" aria-hidden="true" />
);

/** Attendees · date · required prospect-email strip beneath the review hero. */
export function MetaStrip({ attendees, email, onEmailChange }: MetaStripProps) {
  const names = attendees.map((a) => a.name).join(', ');
  return (
    <div className="text-muted m-[8px_0_14px] flex flex-wrap items-center gap-[10px_12px] font-sans text-[13px]">
      {attendees.length > 0 && (
        <>
          <span className="inline-flex items-center gap-[6px] font-medium" title="Attendees">
            <Icon name="Users" size={14} className="text-muted shrink-0" />
            <span className="text-muted">{names}</span>
          </span>
          <MetaDot />
        </>
      )}
      <span className="inline-flex items-center gap-[6px]">{MEETING_DATE}</span>
      <MetaDot />
      <span
        className="inline-flex items-center gap-[5px]"
        title="Prospect email — required for CRM entry"
      >
        <Icon name="Mail" size={13} className="text-muted shrink-0" />
        <span
          className="text-rust mr-[1px] -ml-[1px] font-sans text-[13px] leading-none font-bold select-none"
          aria-hidden="true"
        >
          *
        </span>
        <InlineInput
          type="email"
          value={email}
          placeholder="name@company.com"
          onChange={(e) => onEmailChange(e.target.value)}
          className="min-w-[200px]! px-[2px]! py-[1px]!"
          aria-label="Prospect email (required for CRM)"
          aria-required="true"
        />
      </span>
    </div>
  );
}
