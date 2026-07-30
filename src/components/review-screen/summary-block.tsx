import { Heading } from '@/components/ui/typography/heading';

export interface SummaryBlockProps {
  narrative: string;
}

/** Generated narrative paragraph in a left-accented editorial block. */
export function SummaryBlock({ narrative }: SummaryBlockProps) {
  return (
    <section className="mt-[8px]">
      <Heading level={2} smallLabel className="mb-[8px]">
        Summary
      </Heading>
      <div className="border-midnight text-text shadow-narrative from-cream-50 mt-[4px] rounded-[0_8px_8px_0] border-l-[3px] bg-gradient-to-b to-white p-[20px_24px] font-sans text-[15px] leading-[1.7]">
        {narrative || 'Meeting recap will appear here.'}
      </div>
    </section>
  );
}
