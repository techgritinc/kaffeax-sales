# Contract: Visual Parity (Sidebar, Status Chip, Accent Bar, Transcript, Rubric Modal, Review Summary, Write to CRM)

This contract defines the acceptance surface for `/speckit-tasks` and implementation: the exact, verifiable conditions each in-scope element must satisfy against `Design/POC_Kaffea-X_Prototype.html`. Values are drawn from `research.md`/`data-model.md`; this file is the checklist implementation and review are graded against.

## Sidebar (`features/meeting-library/components/sidebar.tsx`, `sidebar-item.tsx`)

- [x] Header, search, group header, and item padding/margins match `.kx-sidebar`, `.kx-side-header`, `.kx-side-search-wrap`, `.kx-side-group-row` exactly (all already-correct values preserved — no regression).
- [x] Each sidebar item row has `2px` vertical margin in addition to the existing `8px` horizontal margin (Finding 2).
- [x] The per-row status indicator's background and border colors continue to derive from `--green`/`--mustard` opacity tokens (already correct — preserve).
- [x] The per-row status indicator's **text color** uses the new `--sidebar-status-saved-text` (`#A6E6CA`) / `--sidebar-status-draft-text` (`#E6C778`) tokens, not `text-green`/`text-mustard` (Finding 1).
- [x] Labels remain `"Draft"` (draft) and `"CRM"` (saved) — no label text change.
- [x] Responsive drawer/overlay behavior below the mobile breakpoint is unchanged and continues to match the prototype.

## Status Chip (shared visual identity)

- [x] The draft/saved status-chip styling (padding, radius, font, colors) is defined once and reused wherever it appears — no per-location copy with divergent values (reinforces Principle VI / spec FR-003).
- [x] No hardcoded hex/rgb values are introduced in any component file; new tints are added as named tokens in `globals.css` under `@theme inline` (Principle II).

## Accent Bar (`components/ui/typography/accent-bar.tsx` and call sites)

- [x] Generic `h1` context (e.g. `commit-screen.tsx`): `--midnight`, `112×10`, radius `2px`, margin `12px 0 16px`.
- [x] `h2` context (e.g. `processing-modal.tsx`, `chat-panel.tsx`): `--bright-blue`, `72×6`, radius `2px`, margin `8px 0 16px`.
- [x] Capture-screen hero context: `--midnight` (not bright-blue), `112×10` at desktop, resizing to `96×8` at the tablet breakpoint and `72×6` at the mobile breakpoint (color never changes across breakpoints), margin `10px 0 10px` base, `8px 0` at the mobile breakpoint.
- [x] `chat-panel.tsx`'s inline `h2`-equivalent bar gains the missing `8px` top margin (currently bottom-only).
- [x] No accent bar anywhere in the app uses a color/size/margin combination that doesn't map to one of the above three documented prototype contexts.

## Transcript Section (US5 — `transcript-card.tsx`, `button.tsx`)

- [ ] `Button` accepts an optional `iconSize?: number` that overrides the size-derived icon dimension (Finding 5).
- [ ] *Attach file* (`UploadCloud`) and *Load sample* (`FileText`) ghost-button icons render at **13px**, not 14px (prototype lines 3645, 3648).
- [ ] The *Clear* button deterministically renders padding `10px 18px` and font-weight `600` (prototype line 3682) — no non-deterministic collision with the ghost base geometry; fixed without adding a `tailwind-merge`/`clsx` dependency (Finding 6).
- [ ] Transcript textarea, foot/actions layout, card padding, error banner, and word-count label remain matching (preserve — verified, no regression).

## Scoring Rubric Modal (US6 — `rubric-modal.tsx`, `modal.tsx`, `signal-composer.tsx`)

- [ ] The rubric overlay has `padding: 32px` (prototype line 862); if applied to shared `modal.tsx`, confirmed no other modal depends on a padding-less overlay (Finding 8).
- [ ] The Add-signal button uses a `6px` corner radius (`rounded-input`/`rounded-btn-sm`), not 4px (prototype line 1074, Finding 7).
- [ ] The Add-signal button hover adds `filter: brightness(0.94)` alongside the existing shadow (prototype lines 1083–1086, Finding 10).
- [ ] The rubric header carries `flex-shrink: 0` (`shrink-0`) (prototype line 1003, Finding 9).
- [ ] The compose input renders `padding: 2px 0 4px` (`pt-0.5 pb-1`), replacing the invalid `py-[2px_0_4px]` that collapses to 0 (prototype line 1113, Finding 11).
- [ ] Modal panel width/max-width, columns, band pills, section rows, labels, counts, and typography remain matching (preserve — verified).

