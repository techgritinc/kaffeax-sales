'use client';

import type { JSX } from 'react';

import { Icon } from '@/components/ui/icon/icon';
import { SearchInput } from '@/components/ui/input/search-input';
import { Spinner } from '@/components/ui/spinner/spinner';
import { useLibrarySearch } from '@/hooks/meeting-library/use-library-search';
import type { RecentItem } from '@/providers/recents/recents-context';

import { SidebarItem } from './sidebar-item';
import { SidebarSearchLoading } from './sidebar-search-loading';

export interface SidebarProps {
  activeId: string | null;
  onSelect: (item: RecentItem) => void;
  onNew: () => void;
  onCollapse: () => void;
}

interface SidebarGroup {
  label: string;
  entries: RecentItem[];
  empty: string;
}

export function Sidebar({ activeId, onSelect, onNew, onCollapse }: SidebarProps): JSX.Element {
  const {
    query,
    setQuery,
    drafts,
    saved,
    isSearching,
    hasMore,
    loadMore,
    isLoadingMore,
    isSearchActive,
  } = useLibrarySearch();

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

      {drafts.length === 0 && saved.length === 0 && !hasMore && !isSearchActive ? (
        <div className="text-sidebar-group-count px-[18px] pt-1 pb-2 text-[12px] italic">
          No summaries yet — capture and summarize a transcript to see it here.
        </div>
      ) : (
        <>
          <div className="relative mx-3 mb-3.5">
            <SearchInput
              placeholder="Search meetings…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            {isSearching && (
              <div className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2">
                <Spinner size={12} className="text-sidebar-muted" />
              </div>
            )}
          </div>

          {isSearchActive && isSearching ? (
            <SidebarSearchLoading />
          ) : isSearchActive && drafts.length === 0 && saved.length === 0 ? (
            <div className="text-sidebar-group-count px-[18px] pt-1 pb-2 text-[12px] italic">
              No meetings found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            groups.map((group) => (
              <div key={group.label} className="mb-1.5">
                <div className="flex items-center justify-between px-[18px] pt-[10px] pb-1">
                  <span className="text-sidebar-muted font-sans text-[10px] font-extrabold tracking-[0.08em] uppercase">
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
                  group.entries.map((item) => (
                    <SidebarItem
                      key={item.id}
                      item={item}
                      active={item.id === activeId}
                      onSelect={onSelect}
                    />
                  ))
                )}
              </div>
            ))
          )}

          {hasMore && !isSearchActive && (
            <div className="px-3 pt-2 pb-1">
              <button
                type="button"
                onClick={() => void loadMore()}
                disabled={isLoadingMore}
                className="rounded-input inline-flex w-full items-center justify-center gap-1.5 border border-white/[0.08] bg-white/[0.04] py-1.5 text-[12px] font-semibold text-white/60 transition-colors hover:border-white/[0.14] hover:bg-white/[0.08] hover:text-white/80 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoadingMore ? <Spinner size={12} /> : null}
                {isLoadingMore ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </>
      )}
    </aside>
  );
}
