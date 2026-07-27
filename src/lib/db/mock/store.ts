import type { RubricSignalFields } from '@/types/rubric-signal.types';
import type { StoredTranscript } from '@/types/transcript.types';

import { SEED_RUBRIC_SIGNALS } from './rubric-signals.fixture';
import { SAMPLE_TRANSCRIPT, SEED_TRANSCRIPTS } from './transcripts.fixture';

interface MockStore {
  transcripts: Map<string, StoredTranscript>;
  rubricSignals: Map<string, RubricSignalFields>;
  sample: string;
}

declare global {
  var __mockStore: MockStore | undefined;
}

/** Seed a fresh store from the fixtures (deep-cloned so mutations never touch fixtures). */
function seed(): MockStore {
  return {
    transcripts: new Map(SEED_TRANSCRIPTS.map((t) => [t.id, structuredClone(t)])),
    rubricSignals: new Map(SEED_RUBRIC_SIGNALS.map((s) => [s.signalId, structuredClone(s)])),
    sample: SAMPLE_TRANSCRIPT,
  };
}

export function getStore(): MockStore {
  if (!globalThis.__mockStore) {
    globalThis.__mockStore = seed();
  }
  return globalThis.__mockStore;
}

/** Re-seed only the transcripts collection (backs a transcript-scoped demo reset). */
export function reseedTranscripts(): void {
  getStore().transcripts = new Map(SEED_TRANSCRIPTS.map((t) => [t.id, structuredClone(t)]));
}

/** Re-seed only the rubric-signals collection. */
export function reseedRubricSignals(): void {
  getStore().rubricSignals = new Map(
    SEED_RUBRIC_SIGNALS.map((s) => [s.signalId, structuredClone(s)]),
  );
}
