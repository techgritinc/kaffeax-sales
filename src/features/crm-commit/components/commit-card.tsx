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
    <div className="border-border shadow-commit hover:shadow-commit-hover mb-[14px] rounded-[10px] border bg-white p-[18px_20px] transition-shadow">
      <div className="mb-[6px] flex items-start justify-between gap-[12px]">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-display text-midnight m-0 text-[20px] font-bold">
            {contact.company.value || 'Unnamed company'}
          </h2>
          <Badge band={record.band} />
          <span className="border-green/40 bg-green/[0.14] text-green-deep inline-flex items-center gap-[6px] rounded-[20px] border px-[10px] py-[4px] font-sans text-[10.5px] font-extrabold tracking-[0.06em] uppercase">
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

      <div className="text-muted mb-[12px] text-[12.5px]">
        {contact.name.value || '—'} · {contact.title.value || '—'}
        {contact.email.value && ` · ${contact.email.value}`}
      </div>

      <div className="border-mustard text-midnight my-[12px] border-l-[3px] pl-[12px] font-sans text-[13px] leading-[1.55] italic">
        {record.rationale}
      </div>

      <div className="border-border text-muted mt-[12px] flex items-center justify-between gap-[12px] border-t border-dashed pt-[10px] font-sans text-[11px]">
        <span>Written {writtenAt}</span>
        <span
          className="border-border text-midnight bg-page-bg rounded-[4px] border px-[8px] py-[3px] font-mono text-[11px] tracking-[0.04em]"
          title="Zoho activity record ID"
        >
          Zoho activity · <b className="text-bright-blue font-bold">{record.id}</b>
        </span>
      </div>
    </div>
  );
}
