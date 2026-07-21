# Quickstart & Validation: Kaffea-X Prototype Reproduction

A run/validation guide proving the feature works end-to-end. Implementation details live in `tasks.md` (created by `/speckit-tasks`) and the code.

## Prerequisites

- Node.js 20.9+ (Next 16 baseline).
- `.env.development` present with the four required vars (`NEXT_PUBLIC_APP_ENV`, `NEXT_PUBLIC_APP_URL`, `NODE_ENV`, `MONGO_URI`). `MONGO_URI` is unused by this feature but the env schema still validates it at startup.
- Assets already in place: `public/images/KX-Primary-logo.png`, `public/icons/favicon.png`.

## Setup & run

```bash
npm install
npm run dev            # loads .env.development via env-cmd; Turbopack (default in Next 16)
# open http://localhost:3000
```

## Reference comparison

Open the prototype side-by-side for fidelity checks:

- Prototype: open `Design/POC_Kaffea-X_Prototype.html` directly in a browser.
- App: `http://localhost:3000`.

## Validation scenarios (map to spec user stories)

### US1 — Capture → scored dossier (P1, MVP)
1. On the Capture screen, confirm **Summarise** is disabled and word count is 0 (empty transcript).
2. Click **Load sample** → the sample transcript populates; word count updates.
3. Click **Summarise** → the processing overlay animates through the 4 steps, then Review appears.
4. In Review, confirm band = **Hot**, score = **93**, the detected signals and hover-evidence tooltips match the prototype.
5. Drag a `.txt` file onto the drop zone → its text loads. (Reference: `contracts/workflow-context.md → handleFile`.)

### US2 — Review, edit, commit (P2)
1. With a draft in Review and an empty prospect email, confirm **Approve** is disabled (rust required-asterisk shown).
2. Enter a prospect email → **Approve** enables. Click it → a `ZOHO-######` id is minted, the Commit screen shows a matching `CommitCard`, and a success toast appears.
3. Reopen a committed record → confirm **Update CRM** replaces Approve/Reject.
4. On a draft, click **Reject** → returns to Capture with a reject toast; the draft is removed from the sidebar.

### US3 — Recent meetings sidebar (P3)
1. Confirm **Drafts** and **Saved to CRM** groups with correct counts and seed records (Cascade Ember, Blue Ridge Roasters, Portland Pour Coffee).
2. Type a company name in the sidebar search → list filters; a non-matching query shows the empty state.
3. Collapse the sidebar → 56px rail; expand restores it. At ≤900px, the sidebar opens as a drawer with a backdrop that closes on click.
4. Select a saved record → it opens in Review.

### US4 — Scoring rubric (P4)
1. Click the floating **Scoring rubric** pill → the two-column modal opens over a backdrop.
2. Edit a signal label and change its HOT/WARM/COLD segment → reflected immediately.
3. Add a new signal via the composer → appended with a generated id.
4. Close via backdrop/close button → returns to Capture. Re-run **Summarise** → output reflects the edited rubric.

### US5 — Assistant chat (P5)
1. On Review, confirm the chat rail shows a context greeting, suggested chips, and input bar.
2. Send a message containing "pricing" (or click a chip) → a "Thinking…" state, then a matching canned response; panel auto-scrolls.
3. Collapse the panel → floating chat button appears; click it → panel reopens.

### Responsive (SC-003)
- Resize through 1100 / 900 / 720 / 640 / 560 / 400px → layout reflows at each breakpoint with no horizontal overflow; ≤900px triggers the sidebar drawer and full-screen chat takeover.

## Gate checks (must pass before PR)

```bash
npm run type-check     # tsc --noEmit — zero errors, no `any`, no `!`
npm run lint           # eslint --max-warnings=0 + prettier --check
npm run build          # next build — zero errors
# or all three:
npm run validate
```

## Fidelity/architecture acceptance (spot-check)

- **No hardcoded colours / inline styles** (Principle II, SC-008):
  ```bash
  # Expect no matches inside src/ component files:
  grep -rEn "#[0-9a-fA-F]{3,6}|rgb\(|hsl\(|style=\{\{" src/components src/features src/providers
  ```
  (Colour/gradient/shadow values live only in `src/app/globals.css` tokens.)
- **No cross-feature imports** (SC-006): a component under `features/<A>/` never imports from `features/<B>/`.
- **Reuse** (SC-005): each repeated prototype element resolves to a single `components/ui/*` primitive reused across views.
- **Pixel parity** (SC-001): side-by-side visual diff across all views/states shows no perceptible difference.
