# Phase 0 Research: Layout & Spacing Pixel Parity

No entries in Technical Context were marked `NEEDS CLARIFICATION` — this is a well-scoped visual-fidelity correction against an existing, unchanged canonical prototype. Phase 0 is the concrete comparison work needed to root-cause the five reported areas: reading the prototype's `kx-*` CSS rules and JSX class usage side by side with the current implementation. Each finding is a **Decision** (the corrected behavior), backed by exact line references in `Design/POC_Kaffea-X_Prototype.html` and the current source file. Investigation was performed by parallel subagents, one per area, each verifying values against the prototype.

## Cross-cutting outcome — two reported symptoms do not reproduce in code

Before the findings, two important negatives that narrow scope:

- **US1 Header box & placement are already pixel-exact.** `.kx-header` (prototype lines 37–44) vs `app-header.tsx:9` match on height (`56px`), padding (`0 32px` → `max-bp900:16px` → `max-bp560:12px`), `border-bottom: 1px var(--border-strong)`, `box-shadow` (`--shadow-header`), background, flex/gap, and **no margin**. The seam is exact: header `56px` + shell `calc(100vh − 56px)` = `100vh` with `box-sizing: border-box`, and `body`/`html` have `margin:0; padding:0` — so there is **no gap above, below, or beside the header** in any shell state. The reported "extra spacing/gap around the header" is not present in the code; the only real header defect is the ≤560px avatar size (Finding 1). If a gap is still observed live, capture a screenshot at a specific width for further diagnosis — it may be environmental (browser zoom/font).
- **US2 Meeting Summary is already at full parity.** The review root (`.kx-review { width:100% }`, prototype 1250 = `w-full`, review-screen.tsx:41), main-body padding (`.kx-main-body` 12/40/40 → responsive, prototype 487–491/830/838 = app-shell.tsx:79), the 8px Summary-heading margin (feature-003 fix, `kx-h2-sm margin 0 0 8px` = `mb-2`, heading.tsx:42), and the `.kx-narrative` block (all ten properties, prototype 1743–1752 = summary-block.tsx:14) match. The chat panel reflows the `minmax(0,1fr)` main column identically to the prototype in every state. **No change required for US2.**

## Finding 1 — Header avatar does not shrink at the mobile breakpoint (US1)

- **Decision**: The header initials avatar MUST be `36×36px` with `13px` text at desktop/tablet and MUST shrink to `32×32px` with `12px` text at `≤560px`, matching `.kx-header-avatar`. Currently it stays `36×36` / `13px` at every width.
- **Rationale**: Prototype `.kx-header-avatar` base `width:36px; height:36px; font-size:13px` (`Design/POC_Kaffea-X_Prototype.html:78-85`), overridden at `@media (max-width:560px)` to `width:32px; height:32px; font-size:12px` (`:100`). The app renders `<Avatar tone="green" size={36}>` (`src/components/common/app-header/app-header.tsx:40`), which maps to a fixed `h-9 w-9` (`src/components/ui/avatar/avatar.tsx:19-20,43`) and `bg-green text-[13px]` (`avatar.tsx:25`) with no responsive override — so at ≤560px it paints 36px/13px where the prototype paints 32px/12px.
- **Alternatives considered**: Editing the shared `Avatar` (rejected — the attendee and chat avatars use the same component at size 32 and must not change). **Chosen**: add a responsive override to the header Avatar's `className` at the call site — `max-bp560:h-8 max-bp560:w-8 max-bp560:text-[12px]`. These are responsive-variant utilities that Tailwind reliably orders after the base `h-9 w-9 text-[13px]`, so they win at ≤560 without the same-property collision risk that affects two competing base utilities (the `cn` joiner does not merge, but base-vs-responsive ordering is deterministic in Tailwind). Font-weight (`800`/`font-extrabold`) and color (`bg-green`) already match.

## Finding 2 — Review section headings missing the 3px left indent (US3)

