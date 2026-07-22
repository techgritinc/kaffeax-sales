# Implementation Plan: Pixel-Perfect UI Parity with HTML Prototype

**Branch**: `003-fix-ui-pixel-parity` | **Date**: 2026-07-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-fix-ui-pixel-parity/spec.md`

## Summary

Correct pixel-level visual drift between the running Next.js app and the canonical prototype (`Design/POC_Kaffea-X_Prototype.html`), then audit every remaining screen for the same class of drift. The spec's four user stories target, in priority order: the meeting-library sidebar (structure + per-row status indicator), the "Draft"/"Saved to CRM" status-chip styling wherever it recurs, the accent-bar decorative element across all headings, and finally a full-application visual sweep.

**Technical approach**: No new architecture, dependencies, or data model — this is a corrective pass over existing `components/ui/typography` (`AccentBar`), `features/meeting-library/components` (`Sidebar`, `SidebarItem`), and their call sites. Root-caused discrepancies (see `research.md`) are: (1) the sidebar's per-row status badge uses raw brand-color text utilities (`text-green`/`text-mustard`) instead of the prototype's dedicated on-dark text tints, requiring new design tokens registered in `globals.css`; (2) `SidebarItem` is missing the prototype's vertical inter-row margin; (3) `CaptureScreen` renders its hero `AccentBar` with the wrong variant (`h2`/bright-blue/fixed-size) where the prototype always uses the midnight bar, responsively resized within `.kx-capture-hero`; (4) `AccentBar` itself encodes no margin, so every call site improvises spacing ad hoc, drifting from the prototype's per-context margin rules. Fixes stay inside existing components/tokens — no new component tree, no behavior change, no server/data-layer involvement.

## Technical Context

**Language/Version**: TypeScript 5 (strict), React 19, Next.js 16 (App Router)

**Primary Dependencies**: Tailwind CSS v4 (existing `globals.css` design tokens), existing `components/ui/*` primitives. No new runtime dependencies.

**Storage**: N/A — purely presentational fix; no data model, repository, or server action changes.

**Testing**: No automated test infrastructure exists in the project (per `CLAUDE.md`). Validation is manual: side-by-side visual comparison against `Design/POC_Kaffea-X_Prototype.html` (see `quickstart.md`) plus `npm run validate` (type-check → lint → build) as the correctness gate.

**Target Platform**: Modern evergreen browsers, same responsive breakpoints already defined in the prototype and mirrored in `src/constants/breakpoints.ts` / Tailwind `@theme` (`bp1100/900/720/640/560/400`).

**Project Type**: Web application (Next.js App Router), single existing route — no new routes.

**Performance Goals**: No change from current behavior; this is a styling-only correction with no new renders, effects, or state.

**Constraints**: Pixel-perfect 1:1 fidelity to the prototype (Principle XII). Zero hardcoded hex/rgb/hsl and zero inline `style` objects (Principle II) — any new color tint MUST become a named token in `globals.css`. Files ≤150 LOC (Principle V).

**Scale/Scope**: 3 known-broken elements (sidebar structure/status chip, accent bar, chip spacing) confirmed across 4 files (`accent-bar.tsx`, `sidebar-item.tsx`, `sidebar.tsx`, `capture-screen.tsx`) plus their call sites (`commit-screen.tsx`, `processing-modal.tsx`, `chat-panel.tsx`), and a full-application audit across the 5 existing screens (capture, processing, review, commit, library/sidebar).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Status | Notes |
|---|-----------|--------|-------|
| I | Tech Stack & Framework | ✅ Pass | No framework/dependency changes. |
| II | CSS & Design Tokens | ✅ Pass (by design) | Root cause of the status-chip color drift is a *missing* token (raw `text-green`/`text-mustard` used instead of a dedicated tint). Fix adds the tint(s) to `globals.css`/`@theme`, never a hardcoded hex in a component. |
| III | TypeScript Strictness | ✅ Pass | No new data shapes; existing prop types (`AccentBarProps`, `SidebarProps`, `SidebarItemProps`) are reused or narrowly extended. |
| IV | Linting & Formatting | ✅ Pass | No change to tooling; edits pass existing lint/format config. |
| V | Code Modularity | ✅ Pass | All touched files are already well under 150 LOC; fixes are localized, no new files required beyond possibly a small shared status-chip constant. |
| VI | Reusable UI Components | ✅ Pass (reinforced) | US2 explicitly requires the draft/saved status chip to be one consistently-styled element rather than styled per call site — this *strengthens* compliance with this principle. |
| VII | Utility Functions | ✅ N/A | No new pure logic; this is styling only. |
| VIII | Schema Validation & Forms | ✅ N/A | No forms involved. |
| IX | Repository Layer | ✅ N/A | No data access involved. |
| X | Server Actions & API Layer | ✅ N/A | No mutations/fetching involved. |
| XI | Type Isolation | ✅ Pass | No new global types; existing types untouched. |
| XII | Design Fidelity | ✅ Pass (core objective) | This entire feature exists to restore Principle XII compliance. `research.md` documents the exact prototype rules being restored. |
| XIII | AI-Assisted Workflow | ✅ Pass | Pure UI-fidelity task → implementation MUST use the `frontend-design` skill against the prototype (no brainstorming/redesign — the prototype already dictates every value). |
| XIV | Error Handling & Observability | ✅ N/A | No new async operations, error paths, or logging. |
| XV | Quality & Performance | ✅ Pass | Fixes remove ad-hoc/inconsistent styling (an existing SRP/consistency smell) rather than adding any. No new client state. |
| XVI | Git & Deployment Standards | ✅ Pass | Branch `003-fix-ui-pixel-parity` follows the numbering convention used by prior specs in this repo; actual git branch/commits will follow `type/short-description` and Conventional Commits as usual. |

**Gate result**: PASS. No violations; nothing to record in Complexity Tracking.

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
│   └── globals.css                          # Add on-dark status-chip text tint token(s) under @theme
├── components/
│   └── ui/
│       └── typography/
│           └── accent-bar.tsx                # Encode per-variant margin; verify h1/h2 map to correct prototype rule
├── features/
│   ├── meeting-library/
│   │   └── components/
│   │       ├── sidebar.tsx                    # Verify group/header/search spacing against .kx-sidebar rules
│   │       └── sidebar-item.tsx               # Fix vertical inter-row margin; fix status-chip text color token
│   ├── meeting-capture/
│   │   └── components/
│   │       ├── capture-screen.tsx             # Fix hero AccentBar variant/size/responsiveness
│   │       └── processing-modal.tsx           # Verify AccentBar margin after AccentBar changes
│   ├── crm-commit/
│   │   └── components/
│   │       └── commit-screen.tsx              # Verify AccentBar margin after AccentBar changes
│   └── assistant-chat/
│       └── components/
│           └── chat-panel.tsx                 # Fix missing top margin on inline accent-bar element
└── features/meeting-review/                  # In scope for the US4 full-application audit pass only
```

**Structure Decision**: No structural change. This feature edits existing files in place within the current `components/ui/` and `features/<feature>/components/` layout; no new directories, features, or shared modules are introduced.

## Complexity Tracking

*No violations — table intentionally omitted.*
