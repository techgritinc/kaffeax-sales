'use server';

import { mapMeetingToZohoPayload } from '@/constants/zoho/zoho-field-map';
import {
  CRM_EMAIL_MISSING_ERROR,
  CRM_LEAD_NOT_FOUND_ERROR,
  CRM_TRANSCRIPT_NOT_FOUND_ERROR,
  CRM_WRITE_ERROR,
} from '@/constants/crm-commit/action.constants';
import { zohoCrmClient } from '@/integrations/zoho/zoho-crm-client';
import { rubricSignalRepository } from '@/repositories/rubric-signal.repository';
import { transcriptRepository } from '@/repositories/transcript.repository';
import type { LeadScoreBand } from '@/types/transcript.types';

export interface CommitResult {
  success: boolean;
  error?: string;
}

export async function commitToCrm(transcriptId: string): Promise<CommitResult> {
  try {
    const stored = await transcriptRepository.findById(transcriptId);
    if (!stored) {
      return { success: false, error: CRM_TRANSCRIPT_NOT_FOUND_ERROR };
    }

    const email = stored.fields.contact?.email;
    if (!email) {
      return { success: false, error: CRM_EMAIL_MISSING_ERROR };
    }

    const lead = await zohoCrmClient.searchLeadByEmail(email);
    if (!lead) {
      return { success: false, error: CRM_LEAD_NOT_FOUND_ERROR };
    }

    const rubricSignals = await rubricSignalRepository.findActive();
    const signalWeights: Record<string, LeadScoreBand> = {};
    rubricSignals.forEach((s) => {
      signalWeights[s.signalId] = s.weight;
    });

    const payload = mapMeetingToZohoPayload(stored.fields, signalWeights);
    await zohoCrmClient.updateLead(lead.id, payload);

    await transcriptRepository.update(transcriptId, { status: 'saved', zohoLeadId: lead.id });

    return { success: true };
  } catch (error) {
    console.error('[commitToCrm] Failed to write meeting data to CRM', {
      transcriptId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return { success: false, error: CRM_WRITE_ERROR };
  }
}
