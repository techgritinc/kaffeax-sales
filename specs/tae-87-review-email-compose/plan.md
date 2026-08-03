# Implementation Plan: Review Email Compose

**Branch**: `tae-87-review-email-compose` | **Date**: 2026-08-03 (v3 — revised for mailto plain-text approach) | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/tae-87-review-email-compose/spec.md`

## Summary

Enhance the existing Email button on the Review screen to build a `mailto:` URL with a structured plain-text body from the `MeetingRecord` data. Clicking the button sets `window.location.href` to the mailto URL, which opens the default mail client with subject and body pre-filled. No clipboard, no file download, no toast, no intermediate steps — a single direct action from button click to compose window.

## Technical Context

**Language/Version**: TypeScript 5 / React 19

**Primary Dependencies**: Next.js 16 (App Router), Tailwind CSS v4

**Storage**: N/A — no database changes; email content generated on-the-fly from in-memory `MeetingRecord`

**Testing**: Manual validation (no testing infrastructure set up yet)

**Target Platform**: Web browser → default mail client (Outlook primary) via `mailto:` URL

**Project Type**: Web application (Next.js)

**Performance Goals**: mailto URL construction should be instantaneous (pure string operations)

**Constraints**: `mailto:` body is plain text only (no HTML); no length-based truncation — all content is always included in full per FR-014/SC-002, even if the resulting URL is very long

**Scale/Scope**: Single button enhancement on one screen; 1 new utility file, 1 modified component file

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| §I Tech Stack | PASS | No new frameworks or dependencies added |
| §II CSS & Design Tokens | PASS | No app styling changes — email uses plain text (external to the app) |
| §III TypeScript Strictness | PASS | No `any` usage; return type is `{ subject: string, body: string }` |
| §V Code Modularity | PASS | Formatter utility is a single-responsibility pure function in its own file; well under 150 lines |
| §VII Utility Functions | PASS | Email formatter placed in `src/lib/utils/workflow/` per convention |
| §IX Repository Layer | PASS | No database calls |
| §X Server Actions | PASS | No server actions — entirely client-side |
| §XI Type Isolation | PASS | No new type files — return type inlined in function signature |
| §XIV Error Handling | PASS | No async operations; pure synchronous string building |
| §XV Quality & Performance | PASS | Pure function, no side effects, no magic strings (constants extracted) |
| §XVII No Barrel Imports | PASS | Direct imports from source files |
| §XVIII camelCase | PASS | All fields use camelCase |

**Gate result**: PASS — no violations.

## Project Structure

### Documentation (this feature)

```text
specs/tae-87-review-email-compose/
├── spec.md
├── plan.md              # This file (v3)
├── research.md          # Phase 0: approach comparison and decision (v3)
├── data-model.md        # Phase 1: entity documentation (v3)
├── quickstart.md        # Phase 1: validation guide (v3)
├── contracts/
│   └── email-body-template.md  # Phase 1: plain-text body format (v3)
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (created by /speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── components/
│   └── review-screen/
│       └── review-screen.tsx        # MODIFY: replace onEmail handler with mailto URL construction
└── lib/
    └── utils/
        └── workflow/
            └── email-formatter.ts   # NEW: builds plain-text body + subject from MeetingRecord
```

**Structure Decision**: The email formatter is a domain-specific utility for the workflow domain, placed alongside the existing `transcript.mapper.ts` in `src/lib/utils/workflow/`. No new type files are needed — the formatter returns a plain `{ subject: string, body: string }` object with the type inlined in the function signature. Only one existing file is modified (`review-screen.tsx`). No changes to `app-shell.tsx` (no `onNotify` prop needed).

## Complexity Tracking

No constitution violations — this section is empty.
