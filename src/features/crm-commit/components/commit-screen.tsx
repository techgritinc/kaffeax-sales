import { Button } from '@/components/ui/button';
import { AccentBar, Eyebrow, Heading } from '@/components/ui/typography';
import type { MeetingRecord } from '@/types/meeting.types';
import type { CrmRecord } from '@/types/workflow.types';

import { CommitCard } from './commit-card';

export interface CommitScreenProps {
  crm: CrmRecord[];
  activeId: string | null;
  library: MeetingRecord[];
  onNewCapture: () => void;
  onOpenInReview: (record: MeetingRecord) => void;
}

/** CRM confirmation screen — shows the activity record just written to Zoho. */
export function CommitScreen({
  crm,
  activeId,
  library,
  onNewCapture,
  onOpenInReview,
}: CommitScreenProps) {
  const records = crm.filter((r) => r.id === activeId);

  return (
    <div className="w-full">
      <div className="mb-5">
        <Eyebrow>Written to CRM</Eyebrow>
        <Heading level={1}>This meeting is now in Zoho</Heading>
        <AccentBar />
        <p className="text-muted mb-6 text-[14px] leading-[1.55]">
          The activity record below was just written to the Zoho CRM
        </p>
      </div>

      <div className="mb-4 flex justify-end">
        <Button variant="ghost" iconStart="FileText" iconSize={13} onClick={onNewCapture}>
          Capture another meeting
        </Button>
      </div>

      {records.length === 0 ? (
        <div className="text-muted p-[18px_4px] font-sans text-[12px] leading-[1.55]">
          Approve a draft on the Review step to see the CRM activity here.
        </div>
      ) : (
        records.map((r) => (
          <CommitCard
            key={r.id}
            record={r}
            libraryRecord={library.find((l) => l.id === r.id) ?? null}
            onOpenInReview={onOpenInReview}
          />
        ))
      )}
    </div>
  );
}
