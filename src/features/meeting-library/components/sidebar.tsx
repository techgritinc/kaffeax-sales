'use client';

import type { JSX } from 'react';

import { Icon } from '@/components/ui/icon';
import { SearchInput } from '@/components/ui/input';
import type { MeetingRecord } from '@/types/meeting.types';

import { useLibrarySearch } from '../hooks/use-library-search';
import { SidebarItem } from './sidebar-item';

export interface SidebarProps {
  library: MeetingRecord[];
  activeId: string | null;
  onSelect: (record: MeetingRecord) => void;
  onNew: () => void;
  onCollapse: () => void;
}

interface SidebarGroup {
  label: string;
  entries: MeetingRecord[];
  empty: string;
}

export function Sidebar({
  library,
  activeId,
  onSelect,
  onNew,
  onCollapse,
}: SidebarProps): JSX.Element {
  const { query, setQuery, drafts, saved } = useLibrarySearch(library);

  const groups: SidebarGroup[] = [
    { label: 'Drafts', entries: drafts, empty: 'No drafts pending.' },
    { label: 'Saved to CRM', entries: saved, empty: 'Nothing committed yet.' },
  ];

  return (
    <aside className="bg-sidebar-bg text-sidebar-text max-bp900:fixed max-bp900:top-[56px] max-bp900:bottom-0 max-bp900:left-0 max-bp900:z-[45] max-bp900:w-[min(300px,85vw)] max-bp900:shadow-drawer overflow-y-auto border-r border-white/[0.06] pt-[22px] pb-6">
      <div className="flex items-center justify-between px-[18px] pb-3">
        <div className="text-[16px] font-extrabold text-white">Recent</div>
        <div className="inline-flex items-center gap-1.5">
          <button
            type="button"
            onClick={onNew}
            title="New capture"
            className="rounded-input border-green/[0.35] bg-green/[0.14] hover:border-green/[0.55] hover:bg-green/[0.24] text-sidebar-new-text inline-flex items-center gap-1 border px-2 py-1 text-[11px] font-bold transition-colors"
          >
            <Icon name="Plus" size={14} /> New
          </button>
          <button
            type="button"
            onClick={onCollapse}
            title="Collapse sidebar"
            aria-label="Collapse sidebar"
            className="rounded-btn-sm inline-flex h-[26px] w-[26px] items-center justify-center border border-white/[0.12] text-white/70 transition-colors hover:border-white/[0.24] hover:bg-white/[0.06] hover:text-white"
          >
            <Icon name="ChevronLeft" size={14} />
          </button>
        </div>
      </div>

      <div className="relative mx-3 mb-3.5">
        <SearchInput
          placeholder="Search meetings…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      {groups.map((group) => (
        <div key={group.label} className="mb-1.5">
          <div className="flex items-center justify-between px-[18px] pt-3 pb-1">
            <span className="text-sidebar-muted px-[18px] pt-[10px] pb-1 text-[10px] font-extrabold tracking-[0.08em] uppercase">
              {group.label}
            </span>
            <span className="text-sidebar-group-count rounded-[10px] bg-white/[0.06] px-1.5 py-px text-[10px] font-extrabold tracking-[0.06em]">
              {group.entries.length}
            </span>
          </div>
          {group.entries.length === 0 ? (
            <div className="text-sidebar-group-count px-[18px] pt-1 pb-2 text-[11px] italic">
              {group.empty}
            </div>
          ) : (
            group.entries.map((record) => (
              <SidebarItem
                key={record.id}
                record={record}
                active={record.id === activeId}
                onSelect={onSelect}
              />
            ))
          )}
        </div>
      ))}
    </aside>
  );
}
