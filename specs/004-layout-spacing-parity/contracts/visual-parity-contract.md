# Contract: Layout & Spacing Visual Parity (Header, Review Sections, Email Field, Chat Accent Bar)

This contract defines the acceptance surface for `/speckit-tasks` and implementation: the exact, verifiable conditions each in-scope element must satisfy against `Design/POC_Kaffea-X_Prototype.html`. Values are drawn from `research.md`/`data-model.md`. Every correction is a per-instance className override at the call site — no shared UI primitive changes.

## US1 — Header (`components/common/app-header/app-header.tsx`)

- [ ] The header initials avatar renders `36×36px` / `13px` text at desktop and tablet, and shrinks to `32×32px` / `12px` text at `≤560px`, matching `.kx-header-avatar` (prototype 78–85, 100) — via a `max-bp560:` override at the call site, not by changing the shared `Avatar` (Finding 1).
- [x] Header box (height 56px, padding `0 32px`/`16px`/`12px`, `border-bottom` `--border-strong`, `--shadow-header`, background, flex/gap) and its placement (no gap above/below/beside, all shell states) already match — preserve, no regression (confirmed in `research.md`).

## US2 — Meeting Summary (`meeting-review/components/*`, `common/app-shell/app-shell.tsx`)

- [x] Review root width, main-body padding, the 8px "Summary" heading margin, the `.kx-narrative` block (all properties), and the Chat/FAQ reflow behavior already match the prototype in every chat state — **no change required**; preserve, no regression (confirmed in `research.md`).

## US3 — Review content sections (`meeting-review/components/covered-decided.tsx`, `action-items.tsx`)

- [ ] The "What was covered", "What was decided", and "Action items" headings carry a `3px` left indent (`ml-[3px]`), matching `.kx-section-head { margin-left: 3px }` (prototype 1611–1615). "What we heard" and "Summary" are NOT indented (Finding 2).
- [ ] The Covered/Decided and Actions content cards use `border-radius: 10px` (`rounded-card-sm`), not 12px (`rounded-card`), matching `.kx-b-card` (prototype 1858, Finding 3).
- [x] Section top margins (`mt-8` = 32px), grid/column layouts and gaps, item/row spacing, badge sizing, and responsive collapse already match — preserve (confirmed). "What we heard" needs no change.

## US4 — Review email-capture field (`meeting-review/components/meta-strip.tsx`)

- [ ] The `.kx-meta-email` wrapper gap is `5px` (`gap-[5px]`), not 6px (prototype 1314, Finding 4).
- [ ] The required `*` marker carries `ml-[-1px] mr-[1px]`, yielding icon→star `4px` and star→input `6px` (prototype 1319–1324, Finding 5).
- [ ] The email input horizontal padding is `2px` (`px-[2px]` at the call site — shared `InlineInput` BASE unchanged), matching `.kx-meta-email-input { padding: 1px 2px }` (prototype 1333, Finding 6).
- [ ] The email input `min-width` reliably renders `200px` (`min-w-[200px]!` so the intended value wins over the base `min-w-[120px]`; no `tailwind-merge` dependency added), matching prototype 1334 (Finding 7, medium confidence — verify computed width).

## US5 — Chat "Ask about this lead" accent bar (`assistant-chat/components/chat-panel.tsx`)

- [ ] The chat accent bar has `margin-top: 0` (`<AccentBar variant="h2" className="mt-0" />`), removing the 8px top margin so the title→bar gap is 6px, matching the prototype's inline chat bar (`marginBottom:16` only, prototype 2687). Bottom margin stays 16px. Do NOT change the shared `AccentBar` h2 variant — the processing modal relies on `.kx-bar-h2`'s `mt-2` (Finding 8).
- [ ] This corrects feature-003's over-fix (T014 added the top margin) rather than regressing a correct fix — the correct prototype target is no top margin.

## Cross-cutting

- [ ] No element brought to parity under `003-fix-ui-pixel-parity` regresses (spec FR-007 / SC-006). The only 003 element intentionally changed is the chat accent-bar top margin, which is being corrected toward the prototype (Finding 8).
- [ ] No shared UI primitive (`Avatar`, `InlineInput`, `AccentBar`) is modified — all fixes are per-instance overrides; other consumers (attendee/chat avatars, contact input, processing-modal bar) are unaffected.

## Deferred (out of scope)

- [ ] Actions number-badge color hue (`#d6a836` vs `--mustard #a4812d`) — a color mismatch, not layout/spacing; no token exists; requires a constitution patch. Not addressed by this feature (documented in `research.md`).

## Acceptance

- `npm run validate` (type-check → lint → build) passes with zero warnings after all fixes.
- No new hardcoded hex/rgb/hsl values or inline `style` props are introduced (grep-verifiable).
- Side-by-side comparison against the prototype shows no perceptible difference for every checked item above, at every supported breakpoint.
