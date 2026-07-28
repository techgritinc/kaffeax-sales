# Implementation Plan: Layout & Spacing Pixel Parity (Header, Review Screen, Chat/FAQ)

**Branch**: `004-layout-spacing-parity` | **Date**: 2026-07-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-layout-spacing-parity/spec.md`

## Summary

Correct residual layout/spacing pixel drift between the running Next.js app and the canonical prototype (`Design/POC_Kaffea-X_Prototype.html`) across five reported areas: the header, the Review Meeting Summary, the four Review content sections, the Review email-capture field, and the Follow-up "Ask about this lead" accent bar. This is a corrective styling pass — no new architecture, dependencies, or data model.

**Key research outcome (important — narrows scope):** Parallel investigation against the prototype found that **two of the five reported symptoms do not reproduce in code**:

- **US1 Header** — the header box and its placement in the shell are already pixel-exact (height, `0 32px`/`16px`/`12px` padding, border, shadow, and the 56px header + `calc(100vh − 56px)` shell seam leave no gap). The *only* real header discrepancy is that the header avatar does not shrink at ≤560px.
- **US2 Meeting Summary** — already at full parity. The grid shell (from feature 003) and the `.kx-narrative` block match on every property, and the Chat/FAQ panel introduces no layout divergence. **No change required.**

The genuine fixes are therefore small and localized (`research.md` Findings 1–8): a responsive header-avatar size (US1); a 3px heading indent and a 12→10px card radius on the Review content sections (US3); three spacing corrections on the email-capture field (US4); and removing an 8px top margin from the chat accent bar (US5). The US5 fix also **corrects an over-correction made in feature 003** — 003 added an 8px top margin to the chat accent bar on the assumption it was a `.kx-bar-h2`, but the prototype's chat bar has no top margin; aligning to the prototype (Principle XII) is the right call and is not a regression of a correct fix.

## Technical Context

**Language/Version**: TypeScript 5 (strict), React 19, Next.js 16 (App Router)

**Primary Dependencies**: Tailwind CSS v4 (existing `globals.css` design tokens), existing `components/ui/*` primitives. No new runtime dependencies.

**Storage**: N/A — purely presentational; no data model, repository, or server-action changes.

**Testing**: No automated test infrastructure exists (per `CLAUDE.md`). Validation is manual side-by-side comparison against `Design/POC_Kaffea-X_Prototype.html` (see `quickstart.md`) plus `npm run validate` (type-check → lint → build) as the correctness gate.

**Target Platform**: Modern evergreen browsers, the responsive breakpoints already defined in the prototype and mirrored in Tailwind `@theme` (`bp1100/900/720/640/560/400`).

**Project Type**: Web application (Next.js App Router), single existing route.

**Performance Goals**: No change from current behavior — styling-only correction, no new renders/effects/state.

**Constraints**: Pixel-perfect 1:1 fidelity to the prototype (Principle XII). Zero hardcoded hex/rgb/hsl and zero inline `style` objects (Principle II). No new runtime dependencies (Principle I). Files ≤150 LOC (Principle V). MUST NOT regress any element brought to parity under `003-fix-ui-pixel-parity` (spec FR-007).

**Scale/Scope**: 8 root-caused findings across `app-header.tsx`, `covered-decided.tsx`, `action-items.tsx`, `meta-strip.tsx`, and `chat-panel.tsx`. `app-shell.tsx`, `summary-block.tsx`/`review-screen.tsx`, `heard-grid.tsx`, and the shared `avatar.tsx`/`inline-input.tsx`/`accent-bar.tsx` primitives are **out of scope** (confirmed correct or must not change — see below).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Status | Notes |
|---|-----------|--------|-------|
| I | Tech Stack & Framework | ✅ Pass | No framework/dependency changes. No `tailwind-merge`/`clsx` added — the dependency-free `cn` is preserved. |
| II | CSS & Design Tokens | ✅ Pass | All fixes use existing tokens/utilities (`rounded-card-sm` = 10px, `ml-[3px]`, `gap-[5px]`, `px-[2px]`, `max-bp560:*`). No new hex introduced. The one color-hue observation (Actions badge `#d6a836`) has **no existing token** and is therefore **out of scope** for this feature — adding a color requires a constitution patch (Principle II) and it is not a layout/spacing issue. |
| III | TypeScript Strictness | ✅ Pass | className-only edits; no new types, no `any`, no non-null assertions. No component-API change. |
| IV | Linting & Formatting | ✅ Pass | Edits pass existing lint/format; Prettier will re-sort Tailwind classes. |
| V | Code Modularity | ✅ Pass | All touched files remain well under 150 LOC; localized edits, no new files. |
| VI | Reusable UI Components | ✅ Pass | Shared primitives (`Avatar`, `InlineInput`, `AccentBar`) are NOT modified — per-instance overrides at call sites keep other consumers (attendee/chat avatars, contact input, processing-modal bar) unchanged. |
| VII | Utility Functions | ✅ N/A | No new logic. |
| VIII–XI | Forms / Repository / Server Actions / Type Isolation | ✅ N/A | No data, forms, mutations, or new types. |
| XII | Design Fidelity | ✅ Pass (core objective) | Restores 1:1 parity; every finding cites the exact prototype rule. Includes correcting a prior 003 deviation on the chat accent bar. |
| XIII | AI-Assisted Workflow | ✅ Pass | UI-fidelity task — implementation uses `frontend-design` against the prototype (no redesign). Findings root-caused via parallel investigation subagents citing exact prototype + source lines. |
| XIV | Error Handling & Observability | ✅ N/A | No async/error paths. |
| XV | Quality & Performance | ✅ Pass | Removes drift; no new state/renders. |
| XVI | Git & Deployment Standards | ✅ Pass | Branch `004-layout-spacing-parity` follows the repo's numbering; commits follow Conventional Commits. |

**Gate result**: PASS. No violations; Complexity Tracking omitted.

**Post-Phase-1 re-evaluation**: Still PASS. All fixes are className-only, per-instance, dependency-free, token-based, and preserve shared primitives. One item (Actions badge color) is explicitly deferred as out of scope with rationale (no token exists; not a layout issue). No complexity deviations.

## Project Structure

### Documentation (this feature)

```text
specs/004-layout-spacing-parity/
├── plan.md              # This file
├── research.md          # Phase 0 output — root-caused prototype-vs-app findings
├── data-model.md        # Phase 1 output — corrected visual contracts (target values)
├── quickstart.md        # Phase 1 output — manual visual-parity validation guide
├── contracts/
│   └── visual-parity-contract.md   # Phase 1 output — acceptance surface
├── checklists/
│   └── requirements.md  # Created by /speckit-specify
└── tasks.md             # Created later by /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── components/
│   └── common/
│       ├── app-header/
│       │   └── app-header.tsx          # US1: header avatar responsive size (≤560 → 32px/12px) at the call site
│       └── app-shell/
│           └── app-shell.tsx           # OUT OF SCOPE — header placement + main-column width confirmed faithful
├── features/
│   ├── meeting-review/
│   │   └── components/
│   │       ├── covered-decided.tsx      # US3: 3px heading indent (both headings) + card radius 12→10px
│   │       ├── action-items.tsx         # US3: 3px heading indent + card radius 12→10px
│   │       ├── meta-strip.tsx           # US4: email wrapper gap 6→5px; star margins; input padding 4→2px; min-w
│   │       ├── heard-grid.tsx           # OUT OF SCOPE — "What We Heard" confirmed faithful
│   │       ├── summary-block.tsx        # OUT OF SCOPE — Meeting Summary confirmed faithful (US2)
│   │       └── review-screen.tsx        # OUT OF SCOPE — review layout width confirmed faithful (US2)
│   └── assistant-chat/
│       └── components/
│           └── chat-panel.tsx           # US5: remove 8px top margin on the chat accent bar (className override)
└── components/ui/
    ├── avatar/avatar.tsx                # OUT OF SCOPE — shared; header override done at call site, not here
    ├── input/inline-input.tsx           # OUT OF SCOPE — shared; email override done at call site (contact input relies on base)
    └── typography/accent-bar.tsx        # OUT OF SCOPE — shared; chat override done at call site (processing modal relies on h2 mt-2)
```

**Structure Decision**: No structural change. This feature edits existing feature-component files in place; all corrections to elements rendered via shared UI primitives are applied as **per-instance className overrides at the call site**, so no shared primitive changes and no other consumer is affected. No new directories, components, or dependencies.

## Complexity Tracking

*No violations — table intentionally omitted.*
