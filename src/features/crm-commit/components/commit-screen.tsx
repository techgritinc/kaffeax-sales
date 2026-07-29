import { Button } from '@/components/ui/button/button';
import { AccentBar } from '@/components/ui/typography/accent-bar';
import { Eyebrow } from '@/components/ui/typography/eyebrow';
import { Heading } from '@/components/ui/typography/heading';
import type { MeetingRecord } from '@/types/meeting.types';

import { CommitCard } from './commit-card';

export interface CommitScreenProps {
  record: MeetingRecord | null;
  onNewCapture: () => void;
  onOpenInReview: (id: string) => void;
}

/** CRM confirmation screen — shows the record just saved to CRM. */
export function CommitScreen({ record, onNewCapture, onOpenInReview }: CommitScreenProps) {
  return (
    <div className="w-full">
      <div className="mb-5">
        <Eyebrow>Saved to CRM</Eyebrow>
        <Heading level={1}>This meeting is saved</Heading>
        <AccentBar />
        <p className="text-muted mb-6 text-[14px] leading-[1.55]">
          The activity record below has been saved and marked CRM.
        </p>
      </div>

      <div className="mb-4 flex justify-end">
        <Button variant="ghost" iconStart="FileText" iconSize={13} onClick={onNewCapture}>
          Capture another meeting
        </Button>
      </div>

      {record === null || !record.committed ? (
        <div className="text-muted p-[18px_4px] font-sans text-[12px] leading-[1.55]">
          Approve a draft on the Review step to see it here.
        </div>
      ) : (
        <CommitCard record={record} onOpenInReview={onOpenInReview} />
      )}
    </div>
  );
}
