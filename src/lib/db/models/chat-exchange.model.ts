import mongoose, { type HydratedDocument, type Model, Schema } from 'mongoose';

import { aiUsageSchema } from '@/lib/db/models/transcript.model';
import { CHAT_EXCHANGE_KINDS, type ChatExchangeFields } from '@/types/chat.types';

type ChatExchangeSchemaFields = Omit<ChatExchangeFields, 'transcriptId'> & {
  transcriptId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * One completed question-and-answer pair, in its own collection rather than an
 * array on the transcript: `transcriptRepository.findAll()` returns full
 * documents to render the recents sidebar, so embedding conversations there
 * would make a list of meeting titles pull every conversation into memory.
 *
 * There is no update path — an exchange is immutable once written.
 */
const chatExchangeSchema = new Schema<ChatExchangeSchemaFields>(
  {
    transcriptId: { type: Schema.Types.ObjectId, required: true },
    question: { type: String, required: true },
    answer: { type: String, required: true },
    kind: { type: String, required: true, enum: CHAT_EXCHANGE_KINDS },
    usage: { type: aiUsageSchema, required: true },
  },
  { timestamps: true, minimize: false },
);

// Serves the only read query (a meeting's exchanges in order) and the cascade delete.
chatExchangeSchema.index({ transcriptId: 1, createdAt: 1 });

export type ChatExchangeDocument = HydratedDocument<ChatExchangeSchemaFields>;

export const ChatExchange =
  (mongoose.models.ChatExchange as Model<ChatExchangeSchemaFields> | undefined) ||
  mongoose.model<ChatExchangeSchemaFields>('ChatExchange', chatExchangeSchema);
