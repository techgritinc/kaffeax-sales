# Contract: Workflow Integration and Delivery Path

**Feature**: [../spec.md](../spec.md) | **Plan**: [../plan.md](../plan.md)

Where generation happens, what is written when, and how the result reaches the chips. No new server action and no new repository — this is a change to the behaviour of `runAiSummarization` plus a prop thread (D2, D8).

---

## 1. `runAiSummarization` — revised sequence

Signature and return type are **unchanged**:

```ts
runAiSummarization(input: { id: string; signals: SimplifiedSignal[] })
  : Promise<{ success: true; record: MeetingRecord } | { success: false; error: string }>
```

`MeetingRecord` now carries `suggestedQuestions`, so callers get the set with the record they already receive. No caller changes.

```text
1  parse input, load stored transcript                         (unchanged)

2  if aiProcessingStatus !== 'pending':
       update(id, { aiProcessingStatus: 'pending',
                    suggestedQuestions: [] })                   ← NEW (D5)
   // First runs skip this branch; the field is already [] by schema default.
   // suggestionUsage is NOT cleared here — see data-model.md I5. It is a record
   // of a call that really happened, and it is overwritten by the next success,
   // exactly as aiUsage already behaves.

3  summarize(cleanedTranscript, { signals })                    (unchanged)
       on failure → update(aiProcessingStatus: 'failed'), return { success: false }

4  update(id, { title, summary, leadScore,
                aiProcessingStatus: 'success', aiUsage })       (unchanged)
   // The analysis is now durable. Everything after this point is optional.

5  try:
       context = buildGroundingContext(updatedStored)
       result  = await getSuggestedQuestions().generate(context)
       if result.success:
           patched = update(id, { suggestedQuestions: result.questions,
                                  suggestionUsage: { model, provider, ...usage } })
           if patched: record = patched
       else:
           log(category, rule)                                  // no text (FR-026)
   catch (error):
       log('[transcript-ai.actions] suggestion generation failed', { id, error })
       // deliberately swallowed — FR-022, FR-023

6  return { success: true, record: toMeetingRecord(record, await currentRubric()) }
```

### Guarantees this ordering buys

| Requirement | How the sequence delivers it |
|---|---|
| FR-022 — a suggestion failure never fails the analysis | Step 4 commits `'success'` before step 5 is attempted. No step-5 path writes `aiProcessingStatus`. |
| FR-023 — nothing user-visible but a missing row | Step 5 returns no error into the action's result; the record from step 4 is returned as a success. |
| FR-004 / I4 — no stale set after re-analysis | Step 2 clears before step 3 runs, so a re-run whose step 5 fails leaves `[]`, never the previous analysis's questions. |
| FR-024 — analysis can never hang on suggestions | `generate` is awaited once, bounded by `SUGGESTION_MAX_TOKENS` and the provider client's own timeouts, with at most one retry. |
| FR-025 — cost recorded | Step 5's patch writes `suggestionUsage` in the same `AiUsage` shape as `aiUsage`. |

The `markProcessingFailed` helper in the outer `catch` is untouched: step 5 cannot throw past its own `catch`, so a suggestion failure can never route into it.

### Logging (FR-026)

One line per outcome, at `console.info` for success and `console.warn`/`console.error` for the rest, carrying: `transcriptId`, `provider`, `model`, outcome, `category` and `rule` when rejected, question **count** and **character lengths**, and token counts. Never a question, a transcript excerpt, or an analysis excerpt — which is exactly why `rule` is a code (see [ai-response.md](./ai-response.md)).

---

## 2. Delivery path to the chips

```text
transcripts.suggestedQuestions
  → transcriptRepository.findById / update        (StoredTranscript.fields)
  → toMeetingRecord()                            MeetingRecord.suggestedQuestions
  → workflow provider (wf.draft)
  → app-shell.tsx                                <ChatPanel suggestedQuestions={…} />
  → chat-panel.tsx                               <ChatMessages suggestedQuestions={…} />
  → chat-messages.tsx                            <SuggestedQuestions questions={…} onSelect={send} />
```

Every hop already exists for `openingMessage`, which `app-shell.tsx` derives from the same `wf.draft`. Nothing is fetched when the panel opens, so the chips are in the first render (FR-002, SC-004).

`app-shell.tsx` passes `wf.draft?.suggestedQuestions ?? []` — during capture `wf.draft` is `null`, which yields no chips, matching the assistant being unavailable at that stage (FR-020, US3 scenario 3).

### The write-back exclusion

`toTranscriptPatch` must not gain `suggestedQuestions`. It builds the `updateTranscript` patch from a client-held `MeetingRecord`; including the field would let the review screen's save overwrite a generated set. Partial-patch semantics (`findByIdAndUpdate` with a `Partial<TranscriptFields>`) preserve it as long as the key is absent. This warrants a comment in the mapper at the point where a future contributor would add it (D8).

---

## 3. Component contract

```ts
// suggested-questions.tsx
interface SuggestedQuestionsProps {
  questions: string[];              // exactly 3, or empty
  onSelect: (question: string) => void;
}
```

Behaviour:

- `questions.length !== SUGGESTED_QUESTION_COUNT` → return `null`. No eyebrow, no container, no placeholder (FR-017). Rendering nothing for a set of 1 or 2 is intentional belt-and-braces: I1 already makes that state unreachable in the database.
- Otherwise render the existing eyebrow (`Suggested`) and one chip per question, with the classes moved verbatim from `chat-messages.tsx` — same rounded pill, same border, same hover, same wrap container (FR-021, SC-008).
- `onSelect(question)` is wired to the panel's existing `send`, so a chip click is indistinguishable from typing that text: same trim, same in-flight guard, same persistence (FR-019).

`chat-messages.tsx` keeps the placement condition it has today (`i === 0 && m.role === 'ai'`), which is what keeps a restored conversation from being topped with chips (FR-018), and delegates everything inside it.

---

## 4. What does not change

- **`use-meeting-chat.ts`** — the set is constant per meeting; no hook state, no restore interaction (D8).
- **`askAboutMeeting` and the exchange collection** — a chip is an ordinary question once clicked.
- **`deleteTranscript`** — the fields live on the transcript document, so deletion already cascades (FR-005, D4).
- **`structured-analysis.utils.ts`, `constants/summarization.ts`** — the analysis prompt and its output contract are untouched (D1).
- **The visual design** — no new token, class, or breakpoint.
