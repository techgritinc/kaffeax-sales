# UX / Layout Requirements Quality Checklist: Layout & Spacing Pixel Parity

**Purpose**: Validate that the requirements in `spec.md` (US1 Header, US2 Meeting Summary, US3 Review sections, US4 Email field, US5 Follow-up accent bar) are clear, unambiguous, complete, consistent, and measurable — before implementation sign-off.
**Created**: 2026-07-22
**Feature**: [spec.md](../spec.md)
**Depth**: Standard (PR-review gate) | **Audience**: Reviewer | **Focus**: Clarity & Ambiguity (emphasis), with Completeness / Consistency / Measurability / Coverage support

**Note**: This checklist tests the requirements as written — it does NOT verify implementation. `[Gap]` flags a possibly-missing requirement; `[Ambiguity]`/`[Conflict]`/`[Assumption]` flag existing text needing sharpening.

## Requirement Clarity (emphasis)

- [ ] CHK001 Is "extra spacing or padding around the header section, resulting in a visible gap" quantified with a measurable property (which edge, how many px), or left to reviewer interpretation? [Clarity, Spec §US1]
- [ ] CHK002 Is the spacing between the email icon and the "starred" input given a target value (or an explicit "match the prototype at line/element X"), rather than only "adjust to match the prototype"? [Clarity, Spec §US4/§FR-005]
- [ ] CHK003 Is the "starred" input field defined (i.e., a required-field marker such as `*`), so the requirement is unambiguous about which element the spacing is measured to? [Clarity, Spec §US4]
- [ ] CHK004 Is "the space between the accent bar and the content is larger than in the prototype" clarified as to which gap is meant (above the bar vs below it), so the correction target is unambiguous? [Ambiguity, Spec §US5]
- [ ] CHK005 Are the "noticeable differences in spacing, margins, padding, or alignment" for the four Review sections enumerated per section, or stated only in aggregate? [Clarity, Spec §US3/§FR-004]
- [ ] CHK006 Is "pixel-perfect replica" / "no visual differences" given an objective definition (tolerance for sub-pixel/anti-aliasing variance), or left entirely to visual judgment? [Ambiguity, Spec §SC-001–§SC-005]
- [ ] CHK007 Is the phrase "match the prototype exactly" backed by a stated comparison method (side-by-side, zoom level, which prototype view maps to which screen), so two reviewers would reach the same verdict? [Clarity, Spec §Assumptions]
- [ ] CHK008 Is "the Chat/FAQ panel may also be affecting the layout" resolved into a definite expected behavior (what the panel should and should not do to content width), rather than a hypothesis? [Ambiguity, Spec §US2/§FR-003]
- [ ] CHK009 Are the "supported viewport widths (desktop, tablet, and mobile breakpoints)" tied to specific breakpoint values, or referenced generically each time? [Clarity, Spec §Assumptions, §FR-001–§FR-004]
- [ ] CHK010 Are the "shell states" referenced by FR-001 (sidebar expanded / rail / hidden) explicitly enumerated so "every shell state" is checkable? [Clarity, Spec §FR-001]
- [ ] CHK011 Is "email-capture field" defined precisely enough (which component/element on the Review screen) that the requirement targets a single, identifiable element? [Clarity, Spec §Assumptions, §US4]

## Ambiguities & Conflicts (emphasis)

- [ ] CHK012 Does the spec resolve the potential conflict between "the implementation should be a pixel-perfect replica" (absolute) and evaluation "by side-by-side visual comparison … not automated pixel-diffing" (subjective), i.e. is the accepted verification bar internally consistent? [Conflict, Spec §Assumptions, §SC]
- [ ] CHK013 For US2 and US5 — which overlap completed feature 003 — does the spec make clear whether the described difference is a NEW open discrepancy or a re-report, so implementers don't assume it is already fixed? [Ambiguity, Spec §Assumptions, §FR-007]
- [ ] CHK014 Is "match the original design" (US5) unambiguously the same baseline as `Design/POC_Kaffea-X_Prototype.html` referenced elsewhere, with no second source of truth implied? [Ambiguity, Spec §US5, §Assumptions]
- [ ] CHK015 Is the term "gap" used consistently across US1 (header gap), US4 (icon-to-input gap), and US5 (bar-to-content gap), or could each instance mean a different kind of spacing? [Consistency, Spec §US1/§US4/§US5]

