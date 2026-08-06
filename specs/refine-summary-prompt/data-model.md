# Data Model: Concise, Non-Redundant Call Summary

No physical schema, type, or database change is introduced by this feature — see
`research.md` Decision 1 for why the existing `AiSummaryResponse` / `TranscriptSummary`
shapes are kept as-is. This document instead specifies the **logical** structure this
feature imposes on the existing fields, so it's explicit what "correct" output looks like
even though the JSON shape doesn't change.

## Existing physical shape (unchanged)

Defined in [`src/schemas/ai-summary-response.schema.ts`](../../src/schemas/ai-summary-response.schema.ts)
and mirrored in [`src/types/transcript.types.ts`](../../src/types/transcript.types.ts):

| Field | Type | Physical change in this feature |
|---|---|---|
| `narrative` | `string` | None — content composition rules change (see below). |
| `whatWeHeard` | `string[]` | None. |
| `whatWasCovered` | `string[]` | None — classification rule changes (see below). |
| `whatWasDecided` | `string[]` | None — classification rule changes (see below). |
| `actionItems` | `{ description, owner, dueDate }[]` | None — classification rule changes (see below). |
| `attendees`, `detectedSignals`, `leadScoreBand`, `scoreRationale`, `meetingTitle` | (existing types) | None — out of scope for this feature. |

## Logical model: Narrative Component (new concept, not a new field)

The `narrative` string MUST answer three logical questions, woven into ordinary flowing
prose within the **existing 1-2 paragraph format** — no headings, labels, or bullet
points are introduced to mark them, and no additional paragraphs are added beyond that
existing format:

| Component | Answers | Source material |
|---|---|---|
| **Purpose** | Why did this meeting happen? | The stated trigger/context for the call — a referral, a follow-up, a pain point that prompted the conversation. |
| **Key Outcomes** | What are the most important things that came out of it? | The highest-significance findings, pain points validated, and value demonstrated — not a chronological retelling of every exchange. |
| **Unresolved** | What remains unresolved? | Open questions, concerns, or undecided points raised but not addressed or resolved by the end of the call. May legitimately be a single sentence noting nothing remains unresolved, if the transcript shows every concern was addressed. |

This is a **composition rule for the prompt**, not a parsed sub-structure — no code reads
these as separate values, and the model must not render them as separate labeled
sections. Reviewers/testers validate it by reading the rendered `narrative` (still 1-2
paragraphs) and confirming all three questions are answered and identifiable within that
prose, per `quickstart.md`.

**Clarified 2026-08-06**: an earlier draft of this document allowed up to ~4 short
paragraphs (one per component plus room for Key Outcomes to span two). That was rejected
by the user — the narrative must stay in the same 1-2 paragraph format already in use,
not grow to accommodate the three questions as separate paragraphs.

## Logical model: Section classification precedence (new concept, not a new field)

`whatWasCovered`, `whatWasDecided`, and `actionItems` MUST partition the call's facts —
each fact belongs to exactly one, decided by this precedence (highest first):

1. **Action Item** — a forward-looking commitment with an owner, and (optionally) a due
   date, that will happen after the call. If a fact meets this bar, it is an Action Item
   and MUST NOT also appear in `whatWasCovered` or `whatWasDecided`.
2. **Decision** (`whatWasDecided`) — an agreement about how the parties will proceed
   that is not itself a discrete, assignable task (e.g. "Kaffea-X will not create
   artificial urgency around a decision timeline" is an understanding reached, not a task
   with an owner/due date).
3. **Covered Topic** (`whatWasCovered`) — everything else discussed that is neither of
   the above (e.g. "Meridian's current sourcing mix of two brokers and direct
   relationships").

**Example from the reported bug**: "Set up trial access for both Grace and Elias, with
Elias having full permissions and Grace having view access" has an owner (Jake/Kaffea-X)
and happens after the call → classifies as an Action Item only. It must not also appear
as a `whatWasCovered` entry ("Set up trial account for both Grace and Elias today...").

## State / lifecycle

No state transitions are introduced. This feature affects only the content of a single
AI generation call already in the existing pipeline: transcript in → structured JSON out
→ persisted to `TranscriptFields.summary` unchanged in shape.
