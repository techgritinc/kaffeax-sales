# Contract: AI Summary Output (revised content rules)

This documents the behavioral contract the summarization prompt must satisfy. The JSON
**shape** is unchanged and remains enforced by
[`AiSummaryResponseSchema`](../../../src/schemas/ai-summary-response.schema.ts) via
structured output (`zodOutputFormat`) in
[`transcript-summarizer.ts`](../../../src/integrations/claude/transcript-summarizer.ts).
This contract governs the **content rules** the prompt in
[`src/constants/summarization.ts`](../../../src/constants/summarization.ts) must encode,
which is what changes under this feature.

## Field: `narrative` (string)

**MUST**:
- Answer three questions — Purpose (why the meeting happened), Key Outcomes (the most
  important results), Unresolved (what remains open) — from ordinary flowing prose,
  within the **existing 1-2 paragraph format**. No headings, labels, or bullet points may
  be introduced to mark these three questions, and no additional paragraphs are added
  beyond that existing format. (Clarified 2026-08-06 — see spec.md Clarifications.)
- Read as a synthesis, not a chronological retelling — no turn-by-turn narration of the
  conversation.
- Preserve every guardrail, constraint, figure, deadline, and commitment required by the
  pre-existing `CORE_ACCURACY_MANDATE` — brevity must never cause information loss.

**MUST NOT**:
- Repeat, in the narrative, a fact whose full detail is already the express purpose of a
  structured field (`whatWeHeard`, `whatWasCovered`, `whatWasDecided`, `actionItems`) —
  the narrative synthesizes; it does not duplicate the structured lists verbatim.
- Grow beyond the existing 1-2 paragraph format to accommodate the three questions as
  separate paragraphs or sections — brevity is achieved by tightening the prose, not by
  adding structure.

## Fields: `whatWasCovered` / `whatWasDecided` / `actionItems`

**MUST**:
- Partition the call's facts with no overlap, per the classification precedence below
  (highest wins when a fact could fit more than one):
  1. Has an owner and happens after the call → `actionItems` only.
  2. Is an agreement on how to proceed, not itself an assignable task → `whatWasDecided`
     only.
  3. Everything else discussed → `whatWasCovered` only.
- Each entry appears in exactly one of the three fields.

**MUST NOT**:
- Contain the same fact — verbatim or in close paraphrase — in more than one of these
  three fields.

## Verification

Since output is model-generated and this repo has no automated test suite yet
(`CLAUDE.md`), this contract is verified manually per transcript using the checklist in
[`quickstart.md`](../quickstart.md): regenerate the summary, confirm the narrative's three
components are each identifiable, and confirm zero fact appears in more than one of
`whatWasCovered` / `whatWasDecided` / `actionItems`.
