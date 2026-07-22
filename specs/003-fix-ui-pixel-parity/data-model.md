# Phase 1 Data Model: Pixel-Perfect UI Parity

This feature introduces no domain data, no persisted entities, and no schema changes — it is a visual-fidelity correction. In place of domain entities, this document specifies the **corrected visual contract** for each affected UI element: the exact target values (from the prototype) that the implementation must produce, and which existing prop/token surface carries them. This is the artifact `tasks.md` and the implementation will be checked against.

## Meeting Record (status derivation only)

Unchanged from `spec.md` — carries a `committed: boolean` field (existing `MeetingRecord` type) that continues to select between the two status-chip visual states. No shape change.

| Field | Type | Determines |
|---|---|---|
| `committed` | `boolean` | Which status-chip variant (`draft` \| `saved`) renders for a given sidebar row |

## Status Chip Variant (`draft` \| `saved`)

Governs the small per-row indicator in the sidebar (`.kx-side-status` in the prototype). Both variants already share layout; only the color triple below needs a token fix.

| Property | Value | Source |
|---|---|---|
| Font size | `8.5px` | `.kx-side-status` (prototype line 429) — already correct in `sidebar-item.tsx` |
| Font weight | `800` | `.kx-side-status` (line 429) — already correct |
| Letter spacing | `0.06em` | `.kx-side-status` (line 429) — already correct |
| Padding | `2px 6px` | `.kx-side-status` (line 430) — already correct |
| Border radius | `3px` | `.kx-side-status` (line 430) — already correct |
| Text transform | `uppercase` | `.kx-side-status` (line 431) — already correct |
| **`draft` background** | `rgba(164,129,45,0.18)` | `.kx-side-status.draft` (line 435) — already correct (`bg-mustard/[0.18]`) |
| **`draft` border** | `rgba(164,129,45,0.4)` | `.kx-side-status.draft` (line 435) — already correct (`border-mustard/40`) |
| **`draft` text color** | `#E6C778` | `.kx-side-status.draft` (line 435) — **NEEDS FIX**: currently `text-mustard` (`#a4812d`) |
| **`saved` background** | `rgba(65,187,147,0.18)` | `.kx-side-status.saved` (line 434) — already correct (`bg-green/[0.18]`) |
| **`saved` border** | `rgba(65,187,147,0.35)` | `.kx-side-status.saved` (line 434) — already correct (`border-green/[0.35]`) |
| **`saved` text color** | `#A6E6CA` | `.kx-side-status.saved` (line 434) — **NEEDS FIX**: currently `text-green` (`#41bb93`) |
| Draft label text | `"Draft"` | prototype line 2628 — already correct |
| Saved label text | `"CRM"` | prototype line 2627 — already correct |

**New tokens required** (added to `:root` and registered under `@theme inline` in `globals.css`, per Principle II):

| Token name (suggested) | Value |
|---|---|
| `--sidebar-status-draft-text` | `#E6C778` |
| `--sidebar-status-saved-text` | `#A6E6CA` |

## Sidebar Item Row Spacing

| Property | Value | Source |
|---|---|---|
| Horizontal margin | `8px` | `.kx-side-item` (line 458) — already correct (`mx-2`) |
| **Vertical margin** | `2px` | `.kx-side-item` (line 458) — **NEEDS FIX**: currently absent |
| Padding | `9px 12px` | `.kx-side-item` (line 458) — already correct (`px-3 py-[9px]`) |
| Gap (dot → text → chip) | `10px` | `.kx-side-item` (line 460) — already correct (`gap-2.5`) |

## Accent Bar Variant Contract

Each row is a distinct visual context in the prototype; the corrected component/call-site set must reproduce all three independently rather than sharing one undifferentiated margin-less primitive.

