import { Heading } from '@/components/ui/typography';

export interface SummaryBlockProps {
  narrative: string;
}

/** Generated narrative paragraph in a left-accented editorial block. */
export function SummaryBlock({ narrative }: SummaryBlockProps) {
  return (
    <section className="mt-2">
      <Heading level={2} smallLabel className="mb-[4px]">
        Summary
      </Heading>
      <div className="border-midnight from-cream-50 text-text shadow-narrative mt-0 rounded-[0_8px_8px_0] border-l-[3px] bg-linear-to-b to-white p-[20px_24px] font-sans text-[15px] leading-[1.7]">
        {narrative || 'Meeting recap will appear here.'}
      </div>
    </section>
  );
}
