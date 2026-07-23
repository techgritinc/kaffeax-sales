import { Tooltip } from '@/components/ui/tooltip';
import { Heading } from '@/components/ui/typography';
import { cn } from '@/lib/utils/cn';
import type { Band } from '@/types/rubric.types';
import type { DetectedSignal } from '@/types/scoring.types';

export interface HeardGridProps {
  signals: DetectedSignal[];
  band: Band;
  rationale: string;
}

const COLS: { key: Band; title: string; topBorder: string; titleColor: string }[] = [
  { key: 'hot', title: '▲ Hot', topBorder: 'border-t-green-deep', titleColor: 'text-green-deep' },
  { key: 'warm', title: '● Warm', topBorder: 'border-t-mustard', titleColor: 'text-mustard' },
  { key: 'cold', title: '○ Cold', topBorder: 'border-t-dark-teal', titleColor: 'text-dark-teal' },
];

/** "What we heard" — signals spatially grouped HOT / WARM / COLD with hover evidence. */
export function HeardGrid({ signals, band, rationale }: HeardGridProps) {
  const buckets: Record<Band, DetectedSignal[]> = { hot: [], warm: [], cold: [] };
  signals.forEach((s) => {
    const weight = s.weight in buckets ? s.weight : band;
    buckets[weight].push(s);
  });

  return (
    <section className="mt-8">
      <Heading level={2} smallLabel className="ml-[3px]">
        What we heard
      </Heading>
      {rationale && (
        <div className="text-midnight mt-[2px] mb-3 font-sans text-[13px] leading-[1.55]">
          {rationale}
        </div>
      )}
      <div className="max-bp720:grid-cols-1 max-bp720:gap-2 grid grid-cols-3 gap-3">
        {COLS.map((c) => {
          const items = buckets[c.key];
          return (
            <div
              key={c.key}
              className={cn(
                'rounded-input border-border shadow-heard-col min-w-0 border border-t-[3px] bg-white p-[10px_12px_12px]',
                c.topBorder,
              )}
            >
              <div className="mb-2 flex items-baseline justify-between">
                <span
                  className={cn(
                    'font-sans text-[10.5px] font-extrabold tracking-[0.16em] uppercase',
                    c.titleColor,
                  )}
                >
                  {c.title}
                </span>
                <span className="text-muted font-sans text-[11px] tracking-[0.06em]">
                  {items.length}
                </span>
              </div>
              <ul>
                {items.length === 0 ? (
                  <li className="border-tan/50 text-muted cursor-default border-b border-dotted py-1.5 font-sans text-[12.5px] leading-[1.35] italic last:border-b-0">
                    Nothing fired
                  </li>
                ) : (
                  items.map((s, i) => (
                    <li
                      key={i}
                      className="border-tan/50 text-midnight hover:text-dark-blue cursor-help border-b border-dotted py-1.5 font-sans text-[12.5px] leading-[1.35] font-medium last:border-b-0"
                    >
                      {s.evidence ? <Tooltip content={s.evidence}>{s.label}</Tooltip> : s.label}
                    </li>
                  ))
                )}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
