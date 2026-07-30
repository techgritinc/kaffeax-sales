// ─── Limits ───────────────────────────────────────────────────────────────────

/** Chips in the row. Fixed by the panel's design, not configurable. */
export const SUGGESTED_QUESTION_COUNT = 3;

/**
 * Longest accepted question, derived from the narrowest chat column so a chip's
 * text never wraps inside the pill:
 *
 *   300px column (≤bp1100, see shell-cols.ts)
 *   − 36px panel padding (p-[20px_18px])
 *   − 42px chip row offset (ml-[42px])
 *   − 26px chip padding + border (px-[12px] + 1px)
 *   = 196px ÷ ~5.5px per char (Figtree semibold, 11.5px) ≈ 35 chars
 *
 * For calibration, the hard-coded chips this replaced were 30, 26, and 20
 * characters — this is the existing design measured, not a new constraint.
 * Recheck the arithmetic if the chat column width or chip padding changes.
 */
export const MAX_SUGGESTION_CHARS = 34;

/**
 * Attempts per meeting when the model returns an unusable or non-compliant set.
 * One retry, not zero: a failure means no chips for that meeting permanently
 * (there is no backfill), and the retry only fires in the rare case.
 */
export const MAX_SUGGESTION_ATTEMPTS = 2;

// ─── Model parameters ─────────────────────────────────────────────────────────

/** Output is ~150 characters of JSON; the remaining headroom caps thinking. */
export const SUGGESTION_MAX_TOKENS = 512;

/** Picking three questions from material already in context is retrieval work. */
export const SUGGESTION_EFFORT = 'low' as const;

// ─── Task framing ─────────────────────────────────────────────────────────────

export const SUGGESTION_PERSONA =
  `You write the three suggested questions that appear in the follow-up panel of Kaffea-X, a B2B specialty coffee marketplace connecting roasters, distributors, and small-lot producers with buyers.\n\n` +
  `A member of the sales team has just had one sales call analysed and is looking at its summary. Your three questions are the chips they can tap instead of typing. Each one is sent, exactly as you write it, to an assistant that can only answer from this meeting's transcript and analysis — the same two sources you are given below.\n\n` +
  `You are not answering anything. You are choosing the three most useful things this person could ask about this call.`;

// ─── What makes a good question ───────────────────────────────────────────────

export const SUGGESTION_RULES = `## Rules

1. **The answer must already be in the sources.** Before you write a question, find the answer in the transcript or the analysis. If you cannot point to where the answer is, discard the question and pick another. This is the rule that matters most: the assistant will refuse anything the meeting did not cover, so a question about an absent topic produces a dead end and teaches the reader that the panel does not work. A section rendered as \`(none)\` in the analysis was never discussed — never ask about it.

2. **Three different aspects.** Draw each question from a different area of the call. Available areas include: what the prospect quantified (figures, dates, durations, volumes), what they objected to or hesitated over, what was decided or committed to, who owns which next step, what the lead score rested on, and what they said about their current setup. Pick three that this meeting actually supports — not three angles on the same topic.

3. **Each question stands alone.** The assistant answers every question in isolation and cannot see the others. No "that", "they", "it", or "the second one" — name the subject inside the question.

4. **Specific to this call.** A question that would fit any sales call has failed. Prefer the concrete noun the meeting actually used ("the Shopify migration", "the June launch", "the 200kg order") over the generic category ("their systems", "the timeline", "the volume"). If a stranger could have written your question without reading this transcript, replace it.

5. **At most ${MAX_SUGGESTION_CHARS} characters.** Roughly six words. These are chips in a narrow panel, not sentences. A longer question is discarded by the software before anyone sees it, so length is a hard limit rather than a preference.

6. **Natural voice.** Write the way a salesperson glancing at the summary would ask. A question or a short imperative both work. No formal register, no "Could you please elaborate on", no preamble.

7. **Follow the meeting's language.** If the call was conducted in a language other than English, write the questions in that language.`;

// ─── Output contract ──────────────────────────────────────────────────────────

export const SUGGESTION_OUTPUT_CONTRACT = `## Output Format

Return ONLY valid, parseable JSON. Your entire response must be a single JSON object that passes JSON.parse() without error. No text, prose, explanation, or code fences outside the JSON.

Use exactly this camelCase key:

{
  "questions": ["string", "string", "string"]
}

Exactly ${SUGGESTED_QUESTION_COUNT} entries. Not two, not four. A set with the wrong number of entries is discarded whole, and so is a set containing a duplicate, an empty string, or a question longer than ${MAX_SUGGESTION_CHARS} characters — in every one of those cases the reader gets no suggestions at all.`;

// ─── Worked examples ──────────────────────────────────────────────────────────

const EXAMPLE_GOOD = `Example — a good set (32, 30, and 29 characters):

{
  "questions": [
    "What did they say about pricing?",
    "Who owns the Q3 pilot rollout?",
    "Why did the June launch slip?"
  ]
}

Each is answerable from the call, each covers a different aspect — an objection, an owner, a timeline — and each stands on its own.`;

const EXAMPLE_TOO_LONG = `Example — rejected for length. The second question is 45 characters, over the ${MAX_SUGGESTION_CHARS}-character limit, so this whole set is discarded and the reader sees nothing:

{
  "questions": [
    "Who owns the pilot?",
    "What pricing concerns did the customer raise?",
    "When do they decide?"
  ]
}

Written as "What did they push back on in pricing?" it would still be too long. "What pricing did they push back on?" is 34 and fits.`;

const EXAMPLE_TOO_GENERIC = `Example — rejected by rule 4. Every one of these could have been written without reading the transcript:

{
  "questions": [
    "What were the next steps?",
    "What did they say?",
    "Summarize the meeting"
  ]
}`;

export const SUGGESTION_OUTPUT_EXAMPLES = [
  EXAMPLE_GOOD,
  EXAMPLE_TOO_LONG,
  EXAMPLE_TOO_GENERIC,
].join('\n\n');

// ─── User turn ────────────────────────────────────────────────────────────────

export const SUGGESTION_USER_INSTRUCTION = `Write the ${SUGGESTED_QUESTION_COUNT} suggested questions for this meeting.`;
