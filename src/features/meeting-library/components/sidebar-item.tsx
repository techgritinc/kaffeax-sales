import type { JSX } from 'react';

import { StatusChip } from '@/components/ui/chip/status-chip';
import { BAND_LABEL } from '@/constants/bands';
import { cn } from '@/lib/utils/cn';
import type { MeetingRecord } from '@/types/meeting.types';
import type { Band } from '@/types/rubric.types';

export interface SidebarItemProps {
  record: MeetingRecord;
  active: boolean;
  onSelect: (record: MeetingRecord) => void;
}

const DOT_COLOR: Record<Band, string> = {
  hot: 'bg-green text-green',
  warm: 'bg-mustard text-mustard',
  cold: 'bg-dark-teal text-dark-teal',
};

export function SidebarItem({ record, active, onSelect }: SidebarItemProps): JSX.Element {
  const title = record.contact.company.value || 'Untitled meeting';
  const meta = `${BAND_LABEL[record.band]} · ${record.when}`;

  return (
    <button
      type="button"
      onClick={() => onSelect(record)}
      title={`Open ${title}`}
      className={cn(
        'rounded-input mx-2 my-0.5 flex w-[calc(100%-16px)] items-center gap-2.5 border px-3 py-[9px] text-left transition-colors',
        active ? 'bg-green/15 border-green/30' : 'border-transparent hover:bg-white/[0.06]',
      )}
    >
      <span
        className={cn(
          'mt-[5px] h-2 w-2 shrink-0 self-center rounded-full',
          DOT_COLOR[record.band],
          active && 'shadow-[0_0_8px_currentColor]',
        )}
      />
      <div className="min-w-0 flex-1">
        <div className="text-sidebar-text-strong truncate text-[13px] font-bold">{title}</div>
        <div className="text-sidebar-muted mt-0.5 text-[11px]">{meta}</div>
      </div>
      <StatusChip tone={record.committed ? 'saved' : 'draft'}>
        {record.committed ? 'CRM' : 'Draft'}
      </StatusChip>
    </button>
  );
}
