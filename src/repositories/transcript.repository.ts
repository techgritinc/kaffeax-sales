import { getStore, reseedTranscripts } from '@/lib/db/mock/store';
import type { StoredTranscript } from '@/lib/db/mock/types';

class TranscriptRepository {
  findAll(): Promise<StoredTranscript[]> {
    return Promise.resolve([...getStore().transcripts.values()]);
  }

  findById(id: string): Promise<StoredTranscript | null> {
    return Promise.resolve(getStore().transcripts.get(id) ?? null);
  }

  getSample(): Promise<string> {
    return Promise.resolve(getStore().sample);
  }

  create(doc: StoredTranscript): Promise<StoredTranscript> {
    getStore().transcripts.set(doc.id, doc);
    return Promise.resolve(doc);
  }

  update(id: string, patch: Partial<StoredTranscript>): Promise<StoredTranscript | null> {
    const store = getStore();
    const existing = store.transcripts.get(id);
    if (!existing) return Promise.resolve(null);
    const next: StoredTranscript = {
      ...existing,
      ...patch,
      fields: { ...existing.fields, ...patch.fields },
      presentation: { ...existing.presentation, ...patch.presentation },
    };
    store.transcripts.set(id, next);
    return Promise.resolve(next);
  }

  delete(id: string): Promise<boolean> {
    return Promise.resolve(getStore().transcripts.delete(id));
  }

  reset(): Promise<void> {
    reseedTranscripts();
    return Promise.resolve();
  }
}

export const transcriptRepository = new TranscriptRepository();
