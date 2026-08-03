# Evaluation corpus — T006

SC-001 requires at least **three visibly different meetings**. Record each meeting's transcript id here once analysed, so Gates 2, 5, 6, and 7 are reproducible against the same set.

Get an id from the sidebar selection or from MongoDB:

```js
db.transcripts.find({}, { title: 1, aiProcessingStatus: 1, createdAt: 1 }).sort({ createdAt: -1 })
```

| Slot | Meeting | Transcript id | Why it is in the corpus |
|---|---|---|---|
| A | Bundled sample — Cascade Ember, Zoom, 28 min | _(fill in)_ | Known-good baseline; every A-series question in `in-scope-questions.md` is written against it |
| B | _(fill in)_ | _(fill in)_ | Different industry or outcome — a meeting that ended without a next step is a good choice |
| C | _(fill in)_ | _(fill in)_ | Sparse or messy transcript — the hardest case for fabrication, and the one Gate 2 most needs |

## Why three, and why different

Two meetings would satisfy SC-004 (same question, different answers) but not SC-001. A single well-formed transcript flatters the assistant: the sample has clean speaker labels, explicit figures, and a tidy close. The failure mode SC-001 exists to catch — filling a gap with what a meeting like this usually contains — only shows up when there *are* gaps.

Meeting C is therefore the most important entry in this table, and the easiest to skip.

## Notes on choosing B and C

- **B** should differ in outcome, not just industry. A meeting where the prospect declined, or where no next step was agreed, exercises "what was decided" against genuinely empty sections.
- **C** can be produced from a real transcript by degrading it: strip speaker labels from part of it, or paste a passage with no punctuation. Do not degrade it so far that analysis fails — the meeting must reach `aiProcessingStatus: 'success'` to be usable here.
- Keep all three analysed and undeleted for the duration of the evaluation. Deleting one now cascades its stored conversation (FR-033), which would also destroy Gate 6 evidence.
