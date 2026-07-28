import mongoose, { type HydratedDocument, type Model, Schema } from 'mongoose';

import { type ZohoTokenFields } from '@/types/zoho.types';

const zohoCredentialSchema = new Schema<ZohoTokenFields>(
  {
    access_token: { type: String, required: true },
    expires_at: { type: Date, required: true },
  },
  { timestamps: true },
);

export type ZohoCredentialDocument = HydratedDocument<ZohoTokenFields>;

export const ZohoCredential =
  (mongoose.models.ZohoCredential as Model<ZohoTokenFields> | undefined) ||
  mongoose.model<ZohoTokenFields>('ZohoCredential', zohoCredentialSchema, 'zohocredentials');
