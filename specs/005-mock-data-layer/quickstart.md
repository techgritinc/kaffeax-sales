# Quickstart & Validation: Mock Data Layer with Server Actions

This is a data-layer refactor with **zero intended user-visible change**. Validation is therefore mostly about proving (a) the pipeline is green, (b) behavior is identical, and (c) the architectural boundaries hold.

## Prerequisites

```bash
npm install
# .env.development present (MONGO_URI can be any value; no connection is opened by this feature)
```

## 1. Validation pipeline (must be green)

```bash
npm run validate        # type-check → lint → build
```

Expected: zero type errors, zero lint warnings (`--max-warnings=0`), successful build. No `any`, no non-null assertions introduced.

## 2. Behavior parity (manual — compare against current `main`)

Run `npm run dev` and confirm each is **identical** to pre-refactor behavior and to `Design/POC_Kaffea-X_Prototype.html`:

- [ ] Sidebar shows the 3 seeded meetings (Cascade Ember / Blue Ridge Roasters / Portland Pour) with the same titles, companies, and timestamps.
- [ ] Capture screen textarea is pre-filled with the sample Zoom transcript.
- [ ] Rubric modal shows the 7 default signals with correct weights/sources.
- [ ] Processing the sample yields the same dossier (contact company/title, confidence chips, summary sections, next steps, recap subject + body, HOT score).
- [ ] Approve → record appears in the commit/CRM view with the same fields; audit log entry recorded.
- [ ] Reject → draft removed; audit entry recorded.
- [ ] Add/edit/remove a rubric signal → re-run reflects the change.
- [ ] Reset demo → returns to the seeded starting state.
- [ ] Assistant chat canned responses unchanged.
- [ ] No loading flash on first paint (data is server-hydrated).

## 3. Architecture boundary checks (prove the refactor's intent)

```bash
# (a) No direct mock-data imports in UI/provider — should return NOTHING:
rg -n "db/mock|transcripts.fixture|rubric-signals.fixture" src/components src/features --glob '!**/actions/**'
rg -n "from './seed'|from '@/providers/workflow/seed'" src

# (b) seed.ts is gone; fixtures live only under the single mock location:
ls src/lib/db/mock
test ! -f src/providers/workflow/seed.ts && echo "seed.ts removed OK"

# (c) Repositories are the only place that touches the store/models:
rg -n "db/mock/store|db/models" src --glob '!src/repositories/**' --glob '!src/lib/db/mock/**'
# expected: no matches outside repositories/ and the mock dir itself

# (d) Mutations use server actions (files carry 'use server'):
rg -n "use server" src/features/workflow/actions
```

## 4. Migration-readiness check (SC-007, by inspection)

Confirm that replacing the mock with MongoDB would touch **only** the repository bodies:

- `src/repositories/*.repository.ts` read/write `src/lib/db/mock/store.ts` today; swapping those calls for the Mongoose models in `src/lib/db/models/` requires **no change** to `src/features/workflow/actions/*`, the mappers, `page.tsx`, or any UI/provider file.
- Documented exception: the **presentation supplement** (see `research.md` D1) is the one thing a real DB migration must address (graduate into the schema or drop the fields). Verify the supplement is isolated in `transcripts.fixture.ts` and referenced only through the mapper.

## Done = all of §1 green, §2 fully parity, §3 checks empty/expected, §4 confirmed by inspection.