| Context | Color | Size (desktop) | Responsive size | Margin |
|---|---|---|---|---|
| Generic `h1` (`.kx-accent-bar`, e.g. commit screen "Written to Zoho" heading) | `--midnight` | `112×10` | none | `12px 0 16px` |
| `h1` used elsewhere (`.kx-bar-h1`) | `--midnight` | `112×10` | none | `14px 0 12px` |
| `h2` (`.kx-bar-h2`, e.g. processing modal heading, chat panel heading) | `--bright-blue` | `72×6` | none | `8px 0 16px` |
| Capture-screen hero (`.kx-capture-hero .kx-accent-bar`) | `--midnight` (**NEEDS FIX**: currently bright-blue) | `112×10` base | `96×8` at tablet breakpoint, `72×6` + `8px 0` margin at mobile breakpoint (**NEEDS FIX**: currently fixed, non-responsive) | `10px 0 10px` base (**NEEDS FIX**: currently `my-[10px]` approximation with wrong color/size) |

**Affected call sites**:

| File | Current | Required |
|---|---|---|
| `capture-screen.tsx:21` | `<AccentBar variant="h2" className="my-[10px]" />` | Midnight bar, responsive size, capture-hero margin |
| `commit-screen.tsx:31` | `<AccentBar />` (no margin) | Generic `h1` margin `12px 0 16px` |
| `processing-modal.tsx:53` | `<AccentBar variant="h2" />` (no margin on bar) | `h2` margin `8px 0 16px` |
| `chat-panel.tsx:59` | Inline equivalent, `mb-4` only (bottom margin only) | `h2`-equivalent margin `8px 0 16px` (add missing top margin) |

## Button Icon Size (US5, US8, review audit)

`Button` currently derives the leading/trailing icon size from the button *size* (`sm`→12, `md`→14; `button.tsx:77`), which cannot reproduce the prototype's **per-instance** icon sizing. Corrected contract: add an optional `iconSize?: number` prop that, when set, overrides the derived value passed to `<Icon>`; the derived value remains the fallback.

| Call site | Prototype icon size | Prototype ref | Current (wrong) | Fix |
|---|---|---|---|---|
| `transcript-card.tsx:67` (`UploadCloud`, ghost md) | `13` | line 3645 | `14` | `iconSize={13}` |
| `transcript-card.tsx:72` (`FileText`, ghost md) | `13` | line 3648 | `14` | `iconSize={13}` |
| `commit-screen.tsx:38` (`FileText`, ghost md) | `13` | line 3862 | `14` | `iconSize={13}` |
| `commit-card.tsx:33` (`FileText`, ghost md) | `13` | line 3887 | `14` | `iconSize={13}` |
| `review-hero.tsx:66` (`Mail`, sm) | `11` | line 2958 | `12` | `iconSize={11}` |
| `review-hero.tsx:76` (`RefreshCw`, sm) | `11` | line 2967 | `12` | `iconSize={11}` |

New prop on `ButtonProps` (no new token, no data shape): `iconSize?: number` (optional, backward-compatible).

## Clear Button Geometry (US5)

| Property | Value | Source |
|---|---|---|
| Padding | `10px 18px` | `.kx-btn` inline override (prototype line 3682) — **NEEDS FIX**: collides with ghost-base `14px 8px` via non-merging `cn` |
| Font weight | `600` | prototype line 3682 — **NEEDS FIX**: collides with ghost-base `font-medium` |
| Font size | `12px` | prototype line 3682 — already correct |
| Text transform / tracking | `uppercase` / `0.04em` | prototype line 3682 — already correct |

Fix approach: eliminate the duplicate-utility collision at the call site (do not double-declare padding/weight that the ghost base already sets). No new dependency (`tailwind-merge`/`clsx`) — the project's `cn` is intentionally dependency-free.

## Scoring Rubric Modal (US6)

Comparison baseline is the **modal** variant (`.kx-rubric-overlay`/`.kx-rubric-modal`, prototype lines 3702–3819), not the dead legacy `.kx-rubric-card` CSS. Panel, columns, band pills, section rows, labels, counts, and typography all already match (verified). Only the following need correction:

