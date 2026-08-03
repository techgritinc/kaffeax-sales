# Specification Quality Checklist: Suggested Questions Reach the Panel

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-07-31
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

### Validation iteration 1 — 2026-07-31

**Content Quality — pass.** The Diagnosis Summary was the main risk, since a root-cause narrative invites naming files and constants. It is written entirely in behavioural terms ("a whole-set quality gate rejects any set containing a question longer than a very short character ceiling") with no file, symbol, framework, or provider named. FR-006 likewise constrains the length rule by its user-visible consequence rather than prescribing a number, leaving the value to planning.

**Requirement Completeness — one open item.** A single [NEEDS CLARIFICATION] marker remains, at User Story 3 scenario 3, and is referenced by FR-021. It is a genuine scope conflict rather than a gap that could be closed by a reasonable default: `specs/tae-96-dynamic-suggested-questions/` FR-017 requires no chip row when a set is unavailable and explicitly rejects a generic fallback, while this request's "no hard-coded fallback questions should be displayed **unless** the AI-generated suggestions are genuinely unavailable" reads as permitting one. The two answers produce visibly different behaviour on every meeting that predates the capability — which is currently every meeting — so guessing would risk delivering the opposite of what was asked.

Marker count is 1, within the limit of 3. Two other candidate ambiguities were closed with documented defaults instead of markers:

- The correct length ceiling — resolved by constraining it to SC-007's layout bar (FR-006) and recording the choice as a planning decision, since a specific number would be an implementation detail here.
- Partial sets of one or two questions — resolved as three-or-none per SC-002 and the inherited specification, which the request's "three unique" wording supports.

**Testability.** Every FR has a matching acceptance scenario or success criterion. The two requirements most likely to be waved through in review are pinned to counted outcomes: FR-008 (a retry that cannot differ from what it replaces) is measured by SC-010, and FR-001 (the defect itself) by SC-001, which states the current near-zero baseline so the fix is falsifiable rather than assertable.

### Validation iteration 2 — 2026-07-31

Q1 answered: **Option A — hide the row entirely, no fallback ever.** The marker is resolved and all 17 items now pass. Changes made:

- User Story 3 narrative and scenario 3 now state the behaviour directly: no chip row, no "Suggested" heading, no partial row of one or two chips, no generic or previously-used substitute.
- FR-021 rewritten from a pointer into a standalone testable requirement, so it no longer depends on a decision recorded elsewhere in the document.
- The "very short or near-empty transcript" edge case, which previously deferred to the open decision, now states the outcome.
- SC-012 broadened from the has-suggestions state to **any** state, since with no fallback there is no longer a state where fixed question text is permitted.
- SC-014 added to give the no-suggestions path its own counted bar, including at least 3 meetings analysed before this remediation — the day-one common case.
- Assumptions record the decision and the reasoning for it, so a future reader does not re-litigate the request's "unless genuinely unavailable" wording.
- Out of Scope now names the rejected alternatives explicitly.

Counts after the edit: 27 functional requirements, 14 success criteria, 0 clarification markers, 0 stale cross-references.

**Re-verified against Content Quality.** The added text introduces no implementation detail — SC-014 is stated in user-visible terms (no row, no heading, no partial row) and the assumption argues from the refusal behaviour a user would experience, not from any internal mechanism.

### Status

- ✅ All 17 checklist items pass. No spec updates pending.
- Ready for `/speckit-plan`. `/speckit-clarify` is optional and not required — the one material ambiguity has been resolved.
