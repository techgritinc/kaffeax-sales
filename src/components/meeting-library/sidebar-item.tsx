import type { JSX } from 'react';

import { StatusChip } from '@/components/ui/chip/status-chip';
import { BAND_SIDEBAR_DOT_CLASS } from '@/constants/bands';
import { RECENT_STATUS } from '@/constants/workflow/recents.constants';
import { cn } from '@/lib/utils/cn';
import type { RecentItem } from '@/providers/recents/recents-context';
import type { Band } from '@/types/rubric.types';

export interface SidebarItemProps {
  item: RecentItem;
  active: boolean;
  onSelect: (item: RecentItem) => void;
}

export function SidebarItem({ item, active, onSelect }: SidebarItemProps): JSX.Element {
  const { badge } = item;
  const succeeded = item.aiProcessingStatus === 'success' && badge !== undefined;
  const failed = item.aiProcessingStatus === 'failed';

  const meta = succeeded
    ? `${badge} · ${item.when}`
    : failed
      ? `Failed — reopen to retry · ${item.when}`
      : `Processing… · ${item.when}`;

  const dotClass =
    item.aiProcessingStatus === 'success' && badge !== undefined
      ? BAND_SIDEBAR_DOT_CLASS[badge.toLowerCase() as Band]
      : failed
        ? 'bg-rust text-rust'
        : 'bg-sidebar-muted text-sidebar-muted animate-pulse';

  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      title={`Open ${item.title}`}
      className={cn(
        'rounded-input mx-2 my-0.5 flex w-[calc(100%-16px)] items-center gap-2.5 border px-3 py-[9px] text-left transition-colors',
        active ? 'bg-green/15 border-green/30' : 'border-transparent hover:bg-white/[0.06]',
      )}
    >
      <span
        className={cn(
          'mt-[5px] h-2 w-2 shrink-0 self-center rounded-full',
          dotClass,
          active && (succeeded || failed) && 'shadow-[0_0_8px_currentColor]',
        )}
      />
      <div className="min-w-0 flex-1">
        <div className="text-sidebar-text-strong truncate text-[13px] font-bold">{item.title}</div>
        <div className="text-sidebar-muted mt-0.5 text-[11px]">{meta}</div>
      </div>
      <StatusChip tone={item.status === RECENT_STATUS.CRM ? 'saved' : 'draft'}>
        {item.status === RECENT_STATUS.CRM ? RECENT_STATUS.CRM : RECENT_STATUS.DRAFT}
      </StatusChip>
    </button>
  );
}
