# Phase 1 Data Model: Layout & Spacing Pixel Parity

This feature introduces no domain data, no persisted entities, and no schema changes — it is a visual-fidelity correction. In place of domain entities, this document specifies the **corrected visual contract** for each affected element: the exact target values (from the prototype) the implementation must produce, and which existing prop/class surface carries them. This is the artifact `tasks.md` and the implementation are checked against. Every correction is a **per-instance className override at the call site** — no shared UI primitive changes.

## US1 — Header avatar (responsive size)

Element: header initials avatar, rendered via `<Avatar tone="green" size={36}>` in `app-header.tsx:40`. Reproduce `.kx-header-avatar`'s mobile override without touching the shared `Avatar`.

| Property | Desktop/tablet | ≤560px | Prototype ref | Current |
|---|---|---|---|---|
| Box | `36×36` (`h-9 w-9`) | **`32×32` (`h-8 w-8`)** | lines 78–85, 100 | fixed `h-9 w-9` |
| Font size | `13px` | **`12px`** | lines 78–85, 100 | fixed `text-[13px]` |
| Font weight | `800` (`font-extrabold`) | same | line 82 | ✓ matches |
| Background | `var(--green)` (`bg-green`) | same | line 84 | ✓ matches |

Fix: add `max-bp560:h-8 max-bp560:w-8 max-bp560:text-[12px]` to the header Avatar's `className` (call site only). Responsive variants win over the base `h-9 w-9 text-[13px]` deterministically.

## US3 — Review content section headings (3px left indent)

Element: the "What was covered", "What was decided", and "Action items" headings (`<Heading level={2} smallLabel>`). Reproduce `.kx-section-head { margin-left: 3px }`.

| Element | Property | Value | Prototype ref | Current |
|---|---|---|---|---|
| Covered heading (`covered-decided.tsx:21`) | Left margin | `3px` (`ml-[3px]`) | lines 1611–1615, 3084 | none |
| Decided heading (`covered-decided.tsx:43`) | Left margin | `3px` (`ml-[3px]`) | lines 1611–1615, 3106 | none |
| Action items heading (`action-items.tsx:35`) | Left margin | `3px` (`ml-[3px]`) | lines 1611–1615, 3133 | none |

Excluded: "What we heard" (`.kx-heard-head`, no left margin — `heard-grid.tsx:29` already correct) and "Summary" (bare h2). The heading→card 8px gap is already correct (feature-003 `mb-2`); do not change it.

## US3 — Review content cards (radius 12→10px)

Element: `.kx-b-card` content cards. Token swap `rounded-card` (12px) → `rounded-card-sm` (10px).

| Element | Property | Value | Prototype ref | Current |
|---|---|---|---|---|
| `CARD` const (`covered-decided.tsx:8`) | Border radius | `10px` (`rounded-card-sm`) | line 1858 | `rounded-card` (12px) |
| Actions card (`action-items.tsx:43`) | Border radius | `10px` (`rounded-card-sm`) | line 1858 | `rounded-card` (12px) |

`--radius-card-sm: 10px` and `--radius-card: 12px` are both registered in `globals.css` (lines 175–176). "What we heard" columns use `rounded-input` (6px) and are already correct.

## US4 — Review email-capture field (`meta-strip.tsx`)

Reproduce `.kx-meta-email` / `.kx-meta-email-star` / `.kx-meta-email-input`. All per-instance; the shared `InlineInput` BASE is NOT changed (its 4px padding / 120px min-width are correct for the contact-field consumer).

| Element | Property | Value | Prototype ref | Current |
|---|---|---|---|---|
| Email wrapper span (`meta-strip.tsx:33`) | Gap | `5px` (`gap-[5px]`) | line 1314 | `gap-1.5` (6px) |
| `*` star span (`meta-strip.tsx:37`) | Margins | `ml-[-1px] mr-[1px]` | lines 1319–1324 | none |
| Email `<InlineInput>` (`meta-strip.tsx:45`) | Horizontal padding | `2px` (`px-[2px]!`) | line 1333 | inherits `px-[4px]` |
| Email `<InlineInput>` (`meta-strip.tsx:45`) | Min width (deterministic) | `200px` (`min-w-[200px]!`) | line 1334 | `min-w-[200px]` collides with base `min-w-[120px]` |

Effective result: icon→star gap `4px` (5px wrapper − 1px star margin-left), star→input gap `6px` (5px wrapper + 1px star margin-right). Already-matching: wrapper `mt-2 mb-3.5` (8px/14px), row gaps `gap-x-3 gap-y-2.5`, `items-center`, Mail icon `size={13}`, star `text-[13px] font-bold leading-none`, dashed `border-border-strong`, `focus:border-green`, italic placeholder.

## US5 — Chat "Ask about this lead" accent bar (remove top margin)

Element: `<AccentBar variant="h2" />` in `chat-panel.tsx:60`. The prototype's chat bar has margin `0 0 16px` (no top margin), unlike `.kx-bar-h2` (`8px 0 16px`, used only by the processing modal).

| Property | Value | Prototype ref | Current |
|---|---|---|---|
| Top margin | `0` (`mt-0!`) | line 2687 (inline `marginBottom:16` only) | `mt-2` (8px) from the shared h2 variant |
| Bottom margin | `16px` (`mb-4`) | line 2687 | ✓ matches |

Fix: `<AccentBar variant="h2" className="mt-0" />`. Do NOT change the shared `VARIANT_CLASS.h2` in `accent-bar.tsx:11` — the processing modal legitimately needs its `mt-2 mb-4` (`.kx-bar-h2`). **Corrects feature-003's over-fix** (003 T014 added the top margin assuming a `.kx-bar-h2`); the correct target is no top margin.

## Confirmed — no change (recorded so the audit does not re-open)

| Area | Status | Ref |
|---|---|---|
| Header box + placement (height/padding/border/shadow/seam, all shell states) | Matches | prototype 37–105, 155–224 vs `app-header.tsx`, `app-shell.tsx` |
| Meeting Summary (review root, main-body padding, `.kx-narrative`, 8px heading margin, chat-state behavior) | Matches | prototype 1250, 487–491, 1743–1752 vs `review-screen.tsx`, `summary-block.tsx`, `app-shell.tsx` |
| "What We Heard" section (grid, gaps, item spacing, column radius) | Matches | prototype 1922–2037 vs `heard-grid.tsx` |
| Covered/Decided/Actions spacing, gaps, padding, badge sizing, responsive | Matches (except Findings 2–3) | prototype 1846–1901 vs `covered-decided.tsx`, `action-items.tsx` |

## Out of scope (deferred)

- **Actions number-badge color hue**: prototype `#d6a836` (`rgba(214,168,54,0.22)`, line 1882) vs app `--mustard: #a4812d`. A color mismatch, not layout/spacing; no existing token maps to `#d6a836`; adding a color requires a constitution patch (Principle II). Address under a separate color-parity effort if desired.
