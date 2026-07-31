import { Transcript, type TranscriptDocument } from '@/lib/db/models/transcript.model';
import { withDb } from '@/lib/db/withDb';
import type { RecentsPageResult } from '@/types/recents.types';
import type { StoredTranscript, TranscriptFields } from '@/types/transcript.types';

function toStoredTranscript(doc: TranscriptDocument): StoredTranscript {
  const { _id, userId, createdAt, updatedAt, __v: _v, ...rest } = doc.toObject();
  return {
    id: _id.toString(),
    fields: { ...rest, userId: userId.toString() } as TranscriptFields,
    createdAt,
    updatedAt,
  };
}

class TranscriptRepository {
  findAll(): Promise<StoredTranscript[]> {
    return withDb(async () => {
      const docs = await Transcript.find().sort({ createdAt: -1 });
      return docs.map(toStoredTranscript);
    });
  }

  findById(id: string): Promise<StoredTranscript | null> {
    return withDb(async () => {
      const doc = await Transcript.findById(id);
      return doc ? toStoredTranscript(doc) : null;
    });
  }

  create(fields: Partial<TranscriptFields>): Promise<StoredTranscript> {
    return withDb(async () => {
      const doc = await Transcript.create(fields);
      return toStoredTranscript(doc);
    });
  }

  update(id: string, patch: Partial<TranscriptFields>): Promise<StoredTranscript | null> {
    return withDb(async () => {
      const doc = await Transcript.findByIdAndUpdate(id, patch, {
        new: true,
        runValidators: true,
      });
      return doc ? toStoredTranscript(doc) : null;
    });
  }

  delete(id: string): Promise<boolean> {
    return withDb(async () => {
      const result = await Transcript.findByIdAndDelete(id);
      return result !== null;
    });
  }

  findPage(page: number, limit: number): Promise<RecentsPageResult> {
    const safePage = Math.max(1, page);
    return withDb(async () => {
      const skip = (safePage - 1) * limit;
      const [total, docs] = await Promise.all([
        Transcript.countDocuments(),
        Transcript.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
      ]);
      const items = docs.map(toStoredTranscript);
      return { items, total, hasMore: safePage * limit < total };
    });
  }

  searchByTitle(query: string, limit = 20): Promise<StoredTranscript[]> {
    if (!query.trim()) return Promise.resolve([]);
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return withDb(async () => {
      const docs = await Transcript.find({ title: { $regex: escapedQuery, $options: 'i' } })
        .sort({ createdAt: -1 })
        .limit(limit)
        .collation({ locale: 'en', strength: 2 });
      return docs.map(toStoredTranscript);
    });
  }
}

export const transcriptRepository = new TranscriptRepository();
