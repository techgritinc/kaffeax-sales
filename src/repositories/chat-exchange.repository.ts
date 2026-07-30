import { ChatExchange, type ChatExchangeDocument } from '@/lib/db/models/chat-exchange.model';
import { withDb } from '@/lib/db/withDb';
import type { ChatExchangeFields, StoredChatExchange } from '@/types/chat.types';

function toStoredChatExchange(doc: ChatExchangeDocument): StoredChatExchange {
  const { _id, transcriptId, createdAt, updatedAt, __v: _v, ...rest } = doc.toObject();
  return {
    id: _id.toString(),
    fields: { ...rest, transcriptId: transcriptId.toString() } as ChatExchangeFields,
    createdAt,
    updatedAt,
  };
}

class ChatExchangeRepository {
  /** A meeting's exchanges, oldest first — the order the panel renders them in. */
  listByTranscript(transcriptId: string): Promise<StoredChatExchange[]> {
    return withDb(async () => {
      const docs = await ChatExchange.find({ transcriptId }).sort({ createdAt: 1 });
      return docs.map(toStoredChatExchange);
    });
  }

  create(fields: ChatExchangeFields): Promise<StoredChatExchange> {
    return withDb(async () => {
      const doc = await ChatExchange.create(fields);
      return toStoredChatExchange(doc);
    });
  }

  /** Removes a meeting's whole conversation. No conversation outlives its meeting. */
  deleteByTranscript(transcriptId: string): Promise<number> {
    return withDb(async () => {
      const result = await ChatExchange.deleteMany({ transcriptId });
      return result.deletedCount;
    });
  }
}

export const chatExchangeRepository = new ChatExchangeRepository();
