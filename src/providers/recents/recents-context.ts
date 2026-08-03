import { createContext, useContext } from 'react';

import { RECENT_STATUS } from '@/constants/workflow/recents.constants';
import type { AiProcessingStatus } from '@/types/transcript.types';

export type RecentStatus = (typeof RECENT_STATUS)[keyof typeof RECENT_STATUS];
export type RecentBadge = 'HOT' | 'WARM' | 'COLD';

/** A single recents-bar entry — a display projection of a persisted transcript. */
export interface RecentItem {
  id: string;
  title: string;
  status: RecentStatus;
  badge?: RecentBadge;
  /** Drives the sidebar's pending/success/failed presentation, independent of `status`. */
  aiProcessingStatus: AiProcessingStatus;
  when: string;
}

/** The shared recents-bar state and its mutators. */
export interface RecentsContextValue {
  recents: RecentItem[];
  total: number;
  hasMore: boolean;
  isLoadingMore: boolean;
  prependRecent: (item: RecentItem) => void;
  updateRecent: (id: string, patch: Partial<RecentItem>) => void;
  loadMore: () => Promise<void>;
  refreshRecents: () => Promise<void>;
}

/** The recents context — `null` until a `RecentsProvider` supplies a value. */
export const RecentsContext = createContext<RecentsContextValue | null>(null);

/** Access the shared recents-bar state; throws when used outside the provider. */
export function useRecents(): RecentsContextValue {
  const ctx = useContext(RecentsContext);
  if (ctx === null) {
    throw new Error('useRecents must be used within a RecentsProvider');
  }
  return ctx;
}
