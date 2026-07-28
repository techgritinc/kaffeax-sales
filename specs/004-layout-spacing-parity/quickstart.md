# Quickstart: Validating Layout & Spacing Pixel Parity

No automated visual-regression tooling exists in this project (see `CLAUDE.md`), so validation is a manual side-by-side comparison between the running app and the prototype, backed by `npm run validate` for code correctness. This guide is the runnable check for every item in `contracts/visual-parity-contract.md`.

## Prerequisites

- `.env.development` configured per `CLAUDE.md` (the dev server needs `MONGO_URI` etc. to boot, even though this feature touches no data).
- Node dependencies installed (`npm install`).

## 1. Run both references side by side

```bash
# Terminal 1 — the app
npm run dev            # → http://localhost:3000

# Terminal 2 — the prototype
start Design/POC_Kaffea-X_Prototype.html   # Windows: open in the default browser
```

Position both at the same width so they can be toggled/overlaid at each supported breakpoint (desktop / tablet ~900px / mobile ~560px and below — see the prototype's media queries and Tailwind `@theme` `bp*`).

## 2. Header (US1)

1. At desktop width, confirm the header height (56px), horizontal padding, bottom border, and the spacing/alignment of the logo, divider, app label, and right-side user/avatar cluster match the prototype — with **no gap** above, below, or beside the header. (This was verified as already-matching in `research.md`; confirm live.)
2. Narrow the viewport to **≤560px** and confirm the initials avatar shrinks to **32×32px with 12px text** (Finding 1), not the desktop 36×36/13px.
3. If any header gap is still visible at some width, capture a screenshot at that exact width — the code comparison found none, so a live gap would indicate an environmental factor (browser zoom, font substitution) to diagnose separately.

## 3. Meeting Summary (US2)

1. On the Review screen, toggle the Chat/FAQ panel open and collapsed. Confirm the Meeting Summary reflows exactly as the prototype does — the main column simply gains/loses the chat-column width, with **no** extra layout shift, width jump, or misalignment. (Confirmed already-matching in `research.md`; this step is a regression check, not a fix.)
2. Confirm the narrative block width, padding, left accent border, and the 8px gap under the "Summary" heading match the prototype.

## 4. Review content sections (US3)

1. Compare the "What was covered", "What was decided", and "Action items" headings — each must be indented **3px** from its card/column left edge (Finding 2). "What we heard" and "Summary" must remain flush-left.
2. Confirm the Covered/Decided and Actions content cards have a **10px** corner radius (Finding 3), slightly tighter than before.
3. Confirm section top margins, column gaps, list-item spacing, badge sizing, and the mobile column collapse still match (no regression).

## 5. Review email-capture field (US4)

1. Locate the prospect-email field (Mail icon · `*` · input) beneath the review hero. Confirm the icon→star gap is **4px** and the star→input gap is **6px** — the star sits tight to the icon (Findings 4–5), not floating 6px away.
2. Confirm the input's left padding is **2px** (text/placeholder sits close to the star) (Finding 6) and the field's min-width holds at **200px** (Finding 7 — verify the computed `min-width` in devtools, since the override is class-ordering sensitive).

## 6. Follow-up "Ask about this lead" accent bar (US5)

1. On the Chat/FAQ panel, confirm the gap between the "Ask about this lead" title and the accent bar is **6px** (not 14px) — the bar sits directly under the title with no extra 8px above it (Finding 8). The gap below the bar (to the messages) stays 16px.
2. Confirm the processing-modal accent bar is unchanged (it legitimately keeps its 8px top margin) — a regression check on the shared `AccentBar`.

## 7. Code-correctness gate

```bash
npm run validate
```

Must complete with zero type errors, zero lint warnings, zero formatting drift, and a successful production build.

## Done criteria

All checklist items in `contracts/visual-parity-contract.md` are checked, `npm run validate` passes, no `003` element regresses (spec FR-007 / SC-006), and no open discrepancy remains in the areas above (spec SC-001–SC-005).
