# Implementation Plan: Suggested Questions Reach the Panel

**Ticket**: TAE-96 | **Branch**: `feat/tae-96-chat-panel-ui-follow-up-fab` | **Date**: 2026-07-31 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/tae-96-suggested-questions-fix/spec.md`

## Summary

The suggestion pipeline is already wired end to end — generation runs during analysis, the result is persisted on the transcript, the record carries it to the panel, and the panel renders it. Nothing needs to be built. What needs to change is that the pipeline throws away almost every set it produces, so the stored value is `[]` and the chip row renders nothing.

Two defects cause that, and a third hides it:

1. **`MAX_SUGGESTION_CHARS = 34`** rejects the whole set if any one question exceeds 34 characters (`suggested-questions.utils.ts` rule V4). 34 characters is approximately the widest single-line chip at the narrowest desktop panel — a *layout* limit mistaken for a *content* limit. It is in direct conflict with the prompt's own Rule 4, which demands the concrete noun the meeting used. A question specific enough to pass Rule 4 usually fails V4.
2. **The retry cannot succeed.** Both integrations re-issue a byte-identical request after a rejection, and the OpenRouter path additionally pins `temperature: 0`. Attempt 2 reproduces the set attempt 1 just rejected. Two attempts, one outcome.
3. **Failed attempts are invisible and uncosted.** Only the winning attempt's token usage is returned, so rejected attempts are spent silently; and a meeting with no chips cannot be distinguished from a meeting where generation never ran.

The approach: re-derive the length ceiling from what the chip row can actually display and raise it to **48 characters**; rewrite the prompt's length rule and its three worked examples so the model's typical output sits inside that budget; make attempt 2 materially different by feeding back the specific rejection rule and lifting the OpenRouter temperature off zero; accumulate usage across all attempts; and log the outcome so a missing row is diagnosable. No component, schema, repository, or visual change.

## Technical Context

**Language/Version**: TypeScript 5 (strict), React 19, Next.js 16 App Router

**Primary Dependencies**: Existing only — Mongoose, Zod, `@anthropic-ai/sdk` (production), OpenRouter via `fetch` (development), Tailwind CSS v4. **No new dependencies.**

**Storage**: MongoDB via `transcriptRepository`. The `suggestedQuestions: [String]` field on `transcript.model.ts:116` already exists and needs no migration.

**Testing**: No test infrastructure exists in this repository (confirmed in `CLAUDE.md`). Verification is the `npm run validate` pipeline plus the manual scenarios in [quickstart.md](./quickstart.md), which is why the quickstart carries the acceptance burden here.

**Target Platform**: Web, desktop-first. Chat panel is 340px wide above 1100px, 300px at ≤1100px, full-width overlay at ≤900px.

**Project Type**: Next.js web application, single project

**Performance Goals**: Suggestion generation adds ≤5s to the analysis wait at p95 (SC-005). Attempt count stays at 2 to hold that bound.

**Constraints**:

- Chip row width is **222px** at the binding width (300px panel − 36px panel padding − 42px row indent, at ≤1100px). Per-chip text width is ~196px after 12px×2 padding and 1px×2 border.
- Constitution §XII requires 1:1 fidelity with `Design/POC_Kaffea-X_Prototype.html`. The chip's styling (`.kx-chat-chip`, 11.5px/600/6px 12px/20px radius) is already an exact match and must not change.
- Constitution §V caps files at 150 lines. Both integration files are already 103 and 123 lines.

**Scale/Scope**: 5 files changed, 1 file added. No database migration, no new component, no new dependency, no API surface change.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| § | Principle | Verdict | Note |
|---|---|---|---|
| I | Tech stack & env validation | ✅ Pass | No new dependency, no env change |
| II | CSS & design tokens | ✅ Pass | No style changes; chip classes untouched |
| III | TypeScript strictness | ✅ Pass | No `any`, no `!`; discriminated unions already in `suggested-questions.types.ts` |
| IV | Linting & formatting | ✅ Pass | Gated by `npm run validate` |
| V | Modularity (<150 lines) | ⚠️ Justified | Adding retry feedback + usage accumulation to two integration files (103 and 123 lines) would breach 150. Mitigated by extracting shared logic to a new util — see Complexity Tracking |
| VI | Reusable UI components | ✅ Pass | No new components |
| VII | Utility purity | ✅ Pass | Validation and accumulation stay pure functions in `lib/utils/` |
| VIII | Zod validation | ✅ Pass | `SuggestedQuestionsSchema` already governs the AI response |
| IX | Repository layer | ✅ Pass | All writes already go through `transcriptRepository` |
| X | Server actions | ✅ Pass | `runAiSummarization` is already a server action; no route handler added |
| XI | Type isolation | ✅ Pass | Plain types in `src/types/suggested-questions.types.ts`, Mongoose-only code in the model |
| XII | Design fidelity | ⚠️ Gate | Chips must stay pixel-identical to the prototype. Raising the ceiling permits longer chips, so the row's rendered result must be verified at 1440/1100/900/560 against the prototype. This forced a correction to spec SC-007 — see Spec Corrections |
| XIII | AI-assisted workflow | ✅ Pass | Logic/architecture task; spec + this plan replace the brainstorming step, with the one open design choice resolved in research.md R1 |
| XIV | Error handling & observability | ✅ Pass | No bare `catch`; logs carry rule identifiers and counts, never question text (FR-027) |
| XV | Quality & performance | ✅ Pass | The ceiling stays a named constant; no magic number introduced |
| XVI | Git & deployment | ✅ Pass | Branch `feat/tae-96-chat-panel-ui-follow-up-fab` matches `type/short-description` |
| XVII | No barrel imports | ✅ Pass | New util imported directly from its source file; no `index.ts` |
| XVIII | camelCase | ✅ Pass | Response contract is already `{ "questions": [...] }` |
| XIX | Spec directory naming | ✅ Fixed | Directory was created as `006-fix-suggested-questions-display`, which §XIX prohibits. Renamed to `specs/tae-96-suggested-questions-fix` and `.specify/feature.json` updated before planning proceeded |

**Post-Phase 1 re-check**: see [Post-Design Constitution Re-Check](#post-design-constitution-re-check).

## Spec Corrections

Planning surfaced one error in the spec that had to be corrected rather than implemented:

**SC-007's "the chip row never exceeds two lines"** was inherited from the prior specification and is not verifiable as written. Chips wrap as whole units in a 222px row, so three chips of realistic length occupy three rows — and the prototype's own chip text (`"What pricing did they mention?"`, `"Any competitor references?"`, `"Summarize next steps"`) plausibly already does so at 262px. A bound that the canonical design itself violates cannot be an acceptance criterion, and under §XII the prototype wins.

SC-007 has been rewritten to bound the two things that actually matter and can be measured: **parity with the prototype's own wrapping behaviour at each checkpoint width**, and **no individual chip exceeding two lines of text**, which is the property the length ceiling genuinely controls. No horizontal overflow is retained unchanged.

## Project Structure

### Documentation (this feature)

```text
specs/tae-96-suggested-questions-fix/
├── plan.md              # This file
├── research.md          # Phase 0 — the ceiling, the retry, usage, observability
├── data-model.md        # Phase 1 — entities and validation rules
├── quickstart.md        # Phase 1 — runnable verification scenarios
├── contracts/
│   ├── ai-response.md   # The JSON the model must return
│   ├── validation.md    # V1–V5 rules and their justification
│   └── attempts.md      # Attempt sequencing, feedback, and usage accumulation
├── checklists/
│   └── requirements.md  # Spec quality checklist (all 17 items pass)
└── tasks.md             # Phase 2 — created by /speckit-tasks, NOT by this command
```

### Source Code (repository root)

```text
src/
├── constants/
│   └── suggested-questions.ts          # MODIFY — ceiling 34→48; rewrite length rule + 3 worked examples; add retry-feedback template
├── lib/utils/
│   ├── suggested-questions.utils.ts    # MODIFY — V4 justification comment; no logic change beyond the constant
│   └── suggestion-attempts.utils.ts    # ADD — pure attempt sequencing: feedback text + usage accumulation (§V mitigation)
├── integrations/
│   ├── openrouter/suggested-questions.ts  # MODIFY — corrective retry turn, temperature off zero on retry, accumulate usage
│   └── claude/suggested-questions.ts      # MODIFY — corrective retry turn, accumulate usage
└── features/workflow/actions/
    └── transcript-ai.actions.ts        # MODIFY — log attempted/not-attempted outcome explicitly (FR-026)
