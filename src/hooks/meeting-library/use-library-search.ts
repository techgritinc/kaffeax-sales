'use client';

import { useEffect, useRef, useState } from 'react';

import { SEARCH_DEBOUNCE_MS } from '@/constants/workflow/recents.constants';
import { toRecentItem } from '@/lib/utils/workflow/transcript.mapper';
import { useRecents } from '@/providers/recents/recents-context';
import type { RecentItem } from '@/providers/recents/recents-context';
import { searchTranscripts } from '@/server-actions/workflow/transcript.actions';

export interface UseLibrarySearch {
  query: string;
  setQuery: (value: string) => void;
  drafts: RecentItem[];
  saved: RecentItem[];
  isSearching: boolean;
  isSearchActive: boolean;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  isLoadingMore: boolean;
}

export function useLibrarySearch(): UseLibrarySearch {
  const { recents, hasMore, loadMore, isLoadingMore } = useRecents();
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<RecentItem[]>([]);
  const [fetching, setFetching] = useState(false);
  const requestIdRef = useRef(0);

  const isSearchActive = query.trim().length > 0;

  useEffect(() => {
    if (!isSearchActive) return;

    const timerId = setTimeout(() => {
      requestIdRef.current += 1;
      const capturedId = requestIdRef.current;
      setFetching(true);
      setSearchResults([]);

      const run = async (): Promise<void> => {
        try {
          const items = await searchTranscripts(query);
          if (requestIdRef.current !== capturedId) return;
          setSearchResults(items.map(toRecentItem));
        } finally {
          if (requestIdRef.current === capturedId) {
            setFetching(false);
          }
        }
      };

      void run();
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timerId);
  }, [query, isSearchActive]);

  const source = isSearchActive ? searchResults : recents;
  const drafts = source.filter((item) => item.status === 'DRAFT');
  const saved = source.filter((item) => item.status === 'CRM');

  return {
    query,
    setQuery,
    drafts,
    saved,
    isSearching: isSearchActive && fetching,
    isSearchActive,
    hasMore: isSearchActive ? false : hasMore,
    loadMore,
    isLoadingMore,
  };
}
