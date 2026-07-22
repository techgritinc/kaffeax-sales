import { Icon } from '@/components/ui/icon';
import { InlineInput } from '@/components/ui/input';
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
    <div className="text-muted mt-2 mb-3.5 flex flex-wrap items-center gap-x-3 gap-y-2.5 font-sans text-[13px]">
      {attendees.length > 0 && (
        <>
          <span className="inline-flex items-center gap-1.5 font-medium" title="Attendees">
            <Icon name="Users" size={14} className="text-muted" />
            <span>{names}</span>
          </span>
          <MetaDot />
        </>
      )}
      <span>{MEETING_DATE}</span>
      <MetaDot />
      <span
        className="inline-flex items-center gap-[5px]"
        title="Prospect email — required for CRM entry"
      >
        <Icon name="Mail" size={13} className="text-muted" />
        <span
          className="text-rust mr-[1px] ml-[-1px] text-[13px] leading-none font-bold"
          aria-hidden="true"
        >
          *
        </span>
        <InlineInput
          type="email"
          value={email}
          placeholder="name@company.com"
          onChange={(e) => onEmailChange(e.target.value)}
          className="min-w-[200px]! px-[2px]!"
          aria-label="Prospect email (required for CRM)"
          aria-required="true"
        />
      </span>
    </div>
  );
}
