# Contract: Workflow Context (`src/providers/workflow/`)

The single shared state module. `WorkflowProvider` is a Client Component; all features consume state and dispatch actions through the `useWorkflow()` hook. This is the sanctioned cross-feature dependency path (no feature imports another feature).

## Hook

```
useWorkflow(): WorkflowState & WorkflowActions
```

Throws if used outside `WorkflowProvider`.

## State

See `data-model.md → Aggregate workflow state` for `WorkflowState`. Selectors/derived helpers exposed alongside state:

- `activeRecord: MeetingRecord | null` — resolved from `draftId`.
- `score: number` — `SCORE_BY_BAND[activeRecord.lead_score.band]`.
- `emailMissing: boolean` — true when the active prospect email is empty (gates Approve).
- `wordCount: number` — live count from `transcript`.
- `draftGroup / savedGroup: MeetingRecord[]` — sidebar groupings (filtered by search).
- `canReview / canCommit: boolean` — stepper gating flags.

## Actions

| Action | Signature | Effect (reproduces prototype) |
|--------|-----------|-------------------------------|
| `setTranscript` | `(text: string) => void` | Updates transcript + word count; clears error. |
| `loadSample` | `() => void` | Loads `SAMPLE` into transcript. |
| `handleFile` | `(file: File) => void` | `FileReader.readAsText` → transcript; explicit error → `status='error'` banner. |
| `process` | `() => void` | `status='processing'`; runs 380ms `procTick`; `runProcessing(transcript, rubric)`; mints `DRF-######`; prepends draft to `library`; `draftId` set; `step='review'`. |
| `patch` | `(path: string, value: unknown) => void` | Deep-clones active draft and sets a dotted-path field (inline edits). |
| `approve` | `() => void` | If committed → update path (updates `crm`/`library`, `audit(updated)`, toast). Else mint `ZOHO-######`, `committed=true`, add `CrmRecord`, `audit(written)`, `step='commit'`, success toast. |
| `reject` | `() => void` | `audit(rejected, REJ-######)`; remove draft from `library`; `step='capture'`; reject toast. |
| `goTo` | `(step: Step) => void` | Gated navigation (review needs `canReview`; commit needs `canCommit`). |
| `openFromLibrary` | `(id: string) => void` | Sets `draftId`; `step='review'`. |
| `newCapture` | `() => void` | Resets transcript; `step='capture'`. |
| `resetDemo` | `() => void` | Restores seed state. |
| `notify` | `(message: string, tone: ToastTone) => void` | Sets `toast`; auto-dismiss after 3200ms. |
| `setSidebarOpen` / `setChatVisible` / `setRubricOpen` | `(open: boolean) => void` | Layout toggles. |
| `addSignal` | `(signal: RubricSignal) => void` | Appends signal (`custom_<timestamp>`). |
| `updateSignal` | `(id: string, patch: Partial<RubricSignal>) => void` | Inline label/weight edit. |
| `removeSignal` | `(id: string) => void` | Deletes a rubric signal. |
| `sendChat` | `(text: string) => void` | Appends user msg + pending AI msg; resolves via `useCannedResponse`; auto-scroll. |

## Engine (pure, `engine.ts`) — no side effects, independently testable

| Function | Signature | Notes |
|----------|-----------|-------|
| `detectSignals` | `(transcript: string, rubric: Rubric) => DetectedSignal[]` | Lowercases; matches each signal's `hints` (or label-word fallback); extracts ±28-char snippet. |
| `detectNextStep` | `(transcript: string) => boolean` | Regex: weekday/"next week"+affirmation, "send it/the deck/across", "calendar invite". |
| `applyBanding` | `(signals, hasNextStep) => Band` | hot≥1 && nextStep → hot; warm≥1 && cold===0 → warm; hot≥1 → warm; else cold. |
| `buildRationale` | `(band, signals) => string` | Band-keyed. |
| `buildNarrative` | `(band, ...) => string` | Band-keyed. |
| `buildRecap` | `(band, ...) => RecapEmail` | Band-keyed subject+body. |
| `normalize` | `(payload) => MeetingRecord` | Coerces shape; confidence defaults. |
| `runProcessing` | `(transcript, rubric) => MeetingRecord` | Orchestrates the above; simulated 900–1400ms latency handled in the provider, not the pure fn. |

## Contract acceptance

- Given `SAMPLE` + `DEFAULT_RUBRIC`, `runProcessing` yields the prototype's Cascade Ember outcome (band `hot`, score 93, the same detected signals/evidence) (SC-004).
- Editing the rubric changes subsequent `runProcessing` output (US4).
- All id formats, timings, audit fields, and model id match the prototype (R7).
