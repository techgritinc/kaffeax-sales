export const AI_PROVIDERS = ['anthropic', 'openrouter'] as const;

export type AiProvider = (typeof AI_PROVIDERS)[number];

export interface AiUsage {
  model: string;
  provider: AiProvider;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  inputCostUsd: number;
  outputCostUsd: number;
  cacheCreationCostUsd: number;
  cacheReadCostUsd: number;
  totalCostUsd: number;
}

export const TRANSCRIPT_STATUSES = ['draft', 'saved'] as const;
export const TRANSCRIPT_SOURCES = ['manual', 'zoom', 'ms_teams', 'google_meet'] as const;
export const ATTENDEE_SIDES = ['kaffeax', 'prospect'] as const;
export const LEAD_SCORE_BANDS = ['hot', 'warm', 'cold'] as const;
export const AI_PROCESSING_STATUSES = [
  'pending',
  'processing',
  'success',
  'failed',
  'cancelled',
] as const;

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
  suggestedQuestions: string[];
  suggestionUsage?: AiUsage;
}

export interface StoredTranscript {
  id: string;
  fields: TranscriptFields;
  createdAt: Date;
  updatedAt: Date;
}
