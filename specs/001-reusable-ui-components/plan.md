# Implementation Plan: Reusable UI Components — Kaffea-X Prototype Reproduction

**Branch**: `feature/reusable_ui_components` | **Date**: 2026-07-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-reusable-ui-components/spec.md`

## Summary

Reproduce the Kaffea-X prototype (`Design/POC_Kaffea-X_Prototype.html`) as a running Next.js 16 application that is visually and behaviourally indistinguishable from the prototype, built from a library of reusable, prop-configurable UI components. The prototype is a single-file, client-side React demo (React 18 UMD + Babel + a ~2,200-line hand-written `kx-*` stylesheet) that walks a reviewer through Capture → Review → Commit, with a recent-meetings sidebar, a scoring-rubric modal, and an assistant chat rail — all mocked client-side with no network calls.

**Technical approach**: A single App Router route hosts a client-side `AppShell` wrapped by a `WorkflowProvider` (React Context + reducer) that owns the entire mocked state machine and pure "engine" (signal detection, banding, scoring, narrative/recap generation) plus the seed data. The prototype's `kx-*` CSS is translated into Tailwind v4 utility classes that resolve exclusively from design tokens in `globals.css` (colours/fonts/type-scale already present; radii, shadows, gradients, animations, and custom breakpoints added via `@theme`). Atomic primitives live in `components/ui/`, cross-feature composition in `components/common/`, and each workflow surface is its own feature module that consumes shared state through the provider — never importing another feature's internals. No visual, layout, behavioural, or dependency additions beyond faithful reproduction.

## Technical Context

**Language/Version**: TypeScript 5 (strict), React 19.2.4, Next.js 16.2.10 (App Router)

**Primary Dependencies**: Next.js 16, React 19, Tailwind CSS v4 (`@tailwindcss/postcss`), `next/font` (Figtree + Playfair Display). No new runtime dependencies required for reproduction. `zod` present but not exercised (see Constitution Check §VIII).

**Storage**: None. All data is mocked/seeded in-memory client-side, exactly as the prototype. No MongoDB, no persistence, no network.

**Testing**: No test infrastructure exists and none is requested by the spec. The engine (pure functions) is written to be independently testable; validation is via `quickstart.md` scenarios and `npm run validate` (type-check → lint → build).

**Target Platform**: Modern evergreen browsers (Chrome/Edge/Firefox 111+, Safari 16.4+ per Next 16 baseline). Desktop-first with the prototype's responsive breakpoints.

**Project Type**: Web application (Next.js App Router), single-route client-driven SPA-style workflow.

**Performance Goals**: 60 fps interactions; instant view transitions (in-memory state, no route navigation); animations match the prototype's timings (processing tick 380ms, toast 3200ms, etc.).

**Constraints**: Pixel-perfect 1:1 fidelity to the prototype (Principle XII). Zero hardcoded hex/rgb/hsl and zero inline `style` objects (Principle II). Zero `any`, zero non-null assertions (Principle III). Files ≤150 LOC (Principle V). `--max-warnings=0`.

**Scale/Scope**: 1 route; ~6 feature surfaces (Capture, Review, Commit, Library/Sidebar, Rubric, Chat) + shell/header/stepper; ~25–30 atomic primitives; ~30 inline SVG icons; 8 mock-data entity shapes; 3 seed records.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| # | Principle | Status | Notes |
|---|-----------|--------|-------|
| I | Tech Stack & Framework | ✅ Pass | Next 16 App Router, React 19, TS5, Tailwind v4. No new frameworks. `env.mjs` untouched. |
| II | CSS & Design Tokens | ✅ Pass (by design) | All `kx-*` CSS translated to Tailwind utilities resolving from `globals.css` tokens. New tokens (radii, shadows, gradients, animations, breakpoints) added via `@theme`. No hardcoded colours, no inline styles. |
| III | TypeScript Strictness | ✅ Pass | Explicit prop interfaces per component; `unknown`+narrowing; `?.`/`??`; no `any`/`!`. |
| IV | Linting & Formatting | ✅ Pass | Conventional commits, `ui`/`app`/`config` scopes. Prettier import + Tailwind class sorting. |
| V | Code Modularity | ✅ Pass | Hyper-modular; one component per file ≤150 LOC. Large views decomposed into sub-components/hooks. |
| VI | Reusable UI Components | ✅ Pass (core objective) | Atomic primitives in `components/ui/`, generalised via props, reused across features. |
| VII | Utility Functions | ✅ Pass | Pure engine/formatters extracted from components (see §Structure). |
| VIII | Schema Validation & Forms | ⚠️ N/A — justified | The prototype has **no validated forms** — only controlled inline inputs and an empty/non-empty email check. Reproducing it faithfully (Principle XII) does not introduce react-hook-form/Zod. See Complexity Tracking. |
| IX | Repository Layer | ⚠️ N/A | No database in this feature. Nothing to abstract. Not violated — not exercised. |
| X | Server Actions & API Layer | ⚠️ N/A | No mutations/persistence; all state is client-side mock. No `/app/api/` handlers created (compliant). |
| XI | Type Isolation | ✅ Pass | Shared domain types in `src/types/*.types.ts`; feature-specific types inside each feature's `types/`. No global dump. |
| XII | Design Fidelity | ✅ Pass (core objective) | Prototype is canonical; exact px/colours/spacing reproduced. Prototype quirks preserved (documented in spec Assumptions). |
| XIII | AI-Assisted Workflow | ✅ Pass | UI task → `frontend-design` for exact translation (prototype IS the design). No redesign. |
| XIV | Error Handling & Observability | ✅ Pass | No bare `catch {}`; `FileReader`/clipboard failures handled explicitly (match prototype behaviour). No sensitive data. |
| XV | Quality & Performance | ⚠️ Mostly pass — 1 justified deviation | SRP, named constants (no magic numbers/strings), loading/empty states reproduced, `next/image` with explicit dims. **Deviation**: workflow step is kept in client state (not URL state) to match the prototype's exact behaviour (no URL change on step transitions). See Complexity Tracking. |
| XVI | Git & Deployment Standards | ✅ Pass | Branch `feature/reusable_ui_components` conforms; PR to `main`; `validate` pipeline. |

**Gate result**: PASS. Two N/A principles (IX, X) are not exercised by a client-only mock; §VIII and one aspect of §XV are justified deviations recorded in Complexity Tracking. No unjustified violations.

## Project Structure

### Documentation (this feature)

```text
specs/001-reusable-ui-components/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (UI + context contracts)
│   ├── ui-primitives.md
│   ├── feature-components.md
│   └── workflow-context.md
├── checklists/
│   └── requirements.md  # Created by /speckit-specify
└── tasks.md             # Created later by /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── globals.css              # Design tokens + @theme (extend: radii, shadows, gradients, animations, breakpoints)
│   ├── layout.tsx               # Root layout; wire next/font (Figtree, Playfair Display) variables
│   └── page.tsx                 # Thin route → renders <AppShell/> (routing only)
│
├── components/
│   ├── ui/                      # Atomic reusable primitives (design system)
│   │   ├── icon/                # Icon wrapper + 30 inline-SVG icons
│   │   ├── button/              # Button (variant: primary|approve|reject|send|ghost|link|mini; size)
│   │   ├── badge/               # Badge / band pill (hot|warm|cold)
│   │   ├── chip/                # Chip, signal-chip, metric-chip, status/side/due tags
│   │   ├── input/               # Input, InlineInput (dashed), SearchInput (warn state)
│   │   ├── textarea/            # Textarea (mono variant)
│   │   ├── card/                # Card (navy variant) + section primitives
│   │   ├── avatar/              # Avatar (initials + image variants)
│   │   ├── segmented-control/   # HOT/WARM/COLD weight picker
│   │   ├── breadcrumb/          # Breadcrumb / crumb (active/disabled)
│   │   ├── tooltip/             # Hover evidence popover
│   │   ├── modal/               # Overlay + backdrop shell
│   │   ├── toast/               # Toast (success|reject|info)
│   │   ├── spinner/             # Loader2 spin
│   │   ├── shimmer/             # Shimmer bar
│   │   ├── confidence-dot/      # Conf (high|medium|low)
│   │   └── ...                  # eyebrow, divider, accent-bar, heading primitives
│   └── common/                  # Cross-feature composed components
│       ├── app-shell/           # Grid shell (sidebar | main | chat), responsive modifiers
│       ├── app-header/          # 56px header (logo, app label, user block, avatar)
│       └── stepper/             # Capture › Review › CRM breadcrumb w/ gating
│
├── features/
│   ├── meeting-capture/         # Capture screen + transcript card + drag/drop + processing modal
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── utils/
│   │   └── types/
│   ├── meeting-review/          # Review dossier (hero, meta, narrative, signal grid, topics/decisions, action items)
│   │   ├── components/
│   │   ├── utils/
│   │   └── types/
│   ├── crm-commit/              # Commit screen + commit cards
│   │   ├── components/
│   │   └── types/
│   ├── meeting-library/         # Sidebar recent meetings (drafts / saved), search, collapse/drawer
│   │   ├── components/
│   │   ├── hooks/
│   │   └── types/
│   ├── scoring-rubric/          # Rubric modal (banding rules, editable signals, composer)
│   │   ├── components/
│   │   └── types/
│   └── assistant-chat/          # Chat rail (greeting, chips, bubbles, canned responses, FAB)
│       ├── components/
│       ├── hooks/               # useAutoScroll, canned-response logic
│       └── types/
│
├── providers/
│   └── workflow/                # Explicit shared module — the app's single state machine
│       ├── workflow-provider.tsx  # 'use client' Context + reducer; exposes state + actions
│       ├── workflow-context.ts     # Context + useWorkflow() hook + action/state types
│       ├── engine.ts               # Pure: detectSignals, detectNextStep, applyBanding,
│       │                           #   buildRationale/Narrative/Recap, normalize, runProcessing
│       └── seed.ts                 # SEED_LIBRARY, SAMPLE transcript, DEFAULT_RUBRIC, CURATED
│
├── types/                       # Shared cross-feature domain types
│   ├── meeting.types.ts         # MeetingRecord, Contact, Summary, Attendee, NextStep, Commitment
│   ├── rubric.types.ts          # RubricSignal, Rubric, Band, Weight, Confidence
│   ├── scoring.types.ts         # DetectedSignal, LeadScore, RecapEmail
│   └── workflow.types.ts        # Step, ToastTone, WorkflowState, WorkflowAction, AuditEntry, CrmRecord
│
└── constants/
    ├── bands.ts                 # BAND colour map, BAND_DOT, SCORE_BY_BAND (hot 93 / warm 68 / cold 34)
    ├── workflow.ts              # PROC_STEPS labels, timings, id prefixes (DRF/ZOHO/REJ), model id, reviewer
    └── breakpoints.ts           # 1100 / 900 / 720 / 640 / 560 / 400 (mirrors @theme breakpoints)
```

**Structure Decision**: Web application, single App Router route. The reusable design system lives in `components/ui/` (atomic) and `components/common/` (composed shell/header/stepper). Each workflow surface is an isolated feature under `features/`. Because all surfaces share one state machine, one dataset, and one scoring engine, that shared logic is exposed through an **explicitly defined shared module** — `providers/workflow/` — which the constitution permits as the cross-feature dependency path (alongside `types/`, `constants/`). Features consume `useWorkflow()` and never import one another's internals. This keeps `lib/` free of business logic (the engine is orchestration/domain logic owned by the provider module, not a generic utility) while satisfying reusability, modularity, and the no-cross-feature-import rule.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| §VIII react-hook-form/Zod not used for the inputs | The prototype has no validated forms — only controlled inline text inputs and an empty/non-empty email gate. Adding RHF+Zod would introduce behaviour (validation messages, resolvers) absent from the prototype, violating Principle XII (fidelity) and FR-022 (no additions). | Using RHF+Zod would change on-screen behaviour and add machinery for inputs that have no validation rules to enforce. Faithful reproduction wins. |
| §XV workflow `step` held in client state, not URL state | The prototype transitions Capture→Review→Commit with no URL change and gates reachability purely in memory. Mirroring this exactly is required by Principle XII and SC-007 (no behaviour absent from the prototype). | URL/searchParams-driven steps would alter the address bar, enable deep-linking, and change navigation behaviour the prototype does not have — a visible deviation. Single-route in-memory state matches the prototype 1:1. |
| Engine + seed data placed under `providers/workflow/` rather than `lib/` | The scoring engine is shared domain logic used by Capture (process) and Rubric (re-score). It must be reachable by multiple features without cross-feature imports. | `lib/` forbids business logic; placing it in any one feature would force other features to import that feature's internals (forbidden). The provider module is the sanctioned shared entry point. |
