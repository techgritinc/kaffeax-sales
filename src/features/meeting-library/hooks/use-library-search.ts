'use client';

import { useState } from 'react';

import type { RecentItem } from '@/providers/recents/recents-context';

export interface UseLibrarySearch {
  query: string;
  setQuery: (query: string) => void;
  drafts: RecentItem[];
  saved: RecentItem[];
}

/** Splits the recents list into draft/CRM groups filtered by title. */
export function useLibrarySearch(recents: RecentItem[]): UseLibrarySearch {
  const [query, setQuery] = useState('');

  const needle = query.trim().toLowerCase();
  const matches = (item: RecentItem): boolean =>
    needle.length === 0 || item.title.toLowerCase().includes(needle);

  const drafts = recents.filter((item) => item.status === 'DRAFT' && matches(item));
  const saved = recents.filter((item) => item.status === 'CRM' && matches(item));

  return { query, setQuery, drafts, saved };
}