- **Decision**: The "What was covered", "What was decided", and "Action items" headings MUST be indented `margin-left: 3px` from their card/column left edge. Add `ml-[3px]` to those three `Heading` instances.
- **Rationale**: The prototype wraps each of these three headings in `.kx-section-head { … margin-bottom: 2px; margin-left: 3px }` (`Design/POC_Kaffea-X_Prototype.html:1611-1615`; markup: covered `:3084-3088`, decided `:3106-3110`, actions `:3133-3137`), which insets the label 3px right while the card below stays flush-left. The app renders the headings with no left offset (`src/features/meeting-review/components/covered-decided.tsx:21`, `:43`; `src/features/meeting-review/components/action-items.tsx:35`). The `.kx-section-head` `margin-bottom: 2px` is NOT a discrepancy — it collapses with the heading's own `margin: 0 0 8px` to yield the 8px heading→card gap the app already produces via `mb-2`; only the 3px left indent is missing. Scope note: "What we heard" correctly uses `.kx-heard-head` (`:1922-1925`), which has NO left margin, and the app matches (`heard-grid.tsx:29`) — do NOT indent it; likewise the "Summary" heading is a bare h2 with no indent.
- **Alternatives considered**: Reproducing the full `.kx-section-head` flex wrapper (rejected — these three sections have no right-aligned action button, so a simple `ml-[3px]` reproduces the only visible effect).

## Finding 3 — Review content cards use a 12px radius, prototype is 10px (US3)

- **Decision**: The `.kx-b-card` content cards in Covered/Decided and Actions MUST use `border-radius: 10px`. Replace `rounded-card` with `rounded-card-sm` in both places.
- **Rationale**: Prototype `.kx-b-card { … border-radius: 10px }` (`Design/POC_Kaffea-X_Prototype.html:1858`). The app uses `rounded-card` — `covered-decided.tsx:8` (the shared `CARD` const) and `action-items.tsx:43` — where `--radius-card: 12px` (`src/app/globals.css:176`), i.e. 2px too round. The correct token is `--radius-card-sm: 10px` (`globals.css:175`) → `rounded-card-sm`. (The "What we heard" columns are already correct: `.kx-heard-col border-radius: 6px` (`:1947`) = `rounded-input`, `heard-grid.tsx:44`.)
- **Alternatives considered**: `rounded-[10px]` arbitrary value (rejected — the named `rounded-card-sm` token already maps to 10px and keeps the token system as the single source of truth, per Principle II).

## Finding 4 — Email-capture row inline gap is 6px, prototype is 5px (US4)

- **Decision**: The `.kx-meta-email` wrapper gap MUST be `5px`, not `6px`. Change `gap-1.5` → `gap-[5px]`.
- **Rationale**: Prototype `.kx-meta-email { … gap: 5px }` (`Design/POC_Kaffea-X_Prototype.html:1314`). The app uses `gap-1.5` (6px) on the email wrapper span (`src/features/meeting-review/components/meta-strip.tsx:33`) — 1px too wide between icon→star and star→input.
- **Alternatives considered**: None; a direct value correction.

## Finding 5 — Required `*` marker is missing its horizontal margins (US4 — primary cause of the reported gap)

- **Decision**: The `*` star MUST carry `margin-left: -1px; margin-right: 1px`, which (with the 5px wrapper gap) yields an effective icon→star gap of **4px** and star→input gap of **6px**. Add `ml-[-1px] mr-[1px]`.
- **Rationale**: Prototype `.kx-meta-email-star { … margin-left:-1px; margin-right:1px }` (`Design/POC_Kaffea-X_Prototype.html:1319-1324`). The app's star span has `text-rust text-[13px] leading-none font-bold` but **no margins** (`meta-strip.tsx:37-39`), so it sits 6px from the icon instead of the intended 4px — this asymmetric offset is the primary cause of the reported "too much space between the email icon and the starred field" (+2px on the icon→star side). Font size/weight/line-height already match.
- **Alternatives considered**: Widening only the wrapper gap (rejected — the −1/+1 asymmetry is what tightens icon→star while keeping star→input at 6px).

## Finding 6 — Email input internal padding is 4px, prototype is 2px (US4)

- **Decision**: For the email field the input horizontal padding MUST be `2px` (prototype `padding: 1px 2px`). Add `px-[2px]` at the call site.
- **Rationale**: Prototype `.kx-meta-email-input { padding: 1px 2px; … min-width: 200px }` (`Design/POC_Kaffea-X_Prototype.html:1333-1334`). The shared `InlineInput` BASE hardcodes `px-[4px] py-[1px]` (`src/components/ui/input/inline-input.tsx:11`), which is correct for its other consumer `.kx-contact-inline-input` (`:1377`) but 2px too wide here, pushing the input text 2px further from the star. Apply `px-[2px]` on the `<InlineInput>` instance (`meta-strip.tsx:45`) — do NOT change the shared BASE (the contact field depends on 4px).
- **Alternatives considered**: Editing the shared `InlineInput` BASE (rejected — breaks contact-field parity). Per-instance override only.

## Finding 7 — Email input `min-width` override is non-deterministic (US4, minor)