```

Unchanged and verified correct during investigation, listed so the implementation does not touch them:

```text
src/features/assistant-chat/components/suggested-questions.tsx   # renders 3-or-nothing — already correct (FR-021)
src/features/assistant-chat/components/chat-messages.tsx         # no CHIPS array remains — already correct (FR-003)
src/features/workflow/utils/transcript.mapper.ts                 # carries the field to MeetingRecord — already correct
src/lib/db/models/transcript.model.ts                            # field exists — no migration
src/schemas/suggested-questions.schema.ts                        # camelCase contract — already correct
Design/POC_Kaffea-X_Prototype.html                               # reference artefact — never edited
```

**Structure Decision**: Single Next.js project, existing directories only. The one added file is a pure utility in `src/lib/utils/` because both provider integrations need identical attempt-sequencing behaviour, and duplicating it would breach §V's line cap in both files while risking the two providers drifting apart — which is precisely how the OpenRouter path ended up with `temperature: 0` and the Claude path without it.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| New file `src/lib/utils/suggestion-attempts.utils.ts` (§V modularity pressure) | Corrective-retry text and cross-attempt usage accumulation are needed identically by both provider integrations, which sit at 103 and 123 lines against a 150-line cap | Inlining in both files would add ~30 lines each — breaching the cap in the Claude file and leaving the OpenRouter file with no headroom — and would duplicate logic across two files that have *already* drifted once (`temperature: 0` on one side only). A single pure util keeps both files compliant and makes the two providers verifiably consistent |

## Phase 0 — Research

Complete. See [research.md](./research.md). Four questions resolved:

- **R1** — What should the length ceiling be, and how is it derived? → **48 characters**, derived from the 222px binding row width and a two-text-line-per-chip bound.
- **R2** — How is a retry made materially different without breaching the latency bound? → Corrective feedback turn naming the failed rule, plus `temperature: 0.7` on OpenRouter retries; attempt count stays at 2.
- **R3** — How is usage accounted across attempts? → Accumulate every attempt's tokens and cost; the returned usage becomes the sum, not the winner's.
- **R4** — What must be logged to make a missing chip row diagnosable? → An explicit outcome discriminator covering not-attempted / no-response / rejected / stored, with rule identifier and counts only.

**Output**: `research.md`, no NEEDS CLARIFICATION remaining.

## Phase 1 — Design & Contracts

Complete. Artifacts generated:

- **[data-model.md](./data-model.md)** — the three spec entities mapped onto existing types and the one persisted field, with validation rules and the set's state transitions across analysis and re-analysis. No schema change.
- **[contracts/ai-response.md](./contracts/ai-response.md)** — the exact JSON contract, camelCase per §XVIII, and the tolerated response wrappings.
- **[contracts/validation.md](./contracts/validation.md)** — V1–V5, each tied to the user-visible consequence that justifies it per FR-005, including the corrected V4 derivation.
- **[contracts/attempts.md](./contracts/attempts.md)** — attempt sequencing, the corrective feedback contract, usage accumulation, and the outcome discriminator for FR-026.
- **[quickstart.md](./quickstart.md)** — verification scenarios for SC-001 through SC-014, including the visual parity checks at 1440/1100/900/560 that §XII requires and the forced-failure and forced-rejection paths.

### Post-Design Constitution Re-Check

| § | Re-verdict after design | Note |
|---|---|---|
| V | ✅ Pass | With the shared util extracted, projected line counts stay under 150: OpenRouter ~118, Claude ~112, new util ~55 |
| XII | ✅ Pass, gated by verification | Design introduces no style change. SC-007 now bounds parity against the prototype and per-chip height, both measured in quickstart Scenario 5. The 48-char ceiling was derived *from* the layout rather than chosen against it |
| XIII | ✅ Pass | The single open design choice (R1) is resolved with rationale and rejected alternatives recorded |
| XIV | ✅ Pass | `contracts/attempts.md` fixes the log fields as rule identifiers, counts, and provider metadata only — no question text, transcript, or analysis content |
| XVIII | ✅ Pass | Contract confirmed camelCase; the corrective feedback turn adds no new fields |
| All others | ✅ Pass | Unchanged from the pre-Phase-0 check |

No new violations. The one entry in Complexity Tracking stands and is unchanged by the design.

## What this plan deliberately does not do

- Does not touch `suggested-questions.tsx`, `chat-messages.tsx`, or `chat-panel.tsx` — investigation confirmed all three already satisfy their requirements, and editing correct code to fix a bug elsewhere is how the next regression gets introduced.
- Does not add a fallback question list — settled as Option A in the spec.
- Does not backfill existing meetings.
- Does not raise the attempt count above 2, which would put SC-005's 5-second bound at risk for a marginal success-rate gain.
- Does not trim, truncate, or otherwise repair an over-length question. FR-007 requires whole-set rejection; silently editing a question would make the stored set something the model did not write and the ceiling unfalsifiable.
- Does not edit `Design/POC_Kaffea-X_Prototype.html`. It is the reference artefact, and the three hard-coded questions inside it are the design's illustration, not application code.
