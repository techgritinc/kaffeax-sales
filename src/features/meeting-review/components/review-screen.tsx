'use client';

import { SCORE_BY_BAND } from '@/constants/bands';
import type { MeetingRecord } from '@/types/meeting.types';

import { ActionItems } from './action-items';
import { CoveredDecided } from './covered-decided';
import { HeardGrid } from './heard-grid';
import { MetaStrip } from './meta-strip';
import { ReviewHero } from './review-hero';
import { SummaryBlock } from './summary-block';

export interface ReviewScreenProps {
  draft: MeetingRecord;
  committed: boolean;
  onPatch: (path: string, value: unknown) => void;
  onApprove: () => void;
  onReject: () => void;
}

/** The review dossier — composes the hero, meta strip, and all summary sections. */
export function ReviewScreen({
  draft,
  committed,
  onPatch,
  onApprove,
  onReject,
}: ReviewScreenProps) {
  const band = draft.lead_score.band;
  const score = SCORE_BY_BAND[band];
  const title = draft.summary.meeting_title || 'Untitled meeting';
  const emailMissing = !draft.contact.email.value.trim();

  const onEmail = () => {
    const subject = draft.recap_email.subject || '';
    const body = draft.recap_email.body || '';
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div className="w-full">
      <ReviewHero
        title={title}
        band={band}
        score={score}
        committed={committed}
        emailMissing={emailMissing}
        onApprove={onApprove}
        onReject={onReject}
        onEmail={onEmail}
      />
      <MetaStrip
        attendees={draft.summary.attendees}
        email={draft.contact.email.value}
        onEmailChange={(v) => onPatch('contact.email.value', v)}
      />
      <SummaryBlock narrative={draft.summary.narrative} />
      <HeardGrid
        signals={draft.lead_score.detected_signals}
        band={band}
        rationale={draft.lead_score.rationale}
      />
      <CoveredDecided topics={draft.summary.topics} decisions={draft.summary.decisions} />
      <ActionItems nextSteps={draft.summary.next_steps} commitments={draft.summary.commitments} />
    </div>
  );
}