- **Decision**: The email input MUST reliably render `min-width: 200px` (prototype floor). Ensure the `min-w-[200px]` override wins over the base `min-w-[120px]`.
- **Rationale**: Prototype `.kx-meta-email-input { … min-width: 200px }` (`Design/POC_Kaffea-X_Prototype.html:1334`). `InlineInput` BASE sets `min-w-[120px]` (`inline-input.tsx:11`), and `meta-strip.tsx:45` passes `min-w-[200px]`; because `cn` is a plain joiner with no Tailwind conflict resolution (`src/lib/utils/cn.ts`), both `min-w-[120px]` and `min-w-[200px]` ship and the winner depends on generated-CSS order (same-property, same-level collision — the pattern seen with the 003 `Clear` button). Make the intended 200px deterministic with the Tailwind important modifier: `min-w-[200px]!`. **Confidence: Medium** (visibility is build-order dependent; verify computed width during the quickstart pass). No new dependency — consistent with the 003 precedent of using `!` rather than adding `tailwind-merge`.
- **Alternatives considered**: Removing the base `min-w-[120px]` (rejected — the contact input relies on it); adopting `tailwind-merge` (rejected — the project is intentionally dependency-free).

## Finding 8 — Chat "Ask about this lead" accent bar has an 8px top margin the prototype lacks (US5) — corrects a 003 over-fix

- **Decision**: In the chat panel the accent bar MUST have `margin-top: 0` (final margin `0 0 16px`); the 16px bottom margin is already correct. Override on the instance: `<AccentBar variant="h2" className="mt-0" />`.
- **Rationale**: The prototype's chat-panel bar is an inline-styled div with `width:72; height:6; background:var(--bright-blue); borderRadius:2; marginBottom:16` and **no top margin** (`Design/POC_Kaffea-X_Prototype.html:2687`). It is NOT a `.kx-bar-h2` (that class, `margin: 8px 0 16px`, `:1398-1402`, is used only by the processing modal, `:3302`). The app renders `<AccentBar variant="h2" />` (`src/features/assistant-chat/components/chat-panel.tsx:60`), whose h2 variant is `bg-bright-blue mt-2 mb-4 h-[6px] w-[72px]` (`src/components/ui/typography/accent-bar.tsx:11`) — an 8px top margin. Verified gap chain (flexbox, no collapse): title `mb-1.5` (6px) → bar. Prototype title→bar = 6px; app title→bar = 6px + 8px = 14px → **8px too tall**. The bar→content (bottom) gap already matches at 16px in both. So the reported "space between the accent bar and content is larger" traces to this 8px top margin making the whole header block taller.
- **003 relationship**: Feature 003's task T014 deliberately added a top margin to this bar, treating it as a `.kx-bar-h2`. That was an over-correction — the prototype's chat bar has no top margin. Removing it aligns with the prototype (Principle XII supersedes) and is a correction, not a regression of a *correct* fix. `data-model.md` records this so the 003 contract note is not misread.
- **Alternatives considered**: Editing the shared `VARIANT_CLASS.h2` to `mt-0` (rejected — the processing-modal bar legitimately needs `.kx-bar-h2`'s 8px top margin; changing the shared variant would break it). Reducing the bottom margin (rejected — it already matches). Per-instance `className="mt-0"` override only.

## Out-of-scope observation (recorded, not fixed) — Actions number-badge color hue

- The Actions number badge uses `.kx-b-num.action { background: rgba(214,168,54,0.22) }` (`Design/POC_Kaffea-X_Prototype.html:1882`) — a `#d6a836` gold — but the app uses `bg-mustard/[0.22]` where `--mustard: #a4812d` (`src/app/globals.css:16`), a visibly different hue. **This is a color, not a layout/spacing/alignment issue**, so it is outside this feature's scope. There is no existing token mapping to `#d6a836`, and adding a color requires a constitution patch (Principle II). Flagged here for awareness; the badge *text* color already matches (`#6C4A00`). Recommend addressing under a separate color-parity effort if desired.

## Scope confirmation

- `app-shell.tsx` requires no change — header placement, main-column width/padding, and the grid shell are confirmed faithful (US1/US2).
- `summary-block.tsx`, `review-screen.tsx`, and `heard-grid.tsx` require no change — confirmed faithful (US2, US3).
- Shared primitives `avatar.tsx`, `inline-input.tsx`, and `accent-bar.tsx` are NOT modified — every correction to elements they render is applied per-instance at the call site so other consumers (attendee/chat avatars, contact input, processing-modal bar) are unaffected.
