import type { JSX } from 'react';

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

const STATUS_SAVED = 'bg-green/[0.18] text-green border border-green/[0.35]';
const STATUS_DRAFT = 'bg-mustard/[0.18] text-mustard border border-mustard/40';

export function SidebarItem({ record, active, onSelect }: SidebarItemProps): JSX.Element {
  const title = record.contact.company.value || 'Untitled meeting';
  const meta = `${BAND_LABEL[record.band]} · ${record.when}`;

  return (
    <button
      type="button"
      onClick={() => onSelect(record)}
      title={`Open ${title}`}
      className={cn(
        'rounded-input mx-2 flex w-[calc(100%-16px)] items-center gap-2.5 border px-3 py-[9px] text-left transition-colors',
        active ? 'bg-green/15 border-green/30' : 'border-transparent hover:bg-white/[0.06]',
      )}
    >
      <span
        className={cn(
          'mt-[5px] h-2 w-2 shrink-0 self-start rounded-full',
          DOT_COLOR[record.band],
          active && 'shadow-[0_0_8px_currentColor]',
        )}
      />
      <div className="min-w-0 flex-1">
        <div className="text-sidebar-text truncate text-[13px] font-bold">{title}</div>
        <div className="text-sidebar-muted mt-0.5 text-[11px]">{meta}</div>
      </div>
      <span
        className={cn(
          'shrink-0 rounded-[3px] px-1.5 py-0.5 text-[8.5px] font-extrabold tracking-[0.06em] uppercase',
          record.committed ? STATUS_SAVED : STATUS_DRAFT,
        )}
      >
        {record.committed ? 'CRM' : 'Draft'}
      </span>
    </button>
  );
}
