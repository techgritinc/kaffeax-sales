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

## Out of Scope for This Document

Full-screen-by-screen comparison beyond the three flagged elements (US4) is a validation activity, not a data-model concern — any additional discrepancies found during that audit are tracked and fixed directly against the corresponding prototype rule using the same method demonstrated above, not modeled here in advance.
