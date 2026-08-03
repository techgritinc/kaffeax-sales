'use client';

import { type ReactNode, useCallback, useState } from 'react';

import { RECENTS_PAGE_SIZE } from '@/constants/workflow/recents.constants';
import { toRecentItem } from '@/lib/utils/workflow/transcript.mapper';
import { getTranscriptPage } from '@/server-actions/workflow/transcript.actions';

import { type RecentItem, RecentsContext } from './recents-context';

export interface RecentsProviderProps {
  children: ReactNode;
  initialRecents: RecentItem[];
  initialTotal: number;
}

/** Owns the recents-bar list and exposes it via {@link RecentsContext}. */
export function RecentsProvider({ children, initialRecents, initialTotal }: RecentsProviderProps) {
  const [recents, setRecents] = useState<RecentItem[]>(initialRecents);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(initialTotal);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const hasMore = recents.length < total;

  const prependRecent = useCallback((item: RecentItem) => {
    setRecents((r) => [item, ...r]);
  }, []);

  const updateRecent = useCallback((id: string, patch: Partial<RecentItem>) => {
    setRecents((r) => r.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }, []);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const result = await getTranscriptPage(page + 1, RECENTS_PAGE_SIZE);
      setRecents((r) => [...r, ...result.items.map(toRecentItem)]);
      setPage((p) => p + 1);
      setTotal(result.total);
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMore, isLoadingMore, page]);

  const refreshRecents = useCallback(async () => {
    const result = await getTranscriptPage(1, RECENTS_PAGE_SIZE);
    setRecents(result.items.map(toRecentItem));
    setPage(1);
    setTotal(result.total);
  }, []);

  return (
    <RecentsContext.Provider
      value={{
        recents,
        total,
        hasMore,
        isLoadingMore,
        prependRecent,
        updateRecent,
        loadMore,
        refreshRecents,
      }}
    >
      {children}
    </RecentsContext.Provider>
  );
}
