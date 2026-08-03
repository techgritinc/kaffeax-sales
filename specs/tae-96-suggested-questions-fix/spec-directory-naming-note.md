# Note: spec directory naming conflict (T032)

**Raised**: 2026-08-03 | **Ticket**: TAE-96 | **Status**: needs an owner decision

## The conflict

`.specify/init-options.json` sets:

```json
"feature_numbering": "sequential"
```

That makes `/speckit-specify` generate directories with numeric prefixes — `001-`, `002-`, `006-`.

Constitution §XIX says the opposite, and says it categorically:

> Sequential numbering (e.g., `001-`, `002-`) is **categorically prohibited**. Ticket IDs provide unambiguous traceability to the originating task and avoid ordering conflicts on parallel branches.

## What happened on this feature

`/speckit-specify` created `specs/006-fix-suggested-questions-display`. That violates §XIX, so it was renamed to `specs/tae-96-suggested-questions-fix` and `.specify/feature.json` was repointed before planning began.

The rename is done. The generator is not fixed — **the next `/speckit-specify` invocation will produce another prohibited directory name.**

## Why this was not "just fixed"

Spec Kit offers `sequential` and `timestamp` for `feature_numbering`. Neither produces a ticket-ID prefix, so there is no config value that satisfies §XIX. The options are:

1. **Keep `sequential` and rename by hand every time** — what happened here. Works, but relies on whoever runs the command noticing. It was only caught this time because the plan's Constitution Check reads §XIX explicitly.
2. **Pass `SPECIFY_FEATURE_DIRECTORY` explicitly on every `/speckit-specify` call** — e.g. `SPECIFY_FEATURE_DIRECTORY=specs/tae-96-…`. The command honours an explicitly provided value and skips prefix generation entirely. This is the only option that makes the correct outcome the default path rather than a correction.
3. **Amend §XIX** to permit the generator's format. Requires a written proposal, a semver bump, and template propagation per the constitution's Governance section — and would lose the traceability §XIX was added to gain.

Option 2 is the recommendation. It needs no constitution change and no tooling change; it is a convention about how the command is invoked.

## Why this file exists rather than an edit

Changing `.specify/init-options.json` alters how a shared tool behaves for everyone on the project, and none of its legal values resolve the conflict anyway. Amending the constitution is explicitly a governance action with required steps. Both are the maintainer's call, not something to slip into a bug-fix branch.

Recorded here so the trap is visible the next time someone runs `/speckit-specify`.
