export interface ZohoTokenFields {
  access_token: string;
  expires_at: Date;
}

export interface ZohoApiResponseInfo {
  per_page: number;
  count: number;
  page: number;
  more_records: boolean;
}

export interface ZohoApiResponse<T> {
  data: T[];
  info?: ZohoApiResponseInfo;
}

export interface ZohoLeadRecord {
  id: string;
  Email: string;
  Full_Name?: string;
  Company?: string;
}

export type ZohoLeadSearchResponse = ZohoApiResponse<ZohoLeadRecord>;

export interface ZohoUpdateResponseDetail {
  code: string;
  details: { id: string };
  message: string;
  status: string;
}

export interface ZohoUpdateResponse {
  data: ZohoUpdateResponseDetail[];
}

export interface ZohoErrorResponse {
  code: string;
  details: Record<string, unknown>;
  message: string;
  status: string;
}

export type CrmMeetingPayload = Record<string, string | number | undefined>;

export interface ZohoTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}
