import mongoose, { type HydratedDocument, type Model, Schema } from 'mongoose';

import {
  type RubricSignalFields,
  SIGNAL_SOURCES,
  SIGNAL_WEIGHTS,
} from '@/types/rubric-signal.types';

const rubricSignalSchema = new Schema<RubricSignalFields>(
  {
    signalId: { type: String, required: true, unique: true },
    label: { type: String, required: true },
    weight: { type: String, required: true, enum: SIGNAL_WEIGHTS },
    source: { type: String, required: true, enum: SIGNAL_SOURCES },
    hints: { type: [String], default: [] },
    isActive: { type: Boolean, required: true, default: true },
  },
  { timestamps: true },
);

rubricSignalSchema.index({ signalId: 1 }, { unique: true });
rubricSignalSchema.index({ weight: 1 });
rubricSignalSchema.index({ isActive: 1 });

export type RubricSignalDocument = HydratedDocument<RubricSignalFields>;

export const RubricSignal =
  (mongoose.models.RubricSignal as Model<RubricSignalFields> | undefined) ||
  mongoose.model<RubricSignalFields>('RubricSignal', rubricSignalSchema);
