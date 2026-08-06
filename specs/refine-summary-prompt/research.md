# Research: Concise, Non-Redundant Call Summary

No `[NEEDS CLARIFICATION]` markers remained in the spec, and the Technical Context above
introduces no new dependency, storage, or platform choice. This document instead resolves
the two real design questions this feature raises: how to structure the narrative, and how
to stop cross-section duplication — both prompt-engineering decisions, not technology
choices.

## Decision 1: Structure the narrative as prose with three required components, not new JSON fields

**Decision**: Keep `narrative` as a single string field. Instruct the model to compose it
as three short, ordered parts — (1) why the meeting happened, (2) the most important
outcomes, (3) what remains unresolved — each a short paragraph (target: 2-4 sentences),
rather than a chronological retelling of the call.

**Rationale**:
- `narrative` is already consumed as a plain string in four places: the UI (`summary-block.tsx`), the Zoho CRM export (`zoho-field-map.ts` → `Meeting_Summary`), the chat-assistant grounding context (`grounding.utils.ts`), and the Mongoose model. Splitting it into sub-fields (e.g. `narrativePurpose` / `narrativeKeyOutcomes` / `narrativeUnresolved`) would require touching the schema, the type, the DB model, the UI, the Zoho field map, and the grounding renderer — a wide blast radius to solve a problem that is really about *prompt instructions*, not data shape.
- The spec's requirement (FR-001) is that a reader can "separately identify" the three parts — this is satisfiable by requiring the three parts to appear as distinguishable paragraphs in a fixed order within the existing string, with no new schema surface.
- This matches constitution §XV (simplicity preferred; nothing more complex than the problem demands) and avoids speculative changes to consumers that don't need to change.

**Alternatives considered**:
- **Three separate JSON fields.** Rejected: correct in the abstract, but disproportionate — it touches 6+ files for a benefit (independent field-level access) nothing currently requests. Revisit only if a future consumer needs to read/style the three parts independently (e.g., the UI wants three visually distinct blocks instead of one paragraph block).
- **Leave `narrative` unstructured but just say "be concise."** Rejected: this is close to what the current prompt already implies ("2-4 paragraph prose synthesis") and is exactly what produced the reported wall-of-text output — "be concise" without a required shape doesn't reliably change model behavior. An explicit three-part structure gives the model (and a human reviewer) a checklist to satisfy.

## Decision 2: Prevent cross-section duplication via an explicit classification rule + a self-check step, not code-level dedup

**Decision**: Add an explicit precedence rule to the field definitions for
`whatWasCovered` / `whatWasDecided` / `actionItems` — a forward-looking commitment with an
owner is an Action Item only; a procedural agreement that is not itself an assignable task
is a Decision only; anything else discussed is a Covered Topic only — and add a step to
`ANALYTICAL_APPROACH` requiring the model to cross-check its own draft output for the same
fact appearing under more than one of these three fields before finalizing, removing it
from all but the correct one.

**Rationale**:
- This is a **structured-output** model call (`zodOutputFormat(AiSummaryResponseSchema)` in `transcript-summarizer.ts`) — the JSON shape is already enforced by the SDK; only field *content* is discretionary. There is no code layer between "model decides what goes where" and "we render it" where a generic dedup pass could safely run: the three fields hold semantically different kinds of strings (a topic vs. a decision vs. a task with owner/date), so any code-level similarity check would need to do the same semantic classification the prompt should be doing anyway, making it redundant with — and less reliable than — fixing it at generation time.
- Giving the model an explicit precedence rule (which field "wins" when a fact could fit more than one) is the standard prompt-engineering fix for this class of problem: without a stated precedence, the model has no way to know "set up trial access" belongs only in Action Items, so it reasonably includes it in both the summary of what was discussed and the list of what to do next.
- Adding an explicit self-check step mirrors the existing `ANALYTICAL_APPROACH`'s pattern (it already has a 5-step ordered process ending in "Compose the output. No fact from steps 2 or 3 may be discarded.") — this feature adds a final ordering constraint ("no fact may appear in more than one of these three fields") to that same existing structure, rather than inventing a new mechanism.

**Alternatives considered**:
- **Post-process the AI response in code to strip duplicate strings across the three arrays.** Rejected: exact-string matching would miss near-duplicate paraphrases (the reported bug already shows two *different* phrasings of the same fact — "Set up trial account... today" vs. "Set up trial access..." — so naive string equality wouldn't have caught it), and fuzzy/semantic matching would require an extra LLM call or embedding comparison, which is disproportionate machinery for a problem the generating prompt can resolve directly.
- **Merge `whatWasCovered` and `whatWasDecided` into one field.** Rejected: out of scope — the spec explicitly keeps these as distinct fields (FR-004, FR-005); the problem is unclear precedence between them and `actionItems`, not that the fields themselves are redundant.

## Decision 3: Validation approach given no automated test suite

**Decision**: Validate manually against representative transcripts (starting with the
reported "Transcript 1" case) using a before/after comparison: regenerate the summary,
check the narrative for the three required components, check the three list fields for
zero cross-duplication, and check every guardrail/figure/commitment enumerated from the
transcript is still traceable somewhere in the output.

**Rationale**: `CLAUDE.md` states no testing infrastructure exists yet in this repo. Since
the output is LLM-generated prose/lists rather than deterministic code, a manual
transcript-driven checklist (documented in `quickstart.md`) is the appropriate validation
method already used implicitly by prior specs in this codebase for prompt-quality work
(e.g. `tae-82-summary-scoring-prompt`).

**Alternatives considered**: Automated LLM-as-judge scoring. Rejected as out of scope —
no such harness exists in this repo today, and introducing one is a separate, larger
initiative than this focused prompt fix.
