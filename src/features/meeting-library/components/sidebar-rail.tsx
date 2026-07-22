import type { JSX } from 'react';

import { Icon } from '@/components/ui/icon';

export interface SidebarRailProps {
  onExpand: () => void;
}

/** Collapsed 56px navy rail hosting the button that restores the full sidebar. */
export function SidebarRail({ onExpand }: SidebarRailProps): JSX.Element {
  return (
    <div className="bg-sidebar-bg flex w-14 flex-col items-center gap-2.5 border-r border-white/[0.06] py-[18px]">
      <button
        type="button"
        onClick={onExpand}
        title="Show recent meetings"
        aria-label="Show recent meetings"
        className="rounded-btn inline-flex h-9 w-9 shrink-0 items-center justify-center border border-white/[0.10] bg-white/[0.06] text-white transition-colors hover:border-white/[0.22] hover:bg-white/[0.12]"
      >
        <Icon name="PanelLeft" size={16} />
      </button>
    </div>
  );
}
