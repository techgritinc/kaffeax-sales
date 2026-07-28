# Implementation Plan: Pixel-Perfect UI Parity with HTML Prototype

**Branch**: `003-fix-ui-pixel-parity` | **Date**: 2026-07-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-fix-ui-pixel-parity/spec.md`

## Summary

Correct pixel-level visual drift between the running Next.js app and the canonical prototype (`Design/POC_Kaffea-X_Prototype.html`), then audit every remaining screen for the same class of drift. The spec's user stories target, in priority order: the meeting-library sidebar (structure + per-row status indicator), the "Draft"/"Saved to CRM" status-chip styling wherever it recurs, the accent-bar decorative element across all headings, a full-application visual sweep, and — added in the 2026-07-22 expansion — the Capture transcript section (oversized button icons), the Scoring Rubric modal, the Review Meeting Summary + Chat/FAQ panel, and the CRM Write to CRM + Chat/FAQ panel.

**Technical approach (US1–US4)**: No new architecture, dependencies, or data model — a corrective pass over existing `components/ui/typography` (`AccentBar`), `features/meeting-library/components` (`Sidebar`, `SidebarItem`), and their call sites. Root-caused discrepancies (see `research.md` Findings 1–4): sidebar status-badge text color needs new on-dark tint tokens; `SidebarItem` is missing vertical inter-row margin; `CaptureScreen`'s hero `AccentBar` uses the wrong variant/color/size; `AccentBar` encodes no margin so call sites improvise spacing.

**Technical approach (US5–US8, expansion — see `research.md` Findings 5–16)**: Still no new dependencies, no data model, no server/data-layer involvement — a corrective pass over existing components. Two shared root causes drive most of the new work: (a) `Button` derives icon size from button *size* (`sm`→12/`md`→14) and cannot reproduce the prototype's per-instance sizing (11/12/13/14) → add an optional `iconSize?: number` override prop and pass the exact prototype value at the six affected call sites (transcript, commit, commit-card, review-hero) — this fixes the reported "icons look larger" defect; (b) the Chat/FAQ panel's mobile (`≤900px`) takeover keeps desktop internal sizing → add the prototype's `max-bp900` sizing to `ChatPanel`/`ChatMessages`. The remainder are localized single-property corrections: the Scoring Rubric modal (overlay 32px padding, add-signal radius 6px + hover brightness, header `shrink-0`, compose-input padding), the Review "Summary" heading 8px bottom margin + three minor hero spacing values, the CRM hero sub-paragraph 24px bottom margin, and the `Clear` button geometry-override collision caused by the intentionally dependency-free `cn` joiner (fixed at the call site, not by adding `tailwind-merge`). **The app-shell grid is confirmed faithful and requires no change** — the Chat/FAQ panel does not steal content width or shift layout beyond what the prototype itself does (`research.md` cross-cutting confirmation).

## Technical Context

**Language/Version**: TypeScript 5 (strict), React 19, Next.js 16 (App Router)

**Primary Dependencies**: Tailwind CSS v4 (existing `globals.css` design tokens), existing `components/ui/*` primitives. No new runtime dependencies.

**Storage**: N/A — purely presentational fix; no data model, repository, or server action changes.

**Testing**: No automated test infrastructure exists in the project (per `CLAUDE.md`). Validation is manual: side-by-side visual comparison against `Design/POC_Kaffea-X_Prototype.html` (see `quickstart.md`) plus `npm run validate` (type-check → lint → build) as the correctness gate.

**Target Platform**: Modern evergreen browsers, same responsive breakpoints already defined in the prototype and mirrored in `src/constants/breakpoints.ts` / Tailwind `@theme` (`bp1100/900/720/640/560/400`).

**Project Type**: Web application (Next.js App Router), single existing route — no new routes.

**Performance Goals**: No change from current behavior; this is a styling-only correction with no new renders, effects, or state.

**Constraints**: Pixel-perfect 1:1 fidelity to the prototype (Principle XII). Zero hardcoded hex/rgb/hsl and zero inline `style` objects (Principle II) — any new color tint MUST become a named token in `globals.css`. Files ≤150 LOC (Principle V). No new runtime dependencies (Principle I) — in particular the `Clear`-button fix must NOT add `tailwind-merge`/`clsx`; the project's `cn` is intentionally dependency-free.

**Scale/Scope**: US1–US4 — 3 known-broken elements (sidebar structure/status chip, accent bar, chip spacing) across `accent-bar.tsx`, `sidebar-item.tsx`, `sidebar.tsx`, `capture-screen.tsx` + call sites. US5–US8 (expansion) — 12 additional root-caused findings (`research.md` Findings 5–16) across `button.tsx` (+ `iconSize` prop), `transcript-card.tsx`, `commit-screen.tsx`, `commit-card.tsx`, `review-hero.tsx`, `heading.tsx`/`summary-block.tsx`, `rubric-modal.tsx`, `modal.tsx`, `signal-composer.tsx`, `chat-panel.tsx`, `chat-messages.tsx`. Plus a full-application audit across the 5 existing screens. `app-shell.tsx` is explicitly **out of scope** (grid confirmed correct).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Status | Notes |
|---|-----------|--------|-------|
| I | Tech Stack & Framework | ✅ Pass | No framework/dependency changes. The `Clear`-button collision (Finding 6) is fixed at the call site, explicitly WITHOUT adding `tailwind-merge`/`clsx` — the dependency-free `cn` is preserved per the project's stated minimalism. |
| II | CSS & Design Tokens | ✅ Pass (by design) | Status-chip color drift is a *missing* token; fix adds tints to `globals.css`/`@theme`. All US5–US8 fixes use existing named tokens (e.g. `rounded-input`/`rounded-btn-sm` = 6px for the rubric radius) or Tailwind utilities mapping to prototype px values — no hardcoded hex introduced. Icon sizes are numeric SVG dimensions (a `size` prop), not colors, so they are not token-governed. |
| III | TypeScript Strictness | ✅ Pass | One narrow additive change: an optional `iconSize?: number` on `ButtonProps` (backward-compatible, no `any`). All other edits are className-only. |
| IV | Linting & Formatting | ✅ Pass | No change to tooling; edits pass existing lint/format config. |
| V | Code Modularity | ✅ Pass | All touched files remain well under 150 LOC; fixes are localized, no new files. |
| VI | Reusable UI Components | ✅ Pass (reinforced) | US2 makes the status chip a single reusable element. The `Button` `iconSize` override *strengthens* the shared primitive so per-instance prototype icon sizes are expressible through the component API rather than by forking call sites — the correct reusable-component direction. |
| VII | Utility Functions | ✅ N/A | No new pure logic; this is styling only. |
| VIII | Schema Validation & Forms | ✅ N/A | No forms involved. |
| IX | Repository Layer | ✅ N/A | No data access involved. |
| X | Server Actions & API Layer | ✅ N/A | No mutations/fetching involved. |
| XI | Type Isolation | ✅ Pass | No new global types; existing types untouched. |
| XII | Design Fidelity | ✅ Pass (core objective) | This entire feature exists to restore Principle XII compliance. `research.md` documents the exact prototype rules being restored. |
| XIII | AI-Assisted Workflow | ✅ Pass | Pure UI-fidelity task → implementation MUST use the `frontend-design` skill against the prototype (no brainstorming/redesign — the prototype already dictates every value). US5–US8 findings were root-caused via parallel investigation subagents, each citing exact prototype + source lines. |
| XIV | Error Handling & Observability | ✅ N/A | No new async operations, error paths, or logging. |
| XV | Quality & Performance | ✅ Pass | Fixes remove ad-hoc/inconsistent styling (an existing SRP/consistency smell) rather than adding any. No new client state. |
| XVI | Git & Deployment Standards | ✅ Pass | Branch `003-fix-ui-pixel-parity` follows the numbering convention used by prior specs in this repo; actual git branch/commits will follow `type/short-description` and Conventional Commits as usual. |

**Gate result**: PASS. No violations; nothing to record in Complexity Tracking.

**Post-Phase-1 re-evaluation (after the US5–US8 expansion)**: Still PASS. The design adds exactly one optional, backward-compatible prop (`Button.iconSize?: number`) — no `any`, no new dependency, no data/server-layer change, no file over 150 LOC. The one shared-file edit (`modal.tsx` overlay padding) is gated on confirming no other modal relies on a padding-less overlay (Finding 8). No complexity deviations to track.

## Project Structure

### Documentation (this feature)

```text
specs/003-fix-ui-pixel-parity/
├── plan.md              # This file
├── research.md          # Phase 0 output — verified prototype-vs-app discrepancies
├── data-model.md        # Phase 1 output — corrected component/token contracts
├── quickstart.md        # Phase 1 output — manual visual-parity validation guide
├── contracts/           # Phase 1 output
│   └── visual-parity-contract.md
├── checklists/
│   └── requirements.md  # Created by /speckit-specify
└── tasks.md              # Created later by /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── app/
│   └── globals.css                          # US1/US2: add on-dark status-chip text tint token(s) under @theme
├── components/
│   └── ui/
│       ├── button/
│       │   └── button.tsx                    # US5/US8: add optional iconSize? prop (override derived icon size)
│       ├── modal/
│       │   └── modal.tsx                      # US6: add 32px overlay padding (verify no other modal depends on padding-less overlay)
│       └── typography/
│           ├── accent-bar.tsx                # US3: encode per-variant margin; verify h1/h2 map to correct prototype rule
│           └── heading.tsx                    # US7: add 8px bottom margin to smallLabel (kx-h2-sm) branch
├── features/
│   ├── meeting-library/
│   │   └── components/
│   │       ├── sidebar.tsx                    # US1: verify group/header/search spacing against .kx-sidebar rules
│   │       └── sidebar-item.tsx               # US1: fix vertical inter-row margin; fix status-chip text color token
│   ├── meeting-capture/
│   │   └── components/
│   │       ├── capture-screen.tsx             # US3: fix hero AccentBar variant/size/responsiveness
│   │       ├── transcript-card.tsx            # US5: iconSize={13} on ghost buttons; fix Clear geometry collision
│   │       └── processing-modal.tsx           # US3: verify AccentBar margin after AccentBar changes
│   ├── scoring-rubric/
│   │   └── components/
│   │       ├── rubric-modal.tsx               # US6: add-signal radius 6px + hover brightness; header shrink-0
│   │       └── signal-composer.tsx            # US6: fix invalid compose-input padding (2px 0 4px)
│   ├── meeting-review/
│   │   └── components/
│   │       ├── review-hero.tsx                # US7: sm-button iconSize={11}; bp640 gap, actions mt, eyebrow leading-none
│   │       └── summary-block.tsx              # US7: ensure 8px gap under "Summary" heading (with heading.tsx)
│   ├── crm-commit/
│   │   └── components/
│   │       ├── commit-screen.tsx              # US3/US8: AccentBar margin; hero sub-paragraph mb-6; iconSize={13}
│   │       └── commit-card.tsx                # US8: iconSize={13} on ghost button
│   └── assistant-chat/
│       └── components/
│           ├── chat-panel.tsx                 # US3: accent-bar top margin. US7/US8: max-bp900 mobile-takeover sizing
│           └── chat-messages.tsx              # US7/US8: user bubble max-width 82% at max-bp900
└── components/common/app-shell/app-shell.tsx  # OUT OF SCOPE — grid confirmed faithful to prototype (no change)
```

**Structure Decision**: No structural change. This feature edits existing files in place within the current `components/ui/` and `features/<feature>/components/` layout; no new directories, features, or shared modules are introduced. The only component-API change is one optional, backward-compatible prop (`Button.iconSize`).

## Complexity Tracking

*No violations — table intentionally omitted.*
