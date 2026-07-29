import mongoose, { type HydratedDocument, type Model, Schema } from 'mongoose';

import {
  AI_PROCESSING_STATUSES,
  ATTENDEE_SIDES,
  type ActionItem,
  type Attendee,
  type DetectedSignal,
  LEAD_SCORE_BANDS,
  TRANSCRIPT_SOURCES,
  TRANSCRIPT_STATUSES,
  type TranscriptContact,
  type TranscriptFields,
  type TranscriptLeadScore,
  type TranscriptSummary,
} from '@/types/transcript.types';

type TranscriptSchemaFields = Omit<TranscriptFields, 'userId'> & {
  userId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const actionItemSchema = new Schema<ActionItem>(
  {
    description: { type: String, required: true },
    owner: { type: String, required: true },
    dueDate: { type: String },
  },
  { _id: false },
);

const attendeeSchema = new Schema<Attendee>(
  {
    name: { type: String, required: true },
    side: { type: String, required: true, enum: ATTENDEE_SIDES },
  },
  { _id: false },
);

const detectedSignalSchema = new Schema<DetectedSignal>(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
    evidence: { type: String, required: true },
  },
  { _id: false },
);

const summarySchema = new Schema<TranscriptSummary>(
  {
    narrative: { type: String, default: '' },
    whatWeHeard: { type: [String], default: [] },
    whatWasCovered: { type: [String], default: [] },
    whatWasDecided: { type: [String], default: [] },
    actionItems: { type: [actionItemSchema], default: [] },
    attendees: { type: [attendeeSchema], default: [] },
  },
  { _id: false },
);

const contactSchema = new Schema<TranscriptContact>({ email: { type: String } }, { _id: false });

const leadScoreSchema = new Schema<TranscriptLeadScore>(
  {
    band: { type: String, enum: LEAD_SCORE_BANDS },
    detectedSignals: { type: [detectedSignalSchema], default: [] },
    rationale: { type: String, default: '' },
    scorePercentage: { type: Number, default: 0 },
  },
  { _id: false },
);

const transcriptSchema = new Schema<TranscriptSchemaFields>(
  {
    userId: { type: Schema.Types.ObjectId, required: true },
    title: { type: String, required: true },
    status: { type: String, required: true, enum: TRANSCRIPT_STATUSES, default: 'draft' },
    aiProcessingStatus: {
      type: String,
      required: true,
      enum: AI_PROCESSING_STATUSES,
      default: 'pending',
    },
    source: { type: String, required: true, enum: TRANSCRIPT_SOURCES },
    // No `default: null` — the unique+sparse index below only excludes documents where the
    // field is entirely absent; an explicit `null` default would make every draft "have" the
    // field with the same value and collide on the second document ever created.
    externalMeetingId: { type: String },
    webhookPayload: { type: Schema.Types.Mixed, default: null },
    originalTranscript: { type: String, required: true },
    cleanedTranscript: { type: String, default: '' },
    summary: { type: summarySchema, default: {} },
    contact: { type: contactSchema, default: {} },
    leadScore: { type: leadScoreSchema, default: {} },
    recapEmail: { type: String, default: null },
    zohoLeadId: { type: String },
  },
  // minimize: false — otherwise Mongoose strips empty nested objects (e.g. contact: {})
  // from both the persisted document and toObject() output, before contact.email is ever set.
  { timestamps: true, minimize: false },
);

transcriptSchema.index({ userId: 1, status: 1, createdAt: -1 });
transcriptSchema.index({ userId: 1, createdAt: -1 });
transcriptSchema.index({ externalMeetingId: 1 }, { unique: true, sparse: true });
transcriptSchema.index({ zohoLeadId: 1 }, { sparse: true });

export type TranscriptDocument = HydratedDocument<TranscriptSchemaFields>;

export const Transcript =
  (mongoose.models.Transcript as Model<TranscriptSchemaFields> | undefined) ||
  mongoose.model<TranscriptSchemaFields>('Transcript', transcriptSchema);
