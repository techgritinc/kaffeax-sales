import { env } from '@env';

import { zohoAuth } from '@/integrations/zoho/zoho-auth';
import {
  type CrmMeetingPayload,
  type ZohoLeadRecord,
  type ZohoLeadSearchResponse,
  type ZohoUpdateResponse,
} from '@/types/zoho.types';

class ZohoCrmClient {
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async searchLeadByEmail(email: string): Promise<ZohoLeadRecord | null> {
    if (!email.trim()) {
      throw new Error('Email is required to search for a lead');
    }

    try {
      const response = await zohoAuth.makeAuthenticatedRequest(
        `${this.baseUrl}/Leads/search?email=${encodeURIComponent(email)}`,
      );

      if (response.status === 204 || response.status === 404) {
        return null;
      }

      if (response.ok) {
        const data = (await response.json()) as ZohoLeadSearchResponse;
        console.log(data);
        return data.data[0] ?? null;
      }

      const errorBody = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      console.error('[ZohoCrm] Lead search failed:', {
        status: response.status,
        code: errorBody['code'],
      });
      throw new Error('Failed to search for lead in CRM');
    } catch (error) {
      if (error instanceof Error && error.message === 'Failed to search for lead in CRM') {
        throw error;
      }
      console.error(
        '[ZohoCrm] Lead search error:',
        error instanceof Error ? error.message : 'Unknown error',
      );
      throw new Error('Failed to search for lead in CRM');
    }
  }

  async updateLead(recordId: string, payload: CrmMeetingPayload): Promise<ZohoUpdateResponse> {
    if (!recordId.trim()) {
      throw new Error('Record ID is required to update a lead');
    }

    const response = await zohoAuth.makeAuthenticatedRequest(`${this.baseUrl}/Leads/${recordId}`, {
      method: 'PUT',
      body: { data: [payload], trigger: ['workflow'] },
    });

    console.log(response);

    if (!response.ok) {
      const errorBody = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      console.error('[ZohoCrm] Lead update failed:', {
        status: response.status,
        recordId,
        code: errorBody['code'],
      });
      throw new Error('Failed to update lead in CRM');
    }

    const result = (await response.json()) as ZohoUpdateResponse;
    const detail = result.data[0];
    console.log(detail);
    if (!detail || detail.status !== 'success') {
      console.error('[ZohoCrm] Lead update rejected by Zoho:', {
        recordId,
        code: detail?.code,
        message: detail?.message,
      });
      throw new Error('Failed to update lead in CRM');
    }

    return result;
  }
}

export const zohoCrmClient = new ZohoCrmClient(env.ZOHO_CRM_API_BASE_URL);
