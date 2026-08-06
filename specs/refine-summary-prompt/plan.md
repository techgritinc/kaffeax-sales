# Implementation Plan: Concise, Non-Redundant Call Summary

**Branch**: `refine-summary-prompt` | **Date**: 2026-08-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/refine-summary-prompt/spec.md`

## Summary

The call-summarization prompt in `src/constants/summarization.ts` currently produces a `narrative` that retells the call turn-by-turn as a dense wall of text, and its field definitions for `whatWasCovered` / `whatWasDecided` / `actionItems` give the model no rule for avoiding overlap, so the same commitment (e.g. "set up trial access") gets restated verbatim under two headings. The fix is a **prompt-only change**: rewrite the relevant prompt constants to (a) require the narrative — still flowing prose in the existing 1-2 paragraph format, with no headings/labels/bullets introduced — to answer three questions: why the meeting happened, the most important outcomes, and what remains unresolved, instead of a chronological retelling, and (b) add an explicit classification precedence rule (forward-looking + owned → Action Item; procedural agreement → Decided; everything else → Discussed) plus a self-check instruction so the model removes cross-section duplicates before finalizing its answer. No JSON schema, type, database, or UI change is needed: `narrative` stays a single string and `whatWasCovered`/`whatWasDecided`/`actionItems` stay the same array shapes already enforced by `AiSummaryResponseSchema` via structured output — only the instructions that produce their *content* change.

> **Clarified 2026-08-06**: the three questions must be answerable from ordinary flowing prose in the existing 1-2 paragraph narrative format — no explicit headings, labels, or bullet points are introduced to mark them. See the spec's Clarifications section.

## Technical Context

**Language/Version**: TypeScript 5 (existing stack, no change)

**Primary Dependencies**: None added. Touches only `src/constants/summarization.ts`, consumed unchanged via `src/lib/utils/summarization-prompt.utils.ts` → `src/lib/utils/structured-analysis.utils.ts` → `src/integrations/claude/transcript-summarizer.ts` / `src/integrations/openrouter/*`.

**Storage**: N/A — no schema, model, or persisted-field change. `AiSummaryResponseSchema`, `TranscriptSummary`, and the Mongoose `transcript.model.ts` fields are unchanged.

**Testing**: No automated test suite exists yet in this repo (per `CLAUDE.md`). Validation is manual and performed by the user directly (regenerating summaries for representative transcripts, including the reported "Transcript 1" case, and checking them against the completeness/duplication checklist in `quickstart.md`) — it is not a task for the implementer to execute.

**Target Platform**: Existing Next.js 16 server runtime (no change).

**Project Type**: Single Next.js web application (existing structure, no new project/module).

**Performance Goals**: N/A — this is a prompt wording change; no new latency or throughput target beyond the existing Claude/OpenRouter call already made per transcript.

**Constraints**: Output must remain valid, schema-conformant JSON under the existing `AiSummaryResponseSchema` (structured output via `zodOutputFormat`), and must continue to satisfy the pre-existing zero-information-loss / transcript-only accuracy mandate (`CORE_ACCURACY_MANDATE`) — this feature changes organization and de-duplication rules only, never the sourcing rules.

**Scale/Scope**: One file of prompt constants (`src/constants/summarization.ts`); no new files, modules, or downstream consumer changes required.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Tech Stack & Framework | ✅ Pass | No framework/dependency change. |
| II. CSS & Design Tokens | N/A | No UI change. |
| III. TypeScript Strictness | ✅ Pass | Edits are to typed `string` template constants only; no `any`, no `!`. |
| IV. Linting & Formatting | ✅ Pass | `npm run validate` will be run before considering implementation done. |
| V. Code Modularity | ✅ Pass | Existing constants file stays organized by section (persona / mandate / approach / format / field defs); no monolithic growth. |
| VI–X, XI (UI/utils/schemas/repos/actions/types) | N/A | No components, utils, forms, repositories, server actions, or types are added or changed. |
| XII. Design Fidelity | N/A | No UI change. |
| XIII. AI-Assisted Development Workflow | ✅ Pass | Non-visual/logic change — routed through `superpowers` spec-kit flow (`/speckit-specify` → `/speckit-plan` → `/speckit-tasks` → `/speckit-implement`), satisfying the "explore requirements, get approval before implementation" requirement for non-visual work. |
| XIV. Error Handling & Observability | ✅ Pass | No new code paths; existing malformed-response handling in `structured-analysis.utils.ts` is untouched. |
| XV. Quality & Performance | ✅ Pass | Prompt-only approach is the simplest change that satisfies the spec — avoids speculative schema/type/DB/UI changes (YAGNI). |
| XVIII. camelCase Naming | N/A | No new fields introduced. |
| XIX. Spec Directory Naming Convention | ⚠️ Documented deviation | Directory uses a plain slug (`refine-summary-prompt`) instead of a ticket-ID prefix — no ticket exists yet for this work; explicitly approved by the user during `/speckit-specify`. |

No other violations. Nothing requires an entry in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/refine-summary-prompt/
├── plan.md                              # This file (/speckit-plan command output)
├── research.md                          # Phase 0 output (/speckit-plan command)
├── data-model.md                        # Phase 1 output (/speckit-plan command)
├── quickstart.md                        # Phase 1 output (/speckit-plan command)
├── contracts/
│   └── summary-output-contract.md       # Phase 1 output (/speckit-plan command)
└── tasks.md                             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

This is a single Next.js 16 application (existing `src/` layout per the constitution's Directory Architecture — no new project or structural option is introduced). Only one file changes; the rest are listed because they consume its output unchanged and are covered by the quickstart validation.

```text
src/
├── constants/
│   └── summarization.ts                 # CHANGED — prompt persona, mandate, approach,
│                                         #   field definitions rewritten for narrative
│                                         #   structure + section de-duplication rules
├── lib/utils/
│   ├── summarization-prompt.utils.ts    # UNCHANGED — assembles the constants above
│   └── structured-analysis.utils.ts     # UNCHANGED — parses/validates the AI response
├── schemas/
│   └── ai-summary-response.schema.ts    # UNCHANGED — JSON schema/shape stays the same
├── types/
│   └── transcript.types.ts              # UNCHANGED — TranscriptSummary shape stays the same
├── lib/db/models/
│   └── transcript.model.ts              # UNCHANGED — persisted fields stay the same
├── integrations/
│   ├── claude/transcript-summarizer.ts  # UNCHANGED — already forces structured output
│   │                                     #   via the (unchanged) schema
│   └── openrouter/*                     # UNCHANGED — same prompt, same schema
└── components/review-screen/
    └── summary-block.tsx                # UNCHANGED — renders whatever `narrative`
                                          #   string arrives; content improves, not props
```

**Structure Decision**: Single project, no new files or modules. The change is confined to
the prompt constants in `src/constants/summarization.ts`; every consumer downstream
(schema, types, DB model, summarizer integrations, UI, Zoho export, chat grounding) keeps
its current shape and only receives better-organized, de-duplicated *content* in the same
fields. This was chosen over introducing separate JSON fields per narrative component
(see `research.md` for the rejected alternative and rationale).

## Complexity Tracking

No violations requiring justification. The one documented deviation (spec directory
naming, §XIX) is a naming-convention exception explicitly approved by the user during
`/speckit-specify`, not an engineering-principle violation, so no complexity-tracking
entry applies.
