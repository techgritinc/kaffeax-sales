# Implementation Plan: AI-Generated Suggested Questions

**Branch**: `feat/chat-panel` | **Date**: 2026-07-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/tae-96-dynamic-suggested-questions/spec.md`

## Summary

Replace the three hard-coded chips in `chat-messages.tsx` with three AI-generated, meeting-specific questions produced once during transcript analysis and stored on the transcript document.

The approach — D1 in [research.md](./research.md) — is a **second AI request** issued by `runAiSummarization` after the analysis has already been written to the database, using the same grounding projection the chat assistant answers from (`buildGroundingContext` + `renderAnalysis`). Folding the questions into the existing summarization contract was rejected: it would make a 40-character question able to fail a meeting's summary, and it would perturb a prompt whose output quality is measured by TAE-82.

Three properties do the work. **Failure isolation is structural**: by the time the suggestion call is attempted, `aiProcessingStatus: 'success'` is already committed, so no suggestion outcome can reach back and undo an analysis (FR-022). **Absence is a first-class state**: a set is stored whole or not at all, and no set means no chip row and no heading — never a generic fallback, which would reinstate exactly the pre-written content the parent feature removed (FR-014, FR-017). **The layout bound is enforced in code, not requested in prose**: 34 characters, derived from the 300px chat column (D7), rejected deterministically rather than trusted to the model.

The delivery path adds no work at panel open. `MeetingRecord` gains `suggestedQuestions`, which reaches `ChatPanel` beside the `openingMessage` it already receives, so the chips are present in the first render with zero requests (FR-002, SC-004).

## Technical Context

**Language/Version**: TypeScript 5 (strict), React 19, Next.js 16 App Router

**Primary Dependencies**: `@anthropic-ai/sdk` (installed), OpenRouter via `fetch`, Zod 4, Mongoose 9, Tailwind v4. **No new dependencies.**

**Storage**: MongoDB via the repository layer. Two additive fields on the existing `transcripts` collection — `suggestedQuestions: string[]` and `suggestionUsage?: AiUsage`. No new collection, no migration, no backfill.

**Testing**: No test infrastructure exists in this repository. Verification is `npm run validate` plus the manual protocol in [quickstart.md](./quickstart.md), where SC-002 and SC-003 are actually measured.

**Target Platform**: Web (server actions + client components), Node runtime

**Project Type**: Single Next.js application

**Performance Goals**: Suggestion generation adds ≤5s to the analysis wait at p95 (SC-005). Zero added latency at panel open (SC-004).

**Constraints**: A suggestion failure must be invisible to the user (FR-023) and must never affect analysis status (FR-022). Chip text ≤34 characters so no chip wraps internally at 300px (D7). No suggestion, transcript, or analysis text in logs (FR-026). Panel appearance unchanged (FR-021, SC-008).

**Scale/Scope**: Three strings ≤34 chars per meeting, bounded forever. ~9 new files, ~8 edited, 0 deleted.

## Constitution Check

*GATE: must pass before Phase 0. Re-checked after Phase 1 — see bottom of file.*

| § | Gate | How this plan satisfies it |
|---|---|---|
| I | Next.js 16 App Router, no new frameworks | No new dependencies. Reuses the installed Anthropic SDK, `fetch`, Mongoose. |
| II | Tailwind tokens only, no hex, no inline `style` | The extracted chip component carries the existing classes across verbatim. No new token, no new class, no `style` prop. |
| III | No `any`, no `!`, explicit shared types | Provider response is a discriminated union; AI output parsed through Zod from `unknown`; no non-null assertions — the mapper reads `fields.suggestedQuestions ?? []`. |
| IV | ESLint/Prettier clean, conventional commits | `npm run validate` is the gate. The awaited suggestion call satisfies `no-floating-promises` (which is why D2 rejected fire-and-forget). |
| V | ≤150 lines per component file | `chat-messages.tsx` is 92 lines and *shrinks*: the chip row moves to `suggested-questions.tsx` (~30 lines). Generation logic lives in integrations and utils, not components. |
| VI | Reusable UI primitives | `suggested-questions.tsx` is a self-contained presentational component driven entirely by props. |
| VII | Pure utils extracted | Prompt assembly and set validation are pure modules in `src/lib/utils/`, shared by both providers. |
| VIII | Zod is the only validator | `suggested-questions.schema.ts` is the sole gate on AI output. No hand-rolled parsing. |
| IX | No DB access outside repositories | Both writes go through the existing `transcriptRepository.update`. No new repository is needed (D4). |
| X | Server Actions for mutations, no `/app/api/` | No new server action — the existing `runAiSummarization` is extended. No route handlers. |
| XI | Types isolated by domain; plain types split from Mongoose | New `src/types/suggested-questions.types.ts` (zero Mongoose dependency); the two new transcript fields are declared in `src/types/transcript.types.ts` and only *schema'd* in `transcript.model.ts`. |
| XII | Prototype is the visual source of truth | Zero visual change; D7's cap is derived *from* the prototype's chip scale rather than imposed on it. Verified side-by-side (SC-008). |
| XIII | Logic work → brainstorm → plan → implement | Spec written and validated first; design settled here, in research.md, before any code. |
| XIV | Categorised errors, no bare `catch`, user-safe messages, no sensitive data in logs | Provider errors reuse `handleSdkError` / `mapHttpError`. The suggestion `catch` logs with context and swallows deliberately per FR-022/FR-023 — the one place a swallow is the specified behaviour, and it is not bare. Logs carry ids, categories, counts, lengths — never content (FR-026). |
| XV | Named constants, no magic values, loading/empty/error states | `src/constants/suggested-questions.ts` holds the count, char cap, attempt limit, `max_tokens`, effort, and every prompt fragment. The empty state is the designed default; there is deliberately no loading or error state (D13). |
| XVII | No barrel files | Every consumer imports from the declaring file. The factory is a named module, not a barrel. |
| XVIII | camelCase everywhere, including AI contracts and DB fields | AI contract is `{ "questions": [...] }`; DB fields are `suggestedQuestions` / `suggestionUsage`. No mapping layer. |
| XIX | Spec dir is `<ticket-id>-<short-description>` | `specs/tae-96-dynamic-suggested-questions`; `.specify/feature.json` points at it. |

**Result: PASS.** No violations, so Complexity Tracking is omitted.

Two notes:

- **§XIV and the deliberate swallow.** FR-022 and FR-023 require a caught suggestion failure to be logged and then dropped. That is the constitution's "logged with context" branch, not its prohibited bare `catch {}` — the distinction is that the failure is categorised and logged, and its user-visible consequence (no row) is a designed state.
- **§IX and the second write.** Two `transcriptRepository.update` calls in one action is composition at the action layer, which is where cross-step coordination belongs. No new repository class is warranted for two fields on an existing document (D4).

## Project Structure

### Documentation (this feature)

```text
specs/tae-96-dynamic-suggested-questions/
├── plan.md                      # This file
├── research.md                  # Phase 0 — decisions D1–D14
├── data-model.md                # Phase 1 — fields, invariants, write sequence
├── quickstart.md                # Phase 1 — how to run it, how SC-001…SC-011 are measured
├── contracts/
│   ├── ai-response.md           # The suggestion JSON contract + validation rules
│   ├── prompt.md                # Prompt structure and section order
│   └── workflow-integration.md  # Action sequence, persistence, and the UI prop path
├── checklists/
│   └── requirements.md          # Spec quality checklist — 16/16
└── tasks.md                     # Phase 2 — created by /speckit-tasks, NOT by this command
```

### Source Code (repository root)

```text
src/
├── constants/
│   └── suggested-questions.ts                  # NEW  count, char cap, attempts, max_tokens,
│                                               #      effort, persona/task/rules/output contract
├── schemas/
│   └── suggested-questions.schema.ts           # NEW  Zod: shape + count + length + distinctness
├── types/
│   ├── suggested-questions.types.ts            # NEW  SuggestedQuestionsResponse union, categories
│   ├── transcript.types.ts                     # EDIT TranscriptFields += suggestedQuestions,
│   │                                           #      suggestionUsage
│   └── meeting.types.ts                        # EDIT MeetingRecord += suggestedQuestions
├── lib/
│   ├── utils/
│   │   ├── suggested-questions-prompt.utils.ts # NEW  assemble system prompt from constants +
│   │   │                                       #      the shared grounding projection
│   │   └── suggested-questions.utils.ts        # NEW  parse + validate a candidate set (pure)
│   └── db/models/
│       └── transcript.model.ts                 # EDIT two additive fields; reuses aiUsageSchema
├── integrations/
│   ├── suggested-questions.factory.ts          # NEW  SuggestedQuestionsLike + env selection
│   ├── claude/suggested-questions.ts           # NEW  effort low, adaptive thinking, one retry
│   └── openrouter/suggested-questions.ts       # NEW  json_object, temperature 0, one retry
├── features/
│   ├── workflow/
│   │   ├── actions/transcript-ai.actions.ts    # EDIT clear on re-run; generate + second write
│   │   └── utils/transcript.mapper.ts          # EDIT map suggestedQuestions into MeetingRecord
│   │                                           #      (and deliberately NOT into the patch)
│   └── assistant-chat/components/
│       ├── suggested-questions.tsx             # NEW  eyebrow + chips, or nothing
│       ├── chat-messages.tsx                   # EDIT drop CHIPS; render the new component
│       └── chat-panel.tsx                      # EDIT accept + forward suggestedQuestions
└── components/common/app-shell/app-shell.tsx   # EDIT pass wf.draft?.suggestedQuestions
```

**Structure Decision**: Follows the shape the two existing AI features already settled. Prompt assembly and validation sit in `src/lib/utils/` rather than in the feature, because both provider integrations consume them and `src/integrations/` must never import from a feature — the same reason `structured-analysis.utils.ts` and `grounded-chat-prompt.utils.ts` live there. Types are split into a new domain file (§XI) rather than appended to `chat.types.ts`, which is documented as the grounded-*answer* contract; the transcript's two new fields are declared in `transcript.types.ts` and only schema'd in the model, keeping the plain types Mongoose-free.

**Not touched, deliberately**: `src/lib/utils/structured-analysis.utils.ts` and `src/constants/summarization.ts` (D1 — the analysis prompt and contract are untouched); `src/features/assistant-chat/hooks/use-meeting-chat.ts` (D8 — suggestions are static per meeting, so the hook gains no state); `deleteTranscript` (D4 — suggestions die with their document, so there is no cascade to write).

## Implementation Phases

Ordered so each phase leaves the tree type-checking and the app runnable.

**Phase 1 — Contracts, types, and constants.** `suggested-questions.types.ts`, `suggested-questions.schema.ts`, `constants/suggested-questions.ts`, and the two additive fields in `transcript.types.ts` + `transcript.model.ts`. No behaviour; establishes the shapes and makes the field readable (as `[]`) end to end.

**Phase 2 — Prompt and validation core.** `suggested-questions-prompt.utils.ts` assembles the system prompt from frozen constants, reusing `renderAnalysis` and the existing untrusted-content rule and delimiters (FR-013). `suggested-questions.utils.ts` parses the response and applies the whole-set rules — count, per-question length, distinctness via `normaliseForMatch` — returning a typed rejection reason. Pure, independently checkable, and where FR-008/FR-009/FR-011/FR-014 are actually enforced.

**Phase 3 — Provider integrations.** `claude/suggested-questions.ts` (effort low, adaptive thinking, `max_tokens` from constants, one retry on a rejected or malformed set), `openrouter/suggested-questions.ts` (`response_format: json_object`, `temperature: 0`), and `suggested-questions.factory.ts`. Error mapping reuses `handleSdkError` / `mapHttpError` unchanged. Enforce the `MAX_GROUNDING_CHARS` ceiling here — over it, return `context_too_large` without calling the provider.

**Phase 4 — Workflow integration.** `transcript-ai.actions.ts`: clear the set on a re-run (D5), then after the existing success write, generate inside a `try`/`catch`, and on a valid set patch `suggestedQuestions` + `suggestionUsage` and return that record. Log outcome, category, count, and lengths — never text. At the end of this phase suggestions exist in the database and the panel still shows hard-coded chips, which is deliberate: it lets the generated sets be inspected before any UI depends on them.

**Phase 5 — Panel wiring.** `MeetingRecord` gains the field; `toMeetingRecord` maps it (and `toTranscriptPatch` conspicuously does not — D8); `suggested-questions.tsx` renders the eyebrow and chips or returns `null`; `chat-messages.tsx` drops `CHIPS` and delegates; `chat-panel.tsx` and `app-shell.tsx` thread the prop. FR-015 is not met while a hard-coded array still exists anywhere in the tree.

**Phase 6 — Edge cases and states.** Legacy meeting with no field; analysis with empty sections; re-analysis replacing a set; re-analysis whose suggestion call fails (must leave none, not the old set); over-ceiling transcript; forced provider failure; a chip clicked while a question is in flight; a transcript carrying AI-directed instructions.

**Phase 7 — Evaluation and visual parity.** Analyze ≥10 meetings, then run SC-002 (29 of 30 chips must yield grounded answers, not refusals), SC-003 (cross-meeting variety and within-set distinctness), SC-005 (added latency), SC-008 (side-by-side against the prototype in both the has-chips and no-chips states), and SC-009 (log audit). This is the acceptance gate — see [quickstart.md](./quickstart.md).

## Spec deltas surfaced by design

Two items in the spec need the user's confirmation. Neither blocks implementation; both are recorded here rather than silently reinterpreted.

1. **SC-008's "two lines" is wrong about the current implementation.** Measured at the 262px chip row, today's chips (30/26/20 chars) each take their own line — the row is already three lines. The verifiable criterion is: *no chip's text wraps inside the chip, and the row occupies no more lines than the current implementation at the same width.* See [research.md](./research.md) D7 for the arithmetic.
2. **The spec's Assumptions call the separate-call-vs-folded-in choice "unconstrained", while its Out of Scope forbids changing the analysis output contract.** D1 resolves it in favour of Out of Scope — a separate call. If the intent was that folding in was permitted, D1's failure-isolation argument still stands on its own, so the decision would not change.

## Risks

| Risk | Mitigation |
|---|---|
| The 34-character cap is too tight; the model routinely overshoots and sets are rejected, so meetings get no chips | The cap is stated in the prompt with worked examples at length, and `rejected_set` is a distinct category (D11) so the logs say exactly this is happening. If the rejection rate is material, the lever is 40 chars plus accepting internal wrap at the 1100px breakpoint — a visible, deliberate trade, not a silent truncation. |
| Terse *and* specific *and* grounded is a hard brief; questions come out generic ("What were the next steps?") and SC-003 fails | Generic questions are the failure this feature exists to fix, so prompt-tuning rounds against the 10-meeting set are budgeted into Phase 7, not treated as rework. The prompt names the aspects to draw from (what was quantified, what was objected to, what was committed) without supplying questions. |
| A suggestion produces a refusal, making the assistant look broken — the worst outcome (SC-002) | Prompt requires the model to confirm the answer is present before emitting a question. If SC-002 misses, escalate to evidence-span verification, reusing the parent feature's `normaliseForMatch` check (D12) — held in reserve precisely so it is not needed. |
| The added AI call pushes analysis past its acceptable wait | `effort: 'low'`, `max_tokens: 512`, and the existing size ceiling bound the worst case. Documented fallback if SC-005 fails: drop the transcript from the input and generate from the analysis alone (D6), accepting less specific questions. |
| A stale set survives a re-analysis whose suggestion call failed | Structurally prevented by clearing on the re-run's pending write (D5), not by remembering to clear on failure. |
| A future edit adds `suggestedQuestions` to `toTranscriptPatch`, letting the review screen wipe generated sets | The omission is deliberate and gets an explanatory comment at the point of temptation (D8). The Phase 6 check "edit and save a meeting, confirm chips survive" catches a regression. |
| Someone adds a generic fallback list later, believing it improves the empty state | FR-017 forbids it and SC-011 tests for it. The reason is recorded in the spec's Assumptions: a fallback chip is pre-written content about a meeting it was not written for. |

## Post-Design Constitution Re-check

Re-evaluated after Phase 1 design:

- **§V** — `chat-messages.tsx` shrinks; the largest new file is a provider integration at ~90 lines, in line with its `meeting-chat.ts` sibling.
- **§IX** — no database call outside `transcriptRepository`; no new collection, so no new class was needed to satisfy "one class per collection".
- **§XI** — `suggested-questions.types.ts` carries the plain types with zero Mongoose dependency; the model file gains only schema fields. The transcript's new fields are declared in the plain type file first.
- **§XIV** — the one swallowed failure is categorised, logged, and specified (FR-022/FR-023); every provider error path reuses the existing mappers.
- **§XV** — the char cap, count, attempt limit, token cap, and every prompt fragment are named constants; the empty state is designed, and the absence of a loading/error state is a decision (D13) rather than an omission.
- **§XVII** — no `index.ts` introduced.
- **§XVIII** — AI contract key is `questions`; DB fields are camelCase; no mapper.
- **§II / §XII** — no new tokens, no new classes; the chip classes move verbatim and the length cap is derived from the prototype's own chip scale.

**Result: PASS.** No new violations introduced by the design. Complexity Tracking remains omitted.
