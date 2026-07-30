'use client';

import { type ReactNode, useCallback, useState } from 'react';

import { toRecentItem } from '@/lib/utils/workflow/transcript.mapper';
import { getTranscripts } from '@/server-actions/workflow/transcript.actions';

import { type RecentItem, RecentsContext } from './recents-context';

export interface RecentsProviderProps {
  children: ReactNode;
  initialRecents: RecentItem[];
}

/** Owns the recents-bar list and exposes it via {@link RecentsContext}. */
export function RecentsProvider({ children, initialRecents }: RecentsProviderProps) {
  const [recents, setRecents] = useState<RecentItem[]>(initialRecents);

  const prependRecent = useCallback((item: RecentItem) => {
    setRecents((r) => [item, ...r]);
  }, []);

  const updateRecent = useCallback((id: string, patch: Partial<RecentItem>) => {
    setRecents((r) => r.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }, []);

  const refreshRecents = useCallback(async () => {
    const stored = await getTranscripts();
    setRecents(stored.map(toRecentItem));
  }, []);

  return (
    <RecentsContext.Provider value={{ recents, prependRecent, updateRecent, refreshRecents }}>
      {children}
    </RecentsContext.Provider>
  );
}
