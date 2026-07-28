# Quickstart: Validating UI Pixel Parity

No automated visual-regression tooling exists in this project (see `CLAUDE.md`), so validation is a manual side-by-side comparison between the running app and the prototype, backed by the existing `npm run validate` gate for code correctness. This guide is the runnable check for every acceptance item in `contracts/visual-parity-contract.md`.

## Prerequisites

- `.env.development` configured per `CLAUDE.md` (dev server needs `MONGO_URI` etc. to boot, even though this feature touches no data).
- Node dependencies installed (`npm install`).

## 1. Run both references side by side

```bash
# Terminal 1 — the app
npm run dev
# → http://localhost:3000

# Terminal 2 — the prototype (any static server, or just open the file directly)
# Windows: start the file in the default browser
start Design/POC_Kaffea-X_Prototype.html
```

Open both in separate browser windows at the same width so the two can be positioned side by side (or toggled quickly) at each of the app's supported breakpoints (desktop / tablet ~900px / mobile ~640px and below — see `src/constants/breakpoints.ts`).

## 2. Sidebar (US1)

1. In the app, load the library view so the sidebar shows both a draft and a committed (saved-to-CRM) meeting.
2. Compare against the prototype's sidebar with the same mock data (`Design/POC_Kaffea-X_Prototype.html`'s seed library).
3. Check against `contracts/visual-parity-contract.md` → Sidebar section:
   - Row-to-row vertical gap present (not flush).
   - Draft badge text renders in the muted gold tint (`#E6C778`), not the raw mustard brand color.
   - Saved/CRM badge text renders in the muted mint tint (`#A6E6CA`), not the raw green brand color.
4. Narrow the viewport below the mobile breakpoint and confirm the sidebar collapses into the same overlay/drawer behavior as the prototype.

## 3. Status chip consistency (US2)

1. Note every screen where a draft/saved indicator appears (currently: sidebar rows only — confirmed in `research.md`'s Scope Confirmation).
2. Confirm the same padding/radius/color/font values appear in every location — there should be exactly one visual definition being reused, not per-location copies.

## 4. Accent bar (US3)

Check each of the three contexts from `data-model.md`:

1. **Capture screen** (`/` — new capture hero): accent bar under "Turn a call into a scored lead." must be **midnight** (dark navy), not bright blue, at `112×10` on desktop. Narrow the viewport and confirm it shrinks to `96×8` then `72×6` — color must stay midnight throughout.
2. **Commit screen** ("This meeting is now in Zoho" heading): accent bar must be midnight, `112×10`, with visible space above and below it matching the prototype's spacing.
3. **Processing modal** ("Reading your transcript…" heading): accent bar must be bright blue, `72×6`, with visible space above and below.
4. **Assistant chat panel** heading: same bright-blue `72×6` bar, now with a visible small gap *above* the bar as well as below (currently missing above).

## 5. Capture transcript section (US5)

1. On the capture screen, open the transcript card. Compare the *Attach file* and *Load sample* ghost-button icons against the prototype — they must be **13px** (currently 14px, visibly larger). Overlay/zoom to confirm they no longer look enlarged.
2. Confirm the *Summarise* button's icon (16px) is unchanged and correct.
3. Inspect the *Clear* button's computed padding and font-weight — must be `10px 18px` / `600`, not the ghost base `14px 8px` / `500` (Finding 6; verify via devtools computed style since the bug is class-ordering-dependent).
4. Confirm the textarea, foot/actions row, card padding, and word-count label still match (no regression).

## 6. Scoring Rubric modal (US6)

1. Open the Scoring Rubric. At a viewport width below ~1080px, confirm a 32px gutter remains on all sides of the modal (overlay padding, Finding 8) rather than the panel touching the screen edges.
2. Confirm the *Add signal* button has a 6px corner radius (Finding 7) and darkens slightly on hover in addition to its shadow (Finding 10).
3. On a short viewport, confirm the header does not compress (`shrink-0`, Finding 9).
4. Open the signal composer and confirm the input text sits with the correct small top/bottom padding (2px/4px, Finding 11), not flush.

## 7. Review Meeting Summary + Chat/FAQ panel (US7)

1. On the review screen, confirm the gap between the "Summary" heading and the narrative block is 8px, not 4px (Finding 12).
2. Confirm the *Email* and *Update CRM* action-button icons are 11px, not 12px (Finding 16).
3. Toggle the Chat/FAQ panel open and collapsed. Confirm the Meeting Summary reflows exactly as the prototype does — the main column simply gains/loses the chat-column width, with **no** extra layout shift, overlap, or width jump (the grid shell is confirmed faithful).
4. Narrow to ≤900px: the chat becomes a full-screen takeover. Confirm its internal sizing matches the prototype's mobile values — tighter padding (`16px 16px 14px`), 18px title, 44×44 send button, larger input (Finding 13).
5. At ≤640px, confirm the hero-wrap stacks with a 12px gap and the action cluster/eyebrow spacing matches (Finding 14).

## 8. CRM Write to CRM section + Chat/FAQ panel (US8)

1. On the CRM/commit screen, confirm the gap below the hero sub-paragraph ("…written to the Zoho CRM") is 24px before the "Capture another meeting" row (Finding 15).
2. Confirm the *Capture another meeting* and *Open in Review* ghost-button icons are 13px (Finding 5 mechanism).
3. Toggle the Chat/FAQ panel and confirm the Write to CRM section width changes only by the chat-column width, with no layout shift the prototype doesn't have.
4. Confirm the commit card geometry still matches `.kx-commit-card` (no regression).

## 9. Full application audit (US4)

Walk every existing screen (capture → processing → review → commit; library/sidebar throughout) at desktop, tablet, and mobile widths, and exercise hover/active/focus/disabled states on buttons, chips, and sidebar rows. Log anything that doesn't match the prototype; resolve using the same root-cause method as `research.md`'s findings before considering this story done. (The 2026-07-22 deeper audit already surfaced Findings 5–16 above — confirm each is resolved and hunt for any remaining drift.)

## 10. Code-correctness gate

```bash
npm run validate
```

Must complete with zero type errors, zero lint warnings, zero formatting drift, and a successful production build.

## Done criteria

All checklist items in `contracts/visual-parity-contract.md` are checked, `npm run validate` passes, and no open visual discrepancy remains (spec `SC-001`–`SC-008`).
