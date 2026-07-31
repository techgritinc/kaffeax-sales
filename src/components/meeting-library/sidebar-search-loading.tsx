import type { JSX } from 'react';

import { Spinner } from '@/components/ui/spinner/spinner';

/** Content-area loading state shown in the sidebar while a debounced search request is in-flight. */
export function SidebarSearchLoading(): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-[18px] py-8">
      <Spinner size={18} className="text-sidebar-muted" />
      <span className="text-sidebar-muted text-[11px]">Searching…</span>
    </div>
  );
}
