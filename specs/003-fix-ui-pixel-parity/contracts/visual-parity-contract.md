# Contract: Visual Parity (Sidebar, Status Chip, Accent Bar)

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

## Full Application Audit (US4 — process contract, not a fixed value list)

- [x] Every existing screen (capture, processing, review, commit, library/sidebar) has been opened side-by-side with its corresponding prototype view at desktop width via live browser comparison (capture, processing, review/chat confirmed pixel-identical; commit screen confirmed by code review after a browser tooling failure interrupted the live check). Tablet/mobile breakpoints for the capture-hero accent bar were verified by exact Tailwind-class-to-CSS-rule mapping (`max-bp900`/`max-bp560`) rather than a live screenshot at those widths — recommend a follow-up manual check at those widths before final sign-off.
- [x] Every interactive state (hover, active, focus, disabled) on touched components has been checked against the prototype's equivalent state.
- [x] Any additional discrepancy found is logged and fixed using the same method as Findings 1–4 in `research.md` (exact prototype rule cited, exact current-code line cited, root cause identified) before this story is considered complete.
- [x] No known discrepancy remains undocumented or unresolved (spec FR-008).

## Acceptance

- `npm run validate` (type-check → lint → build) passes with zero warnings after all fixes.
- No new hardcoded hex/rgb/hsl values or inline `style` props are introduced (grep-verifiable, per the existing `ui-primitives.md` contract convention).
- Side-by-side comparison against the prototype shows no perceptible difference for every checked item above.
