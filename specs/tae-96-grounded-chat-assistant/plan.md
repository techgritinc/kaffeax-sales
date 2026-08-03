# Implementation Plan: Grounded Chat Assistant

**Branch**: `feat/chat-panel` | **Date**: 2026-07-29 (revised after the persistence clarification) | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/tae-96-grounded-chat-assistant/spec.md`

## Summary

Replace the chat panel's client-side canned responses with a live assistant that answers only from the current meeting's cleaned transcript and generated analysis, refuses anything else, and keeps each meeting's conversation so it can be re-read later.

The grounding approach — Option B from [research.md](./research.md) — is a single AI call carrying the full grounding material in a cached system prompt, with a structured answer contract whose evidence spans are then **verified in code** against that material. Prompt guardrails govern refusal (SC-002); deterministic span verification governs fabrication (SC-001), where the pass bar is zero and prompt compliance alone is not enough. Retrieval was rejected: it solves a context-size problem this feature does not have, and feeding the model a subset of the meeting actively degrades SC-003.

Conversations are stored as one document per exchange in a dedicated collection, not as an array on the transcript — `getTranscripts()` returns full documents for the recents sidebar, and embedding conversations there would make a list of titles drag every conversation in the workspace into memory. Storing the exchange separately also let per-answer cost ride on the exchange document, which removed the transcript schema change and a whole phase from the previous revision of this plan.

Restored turns are display-only. The server action has **no history parameter** — there is no field through which a stored conversation could reach the model, which is how FR-031 is enforced rather than merely intended.

## Technical Context

**Language/Version**: TypeScript 5 (strict), React 19, Next.js 16 App Router

**Primary Dependencies**: `@anthropic-ai/sdk` 0.113.0 (verified to support `output_config.effort` and `cache_control`), OpenRouter via `fetch`, Zod 4, Mongoose 9, Tailwind v4

**Storage**: MongoDB via the repository layer. One new collection, `chatexchanges` — one document per question/answer pair, carrying its `AiUsage`. **No change to the transcript schema.**

**Testing**: No test infrastructure exists in this repository. Verification is `npm run validate` plus the manual evaluation protocol in [quickstart.md](./quickstart.md), which is where SC-001 … SC-004 are actually measured.

**Target Platform**: Web (server actions + client components), Node runtime

**Project Type**: Single Next.js application

**Performance Goals**: 95% of answers ≤10s, 99% ≤20s (SC-005). One question in flight per user. Conversation restore must not visibly delay panel open.

**Constraints**: Zero fabricated claims across the 30-question evaluation set (SC-001). Transcript content must never reach client state or application logs. Stored exchanges must never enter a prompt (FR-031). Panel appearance unchanged (FR-024).

**Scale/Scope**: Single-user application, one meeting at a time, transcripts up to a configured character ceiling, unbounded conversation length per meeting. ~14 new files, ~7 edited, 1 deleted.

## Constitution Check

*GATE: must pass before Phase 0. Re-checked after Phase 1 — see bottom of file.*

| § | Gate | How this plan satisfies it |
|---|---|---|
| I | Next.js 16 App Router, no new frameworks | No new runtime dependencies. Uses the installed Anthropic SDK, `fetch`, and Mongoose. |
| II | Tailwind tokens only, no hex, no inline `style` | No new visual design (FR-024). Refusal, failure, and restore-loading rows reuse existing classes (`AI_BUBBLE`, `text-muted`) exactly as the pending row already does. |
| III | No `any`, no `!`, explicit shared types | Response unions discriminated and narrowed; AI output parsed through Zod into declared types; `unknown` + narrowing at every provider boundary. |
| IV | ESLint/Prettier clean, conventional commits | `npm run validate` is the gate. Imports auto-sorted by Prettier. |
| V | ≤150 lines per component file | `chat-panel.tsx` is 92 lines today; all new logic goes into `use-meeting-chat.ts`, `chat-message.mapper.ts`, and `opening-message.ts` rather than into components. |
| VI | Reusable UI primitives | No new primitives needed. |
| VII | Pure utils extracted | Prompt assembly, response processing, evidence verification, exchange→message mapping, and opening-line construction all live in util modules. |
| VIII | Zod is the only validator | Both server action inputs and the AI answer contract are Zod schemas. |
| IX | No DB access outside repositories; one class per collection | Grounding via existing `transcriptRepository.findById`; conversations via a new `ChatExchangeRepository` for the new collection. No database call anywhere else. |
| X | Server Actions for mutations, no `/app/api/` | Two server actions (ask, load conversation). No route handlers. |
| XI | Types isolated by domain; plain types split from Mongoose | `src/types/chat.types.ts` holds every plain chat type with zero Mongoose dependency; `chat-exchange.model.ts` imports them and adds only `Schema`/indexes/model — exactly the split §XI mandates. |
| XII | Prototype is the visual source of truth | Zero visual change. Verified side-by-side against `Design/POC_Kaffea-X_Prototype.html` (SC-010). |
| XIII | Logic work → brainstorm → plan → implement | Spec clarified twice with the user; design settled here before code. |
| XIV | Categorised errors, no bare `catch`, user-safe messages, no sensitive data in logs | Provider errors mapped to the existing `SummarizationErrorCategory` vocabulary; persistence failure caught, logged, and swallowed per FR-032; logs carry ids, categories, and counts — never question, answer, or transcript text (FR-028). |
| XV | Named constants, no magic values, loading/empty/error states | Prompt fragments, size ceiling, retry count, `max_tokens`, effort, and every user-facing message in `src/constants/grounded-chat.ts`. Restore-loading, empty, refusal, failure, and no-analysis states all designed. |
| XVII | No barrel files | Every consumer imports directly from the declaring file. No `index.ts` introduced. |
| XVIII | camelCase everywhere, including AI contracts and DB fields | Answer schema is camelCase (`inScope`, `evidenceSpans`); the prompt demands camelCase at the source; `chatexchanges` fields are camelCase. No mapping layer. |
| XIX | Spec dir is `<ticket-id>-<short-description>` | `specs/tae-96-grounded-chat-assistant`; `.specify/feature.json` points at it. |

**Result: PASS.** No violations, so Complexity Tracking is omitted.

Two notes:

- **§X and streaming.** Because mutations must be Server Actions and route handlers are prohibited, token-by-token streaming was never architecturally available without a constitutional amendment. The reaffirmed complete-answer decision and the constitution agree.
- **§IX and the new collection.** A second repository class is the constitution's prescribed shape ("one class per collection"), not an exception to it.

## Project Structure

### Documentation (this feature)

```text
specs/tae-96-grounded-chat-assistant/
├── plan.md              # This file
├── research.md          # Phase 0 — grounding comparison, storage shape, decisions D1–D13
├── data-model.md        # Phase 1 — entities, contracts, validation rules
├── quickstart.md        # Phase 1 — how to run, and how SC-001…SC-012 are measured
├── contracts/
│   ├── server-action.md # askAboutMeeting + getMeetingConversation contracts
│   ├── ai-response.md   # AI answer JSON contract + verification rules (unchanged)
│   └── prompt.md        # Guardrail prompt structure and cache layout (unchanged)
├── checklists/
│   └── requirements.md  # Spec quality checklist — 16/16
└── tasks.md             # Phase 2 — created by /speckit-tasks, NOT by this command
```

### Source Code (repository root)

```text
src/
├── constants/
│   ├── grounded-chat.ts                       # NEW  persona, grounding mandate, refusal rules,
│   │                                          #      output contract, limits, effort, messages
│   └── workflow.ts                            # EDIT delete DEFAULT_CHAT_COMPANY + DEFAULT_CHAT_SIGNALS
├── schemas/
│   ├── chat-answer.schema.ts                  # NEW  Zod contract for the AI answer JSON
│   └── chat.schema.ts                         # NEW  server action input validation (both actions)
├── types/
│   ├── chat.types.ts                          # NEW  GroundingContext, ChatExchangeFields,
│   │                                          #      StoredChatExchange, MeetingChatResponse
│   └── workflow.types.ts                      # EDIT ChatMessage gains `kind`
├── lib/
│   ├── utils/
│   │   └── grounded-chat.utils.ts             # NEW  prompt builder + response processor +
│   │                                          #      evidence-span verification (provider-shared)
│   └── db/models/
│       └── chat-exchange.model.ts             # NEW  Schema + indexes + model only (§XI)
├── integrations/
│   ├── meeting-chat.factory.ts                # NEW  MeetingChatLike + env-based selection
│   ├── claude/meeting-chat.ts                 # NEW  cached system prompt, adaptive thinking
│   └── openrouter/meeting-chat.ts             # NEW  json_object response format, temperature 0
├── repositories/
│   └── chat-exchange.repository.ts            # NEW  listByTranscript / create / deleteByTranscript
├── features/
│   ├── assistant-chat/
│   │   ├── actions/
│   │   │   └── meeting-chat.actions.ts        # NEW  askAboutMeeting + getMeetingConversation
│   │   ├── hooks/
│   │   │   ├── use-meeting-chat.ts            # NEW  restore, send, in-flight guard, reset
│   │   │   ├── use-auto-scroll.ts             # (unchanged)
│   │   │   └── use-canned-response.ts         # DELETE
│   │   ├── utils/
│   │   │   ├── chat-message.mapper.ts         # NEW  StoredChatExchange[] → ChatMessage[]
│   │   │   └── opening-message.ts             # NEW  opening line from title + detected signals
│   │   └── components/
│   │       ├── chat-panel.tsx                 # EDIT consume hook, drop canned path
│   │       ├── chat-messages.tsx              # EDIT render refusal / failure / restoring states
│   │       └── chat-fab.tsx                   # (unchanged)
│   └── workflow/actions/
│       └── transcript.actions.ts              # EDIT deleteTranscript cascades the conversation
└── components/common/app-shell/app-shell.tsx  # EDIT pass transcriptId + real context, drop the
                                               #      hardcoded chatContext object