| Element | Property | Value | Prototype ref | Current (wrong) |
|---|---|---|---|---|
| Overlay (`modal.tsx:33`) | Padding | `32px` | line 862 | none |
| Add-signal button (`rubric-modal.tsx:129`) | Border radius | `6px` (`rounded-input`/`rounded-btn-sm`) | line 1074 | `rounded-input-sm` (4px) |
| Add-signal button hover (`rubric-modal.tsx:129`) | Filter | `brightness(0.94)` | lines 1083–1086 | none (shadow only) |
| Header (`rubric-modal.tsx:71`) | Flex shrink | `0` | line 1003 | none |
| Compose input (`signal-composer.tsx:16`) | Padding | `2px 0 4px` (`pt-0.5 pb-1`) | line 1113 | `py-[2px_0_4px]` (invalid → collapses to 0) |

## App Shell / Chat Grid (US7, US8) — NO CHANGE

`SHELL_COLS` (`app-shell.tsx:15-23`) reproduces the prototype's `.kx-shell` `grid-template-columns` exactly in all four states and all breakpoints (prototype lines 156–184). The Chat/FAQ panel reflows the main column identically to the prototype; toggling it introduces no extra layout shift. **No change required.** Recorded here so the audit does not re-open it.

## Chat Panel Mobile Takeover (US7, US8)

At `max-bp900` the chat becomes a fixed full-screen overlay (position/animation already correct); its internal sizing must switch to the prototype's mobile values (prototype lines 191–220):

| Element | `max-bp900` value | Prototype ref | Current source |
|---|---|---|---|
| `.kx-chat` padding | `16px 16px 14px` | line 197 | `chat-panel.tsx:51` (stays `20px 18px`) |
| Title | `18px` / `mb 4px` | line 201 | `chat-panel.tsx:57` (`text-[20px]`) |
| Eyebrow | `mb 4px` | line 202 | `chat-panel.tsx:54` (`mb-1.5`) |
| Input bar | `mt 10px` / `pt 10px` | lines 204–207 | `chat-panel.tsx:75` (`mt-3.5 pt-3`) |
| Text input | `12px 14px` / `14px` | lines 209–213 | `chat-panel.tsx:78` (`px-3 py-2.5 text-[12.5px]`) |
| Send button | `44 × 44` | line 214 | `chat-panel.tsx:88` (`h-[38px] w-[38px]`) |
| User bubble | `max-width 82%` | line 219 | `chat-messages.tsx` (absent) |

## Review Meeting Summary + Hero Spacing (US7)

| Element | Property | Value | Prototype ref | Current source |
|---|---|---|---|---|
| Summary heading (`kx-h2-sm`) | Margin bottom | `8px` (`mb-2`) | lines 1476–1483 | `heading.tsx:41-43` (smallLabel branch, none) / `summary-block.tsx:11` |
| Hero wrap (`max-bp640`) | Gap | `12px` | lines 1522–1526 | `review-hero.tsx:35` (`gap-4`=16px) |
| Review actions | Margin top | `2px` | line 1508 | `review-hero.tsx:62` (none) |
| Hero eyebrow | Line height | `1` (`leading-none`) | lines 1498–1501 | `review-hero.tsx:37` (none) |

## CRM Write to CRM Section (US8)

| Element | Property | Value | Prototype ref | Current source |
|---|---|---|---|---|
| Hero sub-paragraph (`.kx-sub`) | Margin bottom | `24px` (`mb-6`) | lines 511–515 | `commit-screen.tsx:32` (none) |

The commit-card (`commit-card.tsx`) and commit-wrap/hero geometry already match `.kx-commit-card`/`.kx-commit-wrap` exactly (verified) — no change beyond the sub-paragraph margin and the shared ghost-icon size (Button `iconSize` table above).

## Out of Scope for This Document

Full-screen-by-screen comparison beyond the three flagged elements (US4) is a validation activity, not a data-model concern — any additional discrepancies found during that audit are tracked and fixed directly against the corresponding prototype rule using the same method demonstrated above, not modeled here in advance.
