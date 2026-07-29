import { RubricSignal, type RubricSignalDocument } from '@/lib/db/models/rubric-signal.model';
import { withDb } from '@/lib/db/withDb';
import type { RubricSignalFields } from '@/types/rubric-signal.types';

function toFields(doc: RubricSignalDocument): RubricSignalFields {
  const { signalId, label, weight, source, hints, numericWeight, isActive } = doc.toObject();
  return { signalId, label, weight, source, hints, numericWeight, isActive };
}

class RubricSignalRepository {
  findActive(): Promise<RubricSignalFields[]> {
    return withDb(async () => {
      const docs = await RubricSignal.find({ isActive: true });
      return docs.map(toFields);
    });
  }

  create(doc: RubricSignalFields): Promise<RubricSignalFields> {
    return withDb(async () => {
      const created = await RubricSignal.create(doc);
      return toFields(created);
    });
  }

  update(id: string, patch: Partial<RubricSignalFields>): Promise<RubricSignalFields | null> {
    return withDb(async () => {
      const updated = await RubricSignal.findOneAndUpdate({ signalId: id }, patch, {
        new: true,
        runValidators: true,
      });
      return updated ? toFields(updated) : null;
    });
  }

  delete(id: string): Promise<boolean> {
    return withDb(async () => {
      const result = await RubricSignal.findOneAndDelete({ signalId: id });
      return result !== null;
    });
  }
}

export const rubricSignalRepository = new RubricSignalRepository();