## Requirement Completeness

- [ ] CHK016 Are requirements defined for the header in ALL shell states, or only the default (sidebar-expanded) state? [Completeness, Spec §FR-001, Gap]
- [ ] CHK017 Are alignment requirements for the email field (icon-to-input vertical alignment) stated in addition to horizontal spacing? [Completeness, Spec §FR-005]
- [ ] CHK018 Does the spec state target values (or a definitive "as in the prototype" pointer) for the Review sections' padding/margins/column layout, or only that they "should be reviewed and updated"? [Completeness, Spec §US3, Gap]
- [ ] CHK019 Are requirements present for the Meeting Summary in BOTH chat states (visible and collapsed), not just the default? [Completeness, Spec §FR-002]

## Acceptance Criteria Quality (Measurability)

- [ ] CHK020 Can SC-001–SC-005 ("zero perceptible differences") be verified objectively by someone other than the author, given no defined tolerance or viewing conditions? [Measurability, Spec §SC-001–§SC-005]
- [ ] CHK021 Is SC-006 ("no element previously brought to parity under 003 regresses") measurable — is there a defined list or method for what "003 parity elements" are to check against? [Measurability, Spec §SC-006, Gap]
- [ ] CHK022 Is "no layout shift absent from the prototype" (SC-002) paired with a definition of what counts as a layout shift, so it is objectively checkable? [Measurability, Spec §SC-002]

## Consistency & Dependencies

- [ ] CHK023 Do FR-007 ("MUST NOT regress any element already brought to parity under 003") and the US5 requirement to change the Follow-up accent bar (a 003-touched element) conflict, or is the intended-change-vs-regression boundary clearly drawn? [Conflict, Spec §FR-007, §US5]
- [ ] CHK024 Is the dependency on feature 003 being complete and unchanged stated as a validated precondition, or an unverified assumption the requirements rely on? [Assumption, Spec §Assumptions]
- [ ] CHK025 Is the assumption that "no automated pixel-diffing tooling exists" stated as validated fact rather than an unverified premise the acceptance method depends on? [Assumption, Spec §Assumptions]

## Scenario & Edge Case Coverage

- [ ] CHK026 Are empty-state requirements defined for the Review sections (no items heard / no decisions / no actions), including their spacing/alignment? [Coverage, Spec §Edge Cases]
- [ ] CHK027 Are requirements defined for the email field with a long/overflowing email value (truncation vs overflow behavior)? [Edge Case, Spec §Edge Cases]
- [ ] CHK028 Are requirements defined for viewport widths BETWEEN named breakpoints (mid-resize) for the Meeting Summary, so no undefined transition state exists? [Coverage, Spec §Edge Cases]
- [ ] CHK029 Are two-column alignment requirements defined for the "Covered"/"Decided" sections when one column is much taller than the other? [Edge Case, Spec §Edge Cases]
- [ ] CHK030 Is a requirement→acceptance-criteria traceability scheme established linking each FR-### to the SC-### and user story it supports, or must that mapping be inferred? [Traceability, Gap]

## Notes

- Check items off as completed: `[x]`
- Add findings inline under the relevant item (e.g., "Confirmed gap — spec updated to enumerate breakpoints").
- Items are numbered sequentially (CHK001–CHK030). Append further items after CHK030 if this checklist is re-run.
- Emphasis per request: Clarity & Ambiguity (CHK001–CHK015). Because this spec deliberately defers exact px values to `Design/POC_Kaffea-X_Prototype.html` as the single source of truth, several clarity items test whether "match the prototype" is a *sufficiently precise and verifiable* acceptance mechanism rather than whether the spec restates the numbers.
