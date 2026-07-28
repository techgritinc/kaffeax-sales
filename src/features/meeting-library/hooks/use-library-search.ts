'use client';

import { useState } from 'react';

import type { MeetingRecord } from '@/types/meeting.types';

export interface UseLibrarySearch {
  query: string;
  setQuery: (query: string) => void;
  drafts: MeetingRecord[];
  saved: MeetingRecord[];
}

/** Splits a meeting library into draft/saved groups filtered by company-name query. */
export function useLibrarySearch(library: MeetingRecord[]): UseLibrarySearch {
  const [query, setQuery] = useState('');

  const needle = query.trim().toLowerCase();
  const matches = (record: MeetingRecord): boolean =>
    needle.length === 0 || (record.contact.company.value ?? '').toLowerCase().includes(needle);

  const drafts = library.filter((record) => !record.committed && matches(record));
  const saved = library.filter((record) => record.committed && matches(record));

  return { query, setQuery, drafts, saved };
}
