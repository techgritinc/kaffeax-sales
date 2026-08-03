# Contract: Validation Rules

**Ticket**: TAE-96 | **Plan**: [../plan.md](../plan.md) | **Implementation**: `validateSuggestionSet` in `src/lib/utils/suggested-questions.utils.ts`

FR-005 requires every rule that can discard a set to be justified by an observable user-facing consequence. This table is that justification, rule by rule. A rule with no consequence in the third column would have to be deleted.

Evaluation order is fixed. All five rules reject the set **whole** — no rule ever repairs, trims, or partially accepts (FR-007).

| Rule | Rejects when | User-visible consequence if allowed through | Change |
|---|---|---|---|
| **V1** | Response is not parseable JSON, even after fence-stripping and `repairJson` | Nothing renderable exists; there are no questions to show | none |
| **V2** | Parses but fails `SuggestedQuestionsSchema` | Values are not strings in a `questions` array; the row cannot be built | none |
| **V3** | Count ≠ 3 after trimming and dropping empties | The row shows one or two chips, or a fourth that overflows the design. SC-002 counts a partial set as a failure | none |
| **V4** | Any question exceeds `MAX_SUGGESTION_CHARS` after trim | The chip grows past two lines of text, breaking row parity with the prototype (§XII, SC-007) | **34 → 48** |
| **V5** | Two questions are equal under whitespace/case normalisation | The user sees the same question twice and one chip is wasted (FR-012, SC-004) | none |

## Pre-rule normalisation (unchanged)

Before V3 runs, each question is `trim()`-ed and empty strings are dropped. That is why an empty string manifests as a V3 count failure rather than needing a rule of its own. V4's length is measured on the trimmed value, so trailing whitespace never consumes budget.

Distinctness in V5 uses `normaliseForMatch` — the same normalisation the grounding evidence check uses — so "Who owns the pilot?" and "who owns the pilot?" collide, as they should.

## V4: the corrected derivation

V4 is the rule that caused the defect, so its number needs a defensible origin rather than a preference.

The bound comes from the chip row's narrowest supported width, measured in [../research.md](../research.md) R1:

```
row width  = 300px panel − 36px panel padding − 42px row indent = 222px   (at ≤1100px)
text width = 222 − 24px chip padding − 2px border               = 196px
one line   ≈ 196 / 5.8px avg advance (Figtree 11.5px/600)        ≈ 34 chars
two lines                                                        ≈ 68 chars
```

`.kx-chat-chip` sets no `white-space: nowrap`, so text wraps inside the pill and the pill grows taller. **34 is the single-line bound. 68 is the two-line bound. 48 sits inside two lines with margin** for capitals, wide glyphs, and non-Latin text.

The old value enforced the single-line bound as though it were a content rule. That put V4 in direct conflict with prompt Rule 4, which requires the concrete noun the meeting used — and a question naming a real product, date, or figure routinely runs 35–46 characters. The set was correct and the rule discarded it.

**Verification obligation.** 5.8px is an estimate of Figtree's average advance, not a measurement of rendered text. Quickstart Scenario 5 measures the rendered chip at 1440/1100/900/560. If any chip exceeds two text lines, `MAX_SUGGESTION_CHARS` is lowered to the measured two-line value. The constant exists so that is a one-line change.

## What must not be added

- **No truncation or ellipsis.** FR-007 requires whole-set rejection. A truncated question is not what the model wrote, which makes SC-003's grounding measurement meaningless and the ceiling unfalsifiable.
- **No grounding check at validation time.** FR-010's guarantee is a prompt-side responsibility (Rule 1) verified by SC-003. Re-deriving groundedness here would need a second model call on the analysis path and would breach SC-005.
- **No genericness rule.** Rule 4 is prompt-side and measured by SC-004. There is no reliable local test for "this question would fit any meeting", and a bad heuristic would discard good sets — the exact failure being fixed.
- **No sixth rule without a filled-in third column.** That is the FR-005 gate.
