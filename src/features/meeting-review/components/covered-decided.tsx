import { Heading } from '@/components/ui/typography';

export interface CoveredDecidedProps {
  topics: string[];
  decisions: string[];
}

const CARD = 'flex-1 rounded-card-sm border border-border bg-white p-[6px_18px] shadow-bcard';
const ROW =
  'flex items-start gap-3 border-b border-border py-3 text-[13.5px] leading-[1.55] text-ink-blue last:border-b-0';
const NUM =
  'mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-bold';
const EMPTY = 'p-[14px_2px] font-sans text-[13px] text-muted italic';

/** Side-by-side "What was covered" (topics) and "What was decided" (decisions). */
export function CoveredDecided({ topics, decisions }: CoveredDecidedProps) {
  return (
    <section className="mt-8">
      <div className="max-bp900:grid-cols-1 grid grid-cols-2 gap-5">
        <div className="flex min-w-0 flex-col">
          <Heading level={2} smallLabel className="ml-[3px]">
            What was covered
          </Heading>
          {topics.length === 0 ? (
            <div className={EMPTY}>No topics captured.</div>
          ) : (
            <div className={CARD}>
              <ul>
                {topics.map((t, i) => (
                  <li key={i} className={ROW}>
                    <span className={`${NUM} bg-green/[0.18] text-green-deep`}>
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
          <Heading level={2} smallLabel className="ml-[3px]">
            What was decided
          </Heading>
          {decisions.length === 0 ? (
            <div className={EMPTY}>No decisions captured.</div>
          ) : (
            <div className={CARD}>
              <ul>
                {decisions.map((d, i) => (
                  <li key={i} className={ROW}>
                    <span className={`${NUM} bg-midnight/10 text-midnight`}>✓</span>
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
