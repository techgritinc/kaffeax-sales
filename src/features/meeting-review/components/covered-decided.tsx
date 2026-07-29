import { Heading } from '@/components/ui/typography/heading';

export interface CoveredDecidedProps {
  topics: string[];
  decisions: string[];
}

const CARD = 'flex-1 rounded-[10px] border border-border bg-white p-[6px_18px] shadow-list-card';
const ROW =
  'flex items-start gap-[12px] border-b border-border py-[12px] font-sans text-[13.5px] leading-[1.55] text-ink-blue last:border-b-0';
const NUM =
  'mt-px flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-bold';
const EMPTY = 'p-[14px_2px] font-sans text-[13px] text-muted italic';

/** Side-by-side "What was covered" (topics) and "What was decided" (decisions). */
export function CoveredDecided({ topics, decisions }: CoveredDecidedProps) {
  return (
    <section className="mt-[32px]">
      <div className="max-bp900:grid-cols-1 mt-[2px] grid grid-cols-2 gap-[20px]">
        <div className="flex min-w-0 flex-col">
          <div className="mb-[2px] ml-[3px] flex items-start justify-between">
            <Heading level={2} smallLabel className="mb-[8px]">
              What was covered
            </Heading>
          </div>
          {topics.length === 0 ? (
            <div className={EMPTY}>No topics captured.</div>
          ) : (
            <div className={CARD}>
              <ul>
                {topics.map((t, i) => (
                  <li key={i} className={ROW}>
                    <span className={`${NUM} bg-numbered-badge-green-bg text-green-deep`}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-col">
          <div className="mb-[2px] ml-[3px] flex items-start justify-between">
            <Heading level={2} smallLabel className="mb-[8px]">
              What was decided
            </Heading>
          </div>
          {decisions.length === 0 ? (
            <div className={EMPTY}>No decisions captured.</div>
          ) : (
            <div className={CARD}>
              <ul>
                {decisions.map((d, i) => (
                  <li key={i} className={ROW}>
                    <span className={`${NUM} bg-numbered-badge-ink-bg text-midnight`}>✓</span>
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
