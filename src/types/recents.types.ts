import type { StoredTranscript } from '@/types/transcript.types';

export interface RecentsPageResult {
  items: StoredTranscript[];
  total: number;
  hasMore: boolean;
}
