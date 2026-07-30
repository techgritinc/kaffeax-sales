# Phase 1 Data Model: AI-Generated Suggested Questions

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-07-30

Two additive fields on an existing collection, one new field on an existing view-model, and one new provider response union. No new collection, no migration, no backfill (D4).

---

## 1. Persistence — `transcripts` collection

### New fields

| Field | Type | Default | Notes |
|---|---|---|---|
| `suggestedQuestions` | `string[]` | `[]` | Exactly 0 or 3 entries. Never 1 or 2 (FR-014, SC-001). |
| `suggestionUsage` | `AiUsage` (optional) | absent | Reuses the exported `aiUsageSchema`. Present only when a set was stored (D3). |

Declared in `src/types/transcript.types.ts` (plain, Mongoose-free) and schema'd in `src/lib/db/models/transcript.model.ts` (§XI):

```ts
// src/types/transcript.types.ts — additions to TranscriptFields
suggestedQuestions: string[];
suggestionUsage?: AiUsage;
```

```ts
// src/lib/db/models/transcript.model.ts — additions to transcriptSchema
suggestedQuestions: { type: [String], default: [] },
suggestionUsage: { type: aiUsageSchema },
```

`aiUsageSchema` is already exported from this file for `chat-exchange.model.ts`; this is its second reuse, not a new export.

No index. The field is only ever read as part of a document already being fetched by `_id` or by the existing `userId` indexes, and is never queried on.

### Invariants

