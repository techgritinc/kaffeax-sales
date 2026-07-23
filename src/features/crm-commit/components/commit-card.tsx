import { Badge } from '@/components/ui/badge/badge';
import { Button } from '@/components/ui/button/button';
import { Icon } from '@/components/ui/icon/icon';
import type { MeetingRecord } from '@/types/meeting.types';
import type { CrmRecord } from '@/types/workflow.types';

export interface CommitCardProps {
  record: CrmRecord;
  libraryRecord: MeetingRecord | null;
  onOpenInReview: (record: MeetingRecord) => void;
}

/** A single committed CRM activity card shown on the commit screen. */
export function CommitCard({ record, libraryRecord, onOpenInReview }: CommitCardProps) {
  const { contact } = record;
  const writtenAt = record.at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="rounded-card-sm border-border shadow-commit hover:shadow-commit-hover mb-3.5 border bg-white p-[18px_20px] transition-shadow">
      <div className="mb-1.5 flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-display text-midnight m-0 text-[20px] font-bold">
            {contact.company.value || 'Unnamed company'}
          </h2>
          <Badge band={record.band} />
          <span className="rounded-pill border-green/40 bg-green/[0.14] text-green-deep inline-flex items-center gap-1.5 border px-2.5 py-1 font-sans text-[10.5px] font-extrabold tracking-[0.06em] uppercase">
            <Icon name="CheckCircle2" size={12} /> Written to Zoho
          </span>
        </div>
        {libraryRecord && (
          <Button
            variant="ghost"
            iconStart="FileText"
            iconSize={13}
            onClick={() => onOpenInReview(libraryRecord)}
            title="Open this record in Review"
          >
            Open in Review
          </Button>
        )}
      </div>

      <div className="text-muted mb-3 text-[12.5px]">
        {contact.name.value || '—'} · {contact.title.value || '—'}
        {contact.email.value && ` · ${contact.email.value}`}
      </div>

      <div className="border-mustard text-midnight my-3 border-l-[3px] pl-3 text-[13px] leading-[1.55] italic">
        {record.rationale}
      </div>

      <div className="border-border text-muted mt-3 flex items-center justify-between gap-3 border-t border-dashed pt-2.5 font-sans text-[11px]">
        <span>Written {writtenAt}</span>
        <span
          className="rounded-input-sm border-border bg-page-bg text-midnight border px-2 py-[3px] font-mono tracking-[0.04em]"
          title="Zoho activity record ID"
        >
          Zoho activity · <b className="text-bright-blue">{record.id}</b>
        </span>
      </div>
    </div>
  );
}