## Review Meeting Summary + Chat/FAQ Panel (US7 — `heading.tsx`/`summary-block.tsx`, `review-hero.tsx`, `chat-panel.tsx`, `chat-messages.tsx`)

- [ ] The "Summary" heading (`kx-h2-sm` / `smallLabel`) carries `margin-bottom: 8px`, giving an 8px gap to the narrative block (prototype lines 1476–1483, Finding 12).
- [ ] Review-hero `sm` action buttons (*Email* `Mail`, *Update CRM* `RefreshCw`) render 11px icons via `iconSize={11}` (prototype lines 2958, 2967, Finding 16).
- [ ] Review-hero at `max-bp640`: hero-wrap gap `12px`; action cluster `margin-top: 2px`; eyebrow `line-height: 1` (prototype lines 1522–1526, 1508, 1498–1501, Finding 14).
- [ ] Chat panel `max-bp900` takeover uses the prototype's internal sizing — padding `16px 16px 14px`, title 18px/`mb 4px`, eyebrow `mb 4px`, input-bar `mt/pt 10px`, input `12px 14px`/14px, send `44×44`, user bubble `max-width 82%` (prototype lines 191–220, Finding 13).
- [ ] The Meeting Summary content width, spacing, and alignment match the prototype with the Chat/FAQ panel both visible and collapsed, at every breakpoint (grid shell already confirmed faithful — `app-shell.tsx` unchanged).

## Write to CRM Section + Chat/FAQ Panel (US8 — `commit-screen.tsx`, `commit-card.tsx`)

- [ ] The commit hero sub-paragraph carries `margin-bottom: 24px` (`mb-6`) (prototype lines 511–515, Finding 15).
- [ ] The *Capture another meeting* and *Open in Review* ghost-button icons render at 13px via `iconSize={13}` (prototype lines 3862, 3887, Finding 15/5 mechanism).
- [ ] Commit-card and commit-wrap/hero geometry remain matching `.kx-commit-card`/`.kx-commit-wrap` (preserve — verified).
- [ ] The Write to CRM section width/spacing/padding/margins/alignment match the prototype with the Chat/FAQ panel both visible and collapsed (grid shell confirmed faithful — no shift beyond the prototype's own reflow).

## App Shell / Chat Grid — CONFIRMED, NO CHANGE

- [x] `SHELL_COLS` (`app-shell.tsx:15-23`) matches the prototype's `.kx-shell` `grid-template-columns` in all four chat/sidebar states and all three breakpoints (prototype lines 156–184). Toggling the Chat/FAQ panel reflows the main column identically to the prototype and introduces no extra layout shift; no change required.

## Full Application Audit (US4 — process contract, not a fixed value list)

- [x] Every existing screen (capture, processing, review, commit, library/sidebar) has been opened side-by-side with its corresponding prototype view at desktop width via live browser comparison for the US1–US3 elements.
- [~] **Deeper audit (2026-07-22 expansion) surfaced 12 additional discrepancies** — the earlier "no known discrepancy remains" claim was premature. New findings (`research.md` Findings 5–16) are the US5–US8 items above and remain **open** until implemented and re-verified.
- [ ] Every interactive state (hover, active, focus, disabled) on touched components — including the new rubric Add-signal hover (Finding 10) — is checked against the prototype's equivalent state.
- [ ] Any further discrepancy found is logged and fixed using the same method as `research.md`'s findings (exact prototype rule + current-code line + root cause) before this story is considered complete.
- [ ] No known discrepancy remains undocumented or unresolved (spec FR-008) — currently 12 open (Findings 5–16).

## Acceptance

- `npm run validate` (type-check → lint → build) passes with zero warnings after all fixes.
- No new hardcoded hex/rgb/hsl values or inline `style` props are introduced (grep-verifiable, per the existing `ui-primitives.md` contract convention).
- Side-by-side comparison against the prototype shows no perceptible difference for every checked item above.