- **I1 — All or nothing.** `suggestedQuestions.length ∈ {0, 3}`. Enforced at the boundary by `suggested-questions.schema.ts` before the write; nothing else may write the field.
- **I2 — Length bound.** Every entry is 1…`MAX_SUGGESTION_CHARS` (34) characters after trimming (D7).
- **I3 — Distinctness.** No two entries are equal under `normaliseForMatch` (whitespace-collapsed, trimmed, lowercased) — the same normaliser the parent feature uses for evidence spans (FR-009).
- **I4 — Freshness.** A non-empty set was always generated from the analysis currently stored on the same document. Maintained by clearing at the start of any re-run (D5), never by comparison at read time.
- **I5 — Usage reflects the last call that produced a set.** `suggestionUsage` records the most recent *successful* suggestion call, and is overwritten by the next one. It is deliberately **not** cleared when `suggestedQuestions` is cleared, for two reasons: Mongoose strips `undefined` from update documents, so clearing it would require a `$unset` and therefore a repository method built solely to erase a cost record; and `aiUsage` already behaves exactly this way for the analysis call. A stale `suggestionUsage` beside an empty set means "the last generation that succeeded cost this much", which is true. *(Corrected during implementation — the original invariant claimed present-iff-non-empty, which was stricter than the codebase's own convention and not achievable through the existing repository `update`.)*
- **I6 — Lifetime.** Both fields live and die with their document. `deleteTranscript` needs no change (FR-005).

### State transitions

`suggestedQuestions` has three states and only the analysis action moves between them.

```text
                    ┌──────────────────────────────────────────┐
                    │  EMPTY  (length 0, no suggestionUsage)   │  ← schema default; legacy documents
                    └──────────────────────────────────────────┘
                        │                              ▲
   analysis success     │                              │  re-run starts (mark pending, D5)
   + valid set          │                              │  OR analysis fails
                        ▼                              │
                    ┌──────────────────────────────────────────┐
                    │  POPULATED  (exactly 3 + suggestionUsage) │
                    └──────────────────────────────────────────┘
```

There is no partial, pending, or failed state on the document. A generation failure leaves the field in `EMPTY`, which is indistinguishable from a legacy meeting — deliberately, because the panel treats them identically (FR-017).

### What must never write this field

`toTranscriptPatch` (in `src/features/workflow/utils/transcript.mapper.ts`) builds the patch for `updateTranscript` from the client's `MeetingRecord`. It **must not** include `suggestedQuestions`. Partial-patch semantics then preserve the stored set through every review-screen edit and CRM commit. Adding it there would let a client round-trip overwrite a generated set with whatever the browser happened to hold (D8).

---

## 2. Provider contract — `src/types/suggested-questions.types.ts`

```ts
import type { SummarizationErrorCategory } from '@/types/claude.types';
import type { ChatTokenUsage } from '@/types/chat.types';
import type { AiProvider } from '@/types/transcript.types';

/** Failures only the suggestion path can produce. */
export const SUGGESTION_ONLY_ERROR_CATEGORIES = ['context_too_large', 'rejected_set'] as const;

export type SuggestionOnlyErrorCategory = (typeof SUGGESTION_ONLY_ERROR_CATEGORIES)[number];

export type SuggestionErrorCategory = SummarizationErrorCategory | SuggestionOnlyErrorCategory;

/** A validated set. `questions` always has exactly SUGGESTED_QUESTION_COUNT entries. */
export interface SuggestedQuestionsResult {
  success: true;
  questions: string[];
  model: string;
  provider: AiProvider;
  usage: ChatTokenUsage;
}

/**
 * `message` is for logs only — no suggestion failure is ever shown to a user
 * (FR-023, D13). It must never embed question, transcript, or analysis text.
 */
export interface SuggestedQuestionsFailure {
  success: false;
  category: SuggestionErrorCategory;
  message: string;
}

export type SuggestedQuestionsResponse = SuggestedQuestionsResult | SuggestedQuestionsFailure;
```

Reuse rather than redefinition: `SummarizationErrorCategory` (so `handleSdkError` and `mapHttpError` drop straight in), `ChatTokenUsage` (`Omit<AiUsage, 'model' | 'provider'>`, already declared for the chat path), and `AiProvider`.

`rejected_set` is the one genuinely new category: well-formed JSON that failed I1–I3. Distinguished from `malformed_response` because the two point at different fixes (D11) — a glitch versus a prompt that is losing against the character budget.

### Integration interface — `src/integrations/suggested-questions.factory.ts`

```ts
export interface SuggestedQuestionsLike {
  generate(context: GroundingContext): Promise<SuggestedQuestionsResponse>;
}

export function getSuggestedQuestions(): SuggestedQuestionsLike;  // env-selected, per D10
```

`GroundingContext` is imported unchanged from `src/types/chat.types.ts`. It already carries exactly what FR-007 requires — `cleanedTranscript`, `summary`, `leadScore`, `meetingTitle`, plus `transcriptId` for logging — and it is built by the existing `buildGroundingContext(stored)`. No new projection type is introduced.

---

## 3. View-model — `MeetingRecord`

```ts
// src/types/meeting.types.ts — addition to MeetingRecord
suggestedQuestions: string[];
```

Top-level, not inside `Summary`. `Summary` is the shape `toTranscriptPatch` writes back wholesale, so a field nested there would be erased on the next `updateTranscript` (D8).

Required rather than optional: `toMeetingRecord` is the only construction site in the codebase, so there is no call site that would need a default, and requiring it means a future record builder cannot forget it.

```ts
// src/features/workflow/utils/transcript.mapper.ts — inside toMeetingRecord
suggestedQuestions: fields.suggestedQuestions ?? [],
```

The `?? []` covers documents written before the schema field existed (§III forbids the non-null assertion that would otherwise be tempting here).

---

## 4. Component props

```ts
// src/features/assistant-chat/components/suggested-questions.tsx
export interface SuggestedQuestionsProps {
  /** Exactly three, or empty. Anything else renders nothing. */
  questions: string[];
  onSelect: (question: string) => void;
}
```

`ChatPanelProps` and `ChatMessagesProps` each gain `suggestedQuestions: string[]`. `use-meeting-chat.ts` is untouched: the set is constant for a meeting, so it needs no hook state (D8).

**Render gate** — the row appears only when all three hold:

1. the message being rendered is the opening bubble (`i === 0 && m.role === 'ai'`, the existing condition), which is what keeps a restored conversation from being topped with chips (FR-018);
2. `questions.length === SUGGESTED_QUESTION_COUNT`;
3. otherwise the component returns `null` — no eyebrow, no empty container, no placeholder (FR-017).

---

## 5. Entity mapping back to the spec

| Spec entity | Where it lives |
|---|---|
| **Suggested Question Set** | `transcripts.suggestedQuestions` (+ `suggestionUsage` for its cost); projected to `MeetingRecord.suggestedQuestions`; validated by `suggested-questions.schema.ts` under I1–I3 |
| **Suggestion Source Material** | `GroundingContext`, built by the existing `buildGroundingContext` and rendered by `renderAnalysis` — byte-identical to what the assistant answers from, which is what makes FR-006 achievable |

---

## 6. Cost model

Per-meeting AI cost after this feature:

```text
total = aiUsage.totalCostUsd                    // analysis (existing)
      + suggestionUsage.totalCostUsd            // suggestions (new, at most once per analysis)
      + Σ chatExchanges[].usage.totalCostUsd    // each answered question (existing)
```

Three addends, each attributable to the call that incurred it, all in the same `AiUsage` shape (FR-025, SC-010). No aggregate field is introduced; summing is the reporting layer's job, and no reporting layer exists yet to change.
