import { getStore, reseedRubricSignals } from '@/lib/db/mock/store';
import type { RubricSignalFields } from '@/types/rubric-signal.types';

class RubricSignalRepository {
  findActive(): Promise<RubricSignalFields[]> {
    return Promise.resolve([...getStore().rubricSignals.values()].filter((s) => s.isActive));
  }

  create(doc: RubricSignalFields): Promise<RubricSignalFields> {
    getStore().rubricSignals.set(doc.signalId, doc);
    return Promise.resolve(doc);
  }

  update(id: string, patch: Partial<RubricSignalFields>): Promise<RubricSignalFields | null> {
    const store = getStore();
    const existing = store.rubricSignals.get(id);
    if (!existing) return Promise.resolve(null);
    const next: RubricSignalFields = { ...existing, ...patch, signalId: existing.signalId };
    store.rubricSignals.set(id, next);
    return Promise.resolve(next);
  }

  delete(id: string): Promise<boolean> {
    return Promise.resolve(getStore().rubricSignals.delete(id));
  }

  reset(): Promise<void> {
    reseedRubricSignals();
    return Promise.resolve();
  }
}

export const rubricSignalRepository = new RubricSignalRepository();
