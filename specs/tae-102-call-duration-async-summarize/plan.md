# Implementation Plan: Call Duration Display & Background Summary Generation

**Branch**: `tae-102-call-duration-async-summarize` | **Date**: 2026-08-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/tae-102-call-duration-async-summarize/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Two independent enhancements to the existing Capture → Review workflow: (1) show the call's duration next to its date on the Review screen, and (2) let users send a summary generation to the background instead of waiting on-screen for 2–3 minutes, with status/toast feedback and a new `cancelled` state for a synchronous wait interrupted by refresh/reload. No new infrastructure is introduced — background execution uses Next.js's built-in `after()`, completion notification uses a bounded client-side poll of the existing recents list, and cancellation detection uses a `sessionStorage` marker reconciled on next app mount. See [research.md](./research.md) for the rationale behind each of these choices.

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: TypeScript 5, React 19, Next.js 16 (App Router)

**Primary Dependencies**: Mongoose 9 (MongoDB), Zod 4, `next/server` `after()` (no new packages)

**Storage**: MongoDB via existing `transcriptRepository` / Mongoose model — extended, not replaced

**Testing**: None configured yet at the repo level (per CLAUDE.md: "No tests yet"); validation is manual per [quickstart.md](./quickstart.md) plus `npm run validate` (type-check → lint → build)

**Target Platform**: Self-hosted Node.js server (`next start`) — no static export, no serverless adapter configured

**Project Type**: Web application (Next.js App Router, single repo — no separate frontend/backend split)

**Performance Goals**: No new numeric targets beyond the existing app; the point of this feature is to remove a 2–3 minute *blocking* wait, not to change generation latency itself (SC-002)

**Constraints**: No new infrastructure dependency (queue, websocket, pub/sub) may be introduced — reuse `after()`, Server Actions, and the existing recents/toast plumbing only (see research.md)

**Scale/Scope**: 2 screens touched (capture, review), 1 sidebar component, 1 enum extension, 1 new field, 3 Server Actions (1 modified, 2 new) — no new routes, no new pages

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Status |
|---|---|---|
| §I Tech Stack | No new framework/library introduced; `after()` is built into the already-pinned Next.js 16 | PASS |
| §III TypeScript Strictness | New `durationSeconds?: number`, extended `AI_PROCESSING_STATUSES` union, new `originalTranscript: string` on `MeetingRecord` — all explicit types, no `any`/`!` | PASS |
| §V Code Modularity | `ProcessingModal` and `MetaStrip` stay under 150 LOC with the additions (small prop-driven additions, not new files of logic); new logic (cancellation reconciliation, poll loop) goes into dedicated hooks/utils, not inline in components | PASS (verify at implementation time) |
| §VII Utility Functions | `formatCallDuration` is a new pure utility in `src/lib/utils/workflow/` | PASS |
| §IX Repository Layer | All new reads/writes go through `transcriptRepository` — no direct Mongoose/DB calls added elsewhere | PASS |
| §X Server Actions & API Layer | `runAiSummarizationInBackground` and `cancelProcessing` are Server Actions in `src/server-actions/workflow/`; no `/app/api/` route handler added (this was the deciding factor against a `sendBeacon`-based cancellation design — see research.md §3) | PASS |
| §XI Type Isolation | New fields land in `src/types/transcript.types.ts` / `src/types/meeting.types.ts`; the Mongoose model only adds a schema field referencing the existing `AI_PROCESSING_STATUSES` const, no inline types | PASS |
| §XII Design Fidelity | Duration display and the "Run in background" control are **not** in the existing `Design/POC_Kaffea-X_Prototype.html` (new UI surface area). Implementation must follow the prototype's existing visual language (spacing/typography/icon sizing conventions already used in `MetaStrip`/`ProcessingModal`) since there's no reference frame to match pixel-for-pixel; flag any new visual decision for review rather than inventing an unrelated style | ATTENTION — no violation, but requires care during implementation (frontend-design skill should still govern icon/spacing choices even without a literal prototype frame) |
| §XIV Error Handling | `cancelProcessing`/background failures must log with context and never leave a transcript silently stuck; bare `catch {}` remains prohibited | PASS (to be verified at implementation) |
| §XV Simplicity/New Dependencies | No new dependency added — this was the primary constraint driving every decision in research.md | PASS |

No gate failures. No entries required in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/tae-102-call-duration-async-summarize/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── server-actions.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

This is a single Next.js App Router application (no frontend/backend split — see CLAUDE.md/constitution Directory Architecture). All changes land inside the existing `src/` tree, in files that already exist plus a small number of new files following the same per-domain layout already in use:

```text
src/
├── types/
│   ├── transcript.types.ts         # MODIFIED — durationSeconds field, extended AI_PROCESSING_STATUSES
│   └── meeting.types.ts            # MODIFIED — durationSeconds, originalTranscript on MeetingRecord
├── lib/
│   ├── db/models/transcript.model.ts   # MODIFIED — schema field + enum
│   └── utils/workflow/
│       ├── transcript.mapper.ts        # MODIFIED — map new fields in toMeetingRecord
│       └── duration.utils.ts           # NEW — formatCallDuration()
├── server-actions/workflow/
│   └── transcript-ai.actions.ts    # MODIFIED — 'processing' status, duplicate guard;
│                                    #            NEW: runAiSummarizationInBackground, cancelProcessing
├── hooks/workflow/
│   ├── workflow-actions.utils.ts   # MODIFIED — runSummarize sets/clears the sessionStorage marker,
│                                    #            wires the new background/cancel paths
│   └── use-workflow-actions.ts     # MODIFIED — openFromRecent restores originalTranscript;
│                                    #            NEW: mount-time cancellation reconciliation
├── providers/recents/
│   └── recents-provider.tsx        # MODIFIED — bounded poll while any item is 'processing'
├── components/
│   ├── capture-screen/
│   │   └── processing-modal.tsx    # MODIFIED — "Run in background" action
│   ├── review-screen/
│   │   └── meta-strip.tsx          # MODIFIED — duration + clock icon
│   ├── meeting-library/
│   │   └── sidebar-item.tsx        # MODIFIED — explicit 'processing'/'cancelled' branches
│   └── ui/icon/
│       └── icon-paths.tsx          # MODIFIED — add 'Clock' icon
└── constants/workflow/
    └── recents.constants.ts        # MODIFIED (if a poll-interval constant is added here)
```

**Structure Decision**: No new top-level directories or architectural layers. Every change is either a modification to an existing file in its established domain location, or a new file placed alongside its closest existing sibling (`duration.utils.ts` next to `transcript.mapper.ts`; no new Server Action files — the two new actions join the existing `transcript-ai.actions.ts` since they operate on the same entity and share its guard logic).

## Complexity Tracking

*No Constitution Check violations — this section is intentionally empty.*
