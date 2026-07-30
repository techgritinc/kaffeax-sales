'use client';

import { SUGGESTED_QUESTION_COUNT } from '@/constants/suggested-questions';

export interface SuggestedQuestionsProps {
  /** Exactly three, or empty. Anything else renders nothing. */
  questions: string[];
  onSelect: (question: string) => void;
}

/**
 * The chip row under the opening message (`.kx-chat-chips` 715–738).
 *
 * A meeting either has three generated questions or none. With none, the row and
 * its eyebrow disappear entirely — no placeholder and no generic fallback, since
 * a chip written for a different meeting is worse than no chip at all.
 */
export function SuggestedQuestions({ questions, onSelect }: SuggestedQuestionsProps) {
  if (questions.length !== SUGGESTED_QUESTION_COUNT) return null;

  return (
    <>
      <div className="text-muted mb-[6px] ml-[42px] font-sans text-[9.5px] font-extrabold tracking-[0.12em] uppercase">
        Suggested
      </div>
      <div className="max-bp900:ml-[42px] max-bp900:mr-0 mt-[2px] mb-[14px] ml-[42px] flex flex-wrap gap-[6px]">
        {questions.map((question) => (
          <button
            key={question}
            type="button"
            className="border-tan text-midnight hover:border-green hover:text-green-deep hover:bg-sidebar-new-text cursor-pointer rounded-[20px] border bg-white/[0.72] px-[12px] py-[6px] font-sans text-[11.5px] font-semibold transition-all"
            onClick={() => onSelect(question)}
          >
            {question}
          </button>
        ))}
      </div>
    </>
  );
}
