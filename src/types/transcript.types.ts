export const AI_PROVIDERS = ['anthropic', 'openrouter'] as const;

export type AiProvider = (typeof AI_PROVIDERS)[number];

export interface AiUsage {
  model: string;
  provider: AiProvider;
  inputTokens: number;
  outputTokens: number;
  /** Prompt-cache write tokens (Anthropic only; 0 for OpenRouter). */
  cacheCreationTokens: number;
  /** Prompt-cache read tokens (Anthropic only; 0 for OpenRouter). */
  cacheReadTokens: number;
  inputCostUsd: number;
  outputCostUsd: number;
  /** Cost of prompt-cache writes (0 when unused). */
  cacheCreationCostUsd: number;
  /** Cost of prompt-cache reads (0 when unused). */
  cacheReadCostUsd: number;
  totalCostUsd: number;
}

export const TRANSCRIPT_STATUSES = ['draft', 'saved'] as const;
export const TRANSCRIPT_SOURCES = ['manual', 'zoom', 'ms_teams', 'google_meet'] as const;
export const ATTENDEE_SIDES = ['kaffeax', 'prospect'] as const;
export const LEAD_SCORE_BANDS = ['hot', 'warm', 'cold'] as const;
export const AI_PROCESSING_STATUSES = ['pending', 'success', 'failed'] as const;

export type TranscriptStatus = (typeof TRANSCRIPT_STATUSES)[number];
export type TranscriptSource = (typeof TRANSCRIPT_SOURCES)[number];
export type AttendeeSide = (typeof ATTENDEE_SIDES)[number];
export type LeadScoreBand = (typeof LEAD_SCORE_BANDS)[number];
export type AiProcessingStatus = (typeof AI_PROCESSING_STATUSES)[number];

export interface ActionItem {
  description: string;
  owner: string;
  dueDate?: string;
}

export interface Attendee {
  name: string;
  side: AttendeeSide;
}

export interface DetectedSignal {
  id: string;
  label: string;
  evidence: string;
}

export interface TranscriptSummary {
  narrative: string;
  whatWeHeard: string[];
  whatWasCovered: string[];
  whatWasDecided: string[];
  actionItems: ActionItem[];
  attendees: Attendee[];
}

export interface TranscriptContact {
  email?: string;
}

export interface TranscriptLeadScore {
  band?: LeadScoreBand;
  detectedSignals: DetectedSignal[];
  rationale: string;
  scorePercentage?: number;
}

export interface TranscriptFields {
  userId: string;
  title: string;
  status: TranscriptStatus;
  aiProcessingStatus: AiProcessingStatus;
  source: TranscriptSource;
  externalMeetingId: string | null;
  webhookPayload: unknown;
  originalTranscript: string;
  cleanedTranscript: string;
  summary: TranscriptSummary;
  contact: TranscriptContact;
  leadScore: TranscriptLeadScore;
  recapEmail: string | null;
  zohoLeadId: string | null;
  aiUsage?: AiUsage;
  /**
   * The chat panel's suggested question chips, generated once per analysis.
   * Always 0 or exactly 3 entries — a partial set is never stored, because two
   * chips where three are expected reads as a bug rather than a shorter list.
   */
  suggestedQuestions: string[];
  /** Cost of the suggestion call, kept separate from `aiUsage` so each call stays attributable. */
  suggestionUsage?: AiUsage;
}

/** A transcript record as persisted in the store, keyed by id. */
export interface StoredTranscript {
  id: string;
  fields: TranscriptFields;
  createdAt: Date;
  updatedAt: Date;
}
