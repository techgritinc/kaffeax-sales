import { ZohoCredential } from '@/lib/db/models/zoho-credential.model';
import { withDb } from '@/lib/db/withDb';
import { type ZohoTokenFields } from '@/types/zoho.types';

export function getZohoToken(): Promise<ZohoTokenFields | null> {
  return withDb(() => ZohoCredential.findOne().lean<ZohoTokenFields | null>());
}

export function saveZohoToken(token: ZohoTokenFields): Promise<ZohoTokenFields | null> {
  return withDb(() =>
    ZohoCredential.findOneAndUpdate(
      {},
      { access_token: token.access_token, expires_at: token.expires_at },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).lean<ZohoTokenFields | null>(),
  );
}
