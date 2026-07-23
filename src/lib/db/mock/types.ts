import type { TranscriptPresentation } from '@/types/meeting.types';
import type { TranscriptFields } from '@/types/transcript.types';

export interface StoredTranscript {
  id: string;
  fields: TranscriptFields;
  presentation: TranscriptPresentation;
}
