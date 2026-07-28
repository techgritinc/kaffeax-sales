import { Tag } from '@/components/ui/chip/tag';
import { Heading } from '@/components/ui/typography/heading';
import type { Commitment, NextStep, Side } from '@/types/meeting.types';

export interface ActionItemsProps {
  nextSteps: NextStep[];
  commitments: Commitment[];
}

interface ActionRow {
  owner: string | null;
  text: string;
  due: string | null;
}

const SIDE_LABEL: Record<Side, string> = { kaffea_x: 'Kaffea-X', prospect: 'Prospect' };

/** Unified action-items list combining next steps and commitments. */
export function ActionItems({ nextSteps, commitments }: ActionItemsProps) {
  const rows: ActionRow[] = [
    ...nextSteps.map((ns) => ({
      owner: ns.owner || null,
      text: ns.description,
      due: ns.due_date || null,
    })),
    ...commitments.map((c) => ({
      owner: SIDE_LABEL[c.side] ?? null,
      text: c.description,
      due: null,
    })),
  ];

  return (
    <section className="mt-[32px]">
      <div className="mb-[2px] ml-[3px] flex items-start justify-between">
        <Heading level={2} smallLabel className="mb-[8px]">
          Action items
        </Heading>
      </div>
      {rows.length === 0 ? (
        <div className="text-muted p-[14px_2px] font-sans text-[13px] italic">
          No action items captured.
        </div>
      ) : (
        <div className="border-border shadow-list-card rounded-[10px] border bg-white p-[6px_18px]">
          <ul>
            {rows.map((it, i) => (
              <li
                key={i}
                className="border-border flex items-start gap-[12px] border-b py-[12px] last:border-b-0"
              >
                <span className="bg-numbered-badge-warm-bg text-toast-text-dark mt-px flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-bold">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="text-midnight block min-w-0 font-sans text-[15px] leading-[1.6]">
                  <span className="text-midnight">
                    {it.owner && <b className="text-midnight mr-[2px] font-bold">{it.owner}:</b>}{' '}
                    {it.text}
                  </span>
                  {it.due && (
                    <Tag tone="due" className="ml-[8px] inline-flex align-[1px]">
                      {it.due}
                    </Tag>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