```

**Structure Decision**: `src/features/assistant-chat/` gains the `actions/` and `utils/` directories the constitution's feature layout prescribes. Prompt construction and response processing live in `src/lib/utils/` rather than the feature, because both provider integrations consume them and `src/integrations/` must never import from a feature — mirroring how `structured-analysis.utils.ts` is shared by the two summarizers. The conversation model, types, and repository sit in the shared `lib/db/models/`, `types/`, and `repositories/` directories per the constitution's directory architecture, not inside the feature.

**Not touched, deliberately**: `src/lib/db/models/transcript.model.ts` and `src/types/transcript.types.ts`. The previous revision of this plan edited both to add cost-aggregate fields; storing usage on the exchange document removed that need.

## Implementation Phases

Ordered so each phase leaves the tree type-checking and the app runnable. Phases 1–5 deliver User Stories 1 and 2; Phase 6 delivers Story 3 (persistence and restore); Phase 7 covers Story 4 and the edge cases; Phase 8 is the acceptance gate.

**Phase 1 — Contracts and types.** `chat.types.ts`, `chat-answer.schema.ts`, `chat.schema.ts`, `grounded-chat.ts` constants. No behaviour; establishes the shapes everything compiles against.

**Phase 2 — Prompt and verification core.** `grounded-chat.utils.ts`: assemble the cached system prompt from frozen constants (delimited transcript + analysis, guardrail rules, camelCase output contract), parse the response, and verify every evidence span against the grounding material by normalised substring match. Unverifiable spans reject the answer. Pure, so independently checkable, and the feature's correctness centre.

**Phase 3 — Provider integrations.** `claude/meeting-chat.ts` (system array with `cache_control` on the final block, adaptive thinking, `effort: 'low'`, `max_tokens` from constants, one retry on unusable output), `openrouter/meeting-chat.ts` (`response_format: json_object`, `temperature: 0`), and `meeting-chat.factory.ts`. Error mapping reuses `handleSdkError` and `mapHttpError`.

**Phase 4 — Ask path.** `askAboutMeeting`: validate, load the transcript, reject when `aiProcessingStatus !== 'success'` (FR-025), enforce the size ceiling (FR-026 / D5), call the provider, return a discriminated result. Structured logging with no content (FR-028). No persistence yet — the panel works end to end at this point, which makes Phase 6 verifiable against a known-good baseline.

**Phase 5 — Panel wiring.** `use-meeting-chat.ts` owns messages, pending, the in-flight generation guard, and the meeting-change reset. `chat-panel.tsx` consumes it; `chat-messages.tsx` renders refusal and failure kinds; `app-shell.tsx` passes the transcript id and the real opening context. Delete `use-canned-response.ts` and the two `DEFAULT_CHAT_*` constants — FR-018 is not met while a canned path still exists anywhere in the tree.

**Phase 6 — Persistence and restore.** `chat-exchange.model.ts`, `chat-exchange.repository.ts`, `getMeetingConversation`, `chat-message.mapper.ts`, hook hydration on `activeId` change, restore-loading state, the best-effort write in `askAboutMeeting` (FR-032), and the `deleteTranscript` cascade (FR-033). Sequenced after a working ask path so a restore bug is never confused with a grounding bug.

**Phase 7 — Edge cases and states.** No-analysis state, empty submission, concurrent submission, oversized transcript, mid-flight meeting switch, long stored conversation, persistence-failed-but-answer-succeeded, long-answer readability at every breakpoint.

**Phase 8 — Evaluation.** Author the 30-question in-scope set across ≥3 meetings and the 20-question adversarial set, then run them, plus the restore and no-influence checks (SC-011, SC-012). This is the acceptance gate, not a formality — see [quickstart.md](./quickstart.md).

## Risks

| Risk | Mitigation |
|---|---|
| Refusal rate misses the 95% bar on first pass | Expected. Prompt tuning rounds against the adversarial set are budgeted into Phase 8, not treated as rework. |
| Evidence verification too strict — the model paraphrases and valid answers get rejected | Normalise whitespace and case before matching; require verbatim spans in the prompt with a worked example; retry once. If the reject rate is high, loosen to token-overlap before loosening the gate itself. |
| A silent prefix invalidator erases the cache saving | `cacheReadTokens` is recorded per answer. A zero across repeated questions on one meeting is the tell — after ruling out the model's cacheable-prefix floor. |
| Latency exceeds 10s at p95 on long transcripts | `effort: 'low'` first, cache reads cut input processing on follow-ups, and the size ceiling bounds the worst case. |
| A stored conversation reaches the model, quietly breaking FR-015 and FR-031 | Structurally prevented: the action signature has no history parameter, and the grounding builder takes a `GroundingContext` that has no conversation field. Adding one would be a visible contract change, not a slip. |
| Restore query slows panel open on a long conversation | Indexed on `{ transcriptId, createdAt }`, single-purpose collection, and the query is independent of the grounding read. Verified against a long conversation in Phase 7. |
| Unbounded conversation growth | Safe by construction with one document per exchange. No retention policy is in scope; if one is wanted later it is a `deleteMany` on a date filter against a collection that already has the index for it. |

## Post-Design Constitution Re-check

Re-evaluated after Phase 1 design:

- **§V** — every new file has a single responsibility; the hook, mapper, and opening-message extractions keep `chat-panel.tsx` and `chat-messages.tsx` well under 150 lines.
- **§IX** — two repositories, two collections, and no database call outside them. `deleteTranscript` composes two repository calls at the action layer, where cross-collection coordination belongs.
- **§XI** — `chat.types.ts` carries every plain type with zero Mongoose dependency; `chat-exchange.model.ts` holds only `Schema`, indexes, `HydratedDocument`, and the model export. This is the exact split the constitution added in v1.3.0.
- **§XVII** — no `index.ts` introduced; the factory is a named module, not a barrel.
- **§XVIII** — the AI contract and the new collection's fields are camelCase; no mapper.
- **§II / §XII** — no new tokens, no new classes, no visual delta.
- **§XV** — the restore path added a loading state, and it reuses the existing muted-bubble treatment rather than inventing one.

**Result: PASS.** No new violations introduced by the design. Complexity Tracking remains omitted.
