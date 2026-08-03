'use client';

import { buildEmailContent } from '@/lib/utils/workflow/email-formatter';
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
  const band = draft.leadScore.band;
  const score = draft.leadScore.scorePercentage;
  const title = draft.summary.meetingTitle || 'Untitled meeting';
  const emailMissing = !draft.contact.email.value.trim();

  const onEmail = () => {
    const { subject, body } = buildEmailContent(draft);
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
        disabled={committed}
      />
      <SummaryBlock narrative={draft.summary.narrative} />
      <HeardGrid
        signals={draft.leadScore.detectedSignals}
        band={band}
        rationale={draft.leadScore.rationale}
      />
      <CoveredDecided topics={draft.summary.topics} decisions={draft.summary.decisions} />
      <ActionItems nextSteps={draft.summary.nextSteps} commitments={draft.summary.commitments} />
    </div>
  );
}
