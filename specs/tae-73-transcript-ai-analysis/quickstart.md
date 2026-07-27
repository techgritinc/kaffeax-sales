# Quickstart: Transcript AI Analysis & Scoring

**Phase**: 1 | **Feature**: [Transcript AI Analysis & Scoring](spec.md) | **Date**: 2026-07-24

Manual end-to-end validation scenarios to verify the feature works correctly after implementation. No automated test runner exists yet — these are step-by-step checks to run in a development environment.

---

## Prerequisites

1. **Environment variables** — `.env.development` must include:
   ```
   ANTHROPIC_API_KEY=sk-ant-...   # Valid Anthropic API key
   MONGO_URI=mongodb://...        # Local or Atlas connection string
   ```
   The `ANTHROPIC_API_KEY` must be added to `env.mjs` as a required server variable before starting.

2. **Database state** — At least one rubric-signals document must exist in MongoDB with `isActive: true` and a `pointValue` field. Insert the following sample signals via MongoDB Compass or `mongosh` before running scenarios:

   ```json
   [
     {
       "signalId": "sig-budget-approved",
       "label": "Budget approved",
       "weight": "hot",
       "source": "client",
       "hints": ["budget confirmed", "funds approved", "budget allocated"],
       "isActive": true,
       "pointValue": 40
     },
     {
       "signalId": "sig-poc-agreed",
       "label": "POC or pilot agreed",
       "weight": "hot",
       "source": "proposed",
       "hints": ["proof of concept", "pilot program", "trial agreed"],
       "isActive": true,
       "pointValue": 35
     },
     {
       "signalId": "sig-timeline-defined",
       "label": "Timeline defined",
       "weight": "warm",
       "source": "client",
       "hints": ["go-live date", "launch timeline", "implementation schedule"],
       "isActive": true,
       "pointValue": 15
     },
     {
       "signalId": "sig-no-budget",
       "label": "No budget this quarter",
       "weight": "cold",
       "source": "client",
       "hints": ["no budget", "budget frozen", "cost cutting"],
       "isActive": true,
       "pointValue": 0
     }
   ]
   ```

3. **Dev server** running: `npm run dev`

---

## Scenario 1 — HOT lead, full summary, email extracted (Happy Path)

**Input transcript** (paste as `originalTranscript` on a Transcript record):

```
Jane Doe (KaffaX): Good morning everyone. Thanks for joining. Quick agenda — we'll cover the platform overview, then pricing, and agree on next steps.

Alice Smith (Prospect): Sounds great. We've reviewed your proposal. The board approved the budget yesterday — we have $200k allocated for this project.

Jane Doe (KaffaX): Fantastic. Regarding the POC — are you comfortable committing to a 6-week pilot?

Alice Smith (Prospect): Yes, absolutely. We'd like to start the POC on August 15th. My email is alice.smith@acmecorp.com.

Bob Jones (Prospect): We'll need the implementation team looped in. Open question: which data migration path do you recommend?

Jane Doe (KaffaX): Great question — I'll send you our data migration playbook by end of week.

Alice Smith (Prospect): Perfect. We'll review it internally and come back with questions by next Friday.
```

**Expected outcome**:
- Transcript status → `draft` (analysis succeeded, awaiting rep review)
- `summary.title` contains "HOT" and references the meeting topic
- `summary.narrative` explains HOT band assignment, references budget and POC signals
- `summary.attendees` contains Jane Doe (kaffeax), Alice Smith (prospect), Bob Jones (prospect)
- `summary.whatWasCovered` contains topics like platform overview, pricing, POC timeline
- `summary.actionItems` includes Jane sending the data migration playbook with due "end of week"
- `summary.commitments` includes Alice's commitment to review and respond by next Friday
- `summary.openQuestions` includes the data migration path question
- `leadScore.band` → `hot` (budget approved + POC agreed + next step confirmed)
- `leadScore.score` → 75 (sig-budget-approved pointValue 40 + sig-poc-agreed pointValue 35)
- `leadScore.detectedSignals` contains both hot signals with evidence excerpts traceable to the transcript
- `contact.email` → `alice.smith@acmecorp.com`
- `contact.confidence` → `high`
- Email button generates a mailto URL with body containing narrative, topics, decisions, and action items

**Verify score arithmetic**: Open the review screen, sum the `pointValue` of each listed detected signal — must equal `leadScore.score`.

---

## Scenario 2 — WARM lead, no email in transcript

**Input transcript**:

```
Tom Green (KaffaX): Thanks for your time today. We'll cover our platform capabilities and your requirements.

Carol Nguyen (Prospect): We're evaluating three vendors. We want to go live sometime before year-end — nothing locked in yet.

Tom Green (KaffaX): Understood. What's your preferred integration approach?

Carol Nguyen (Prospect): We'd need a REST API integration. Still working through the internal approval process.

Tom Green (KaffaX): Let's schedule a technical deep-dive next month when your team is assembled.

Carol Nguyen (Prospect): That works. We'll get back to you once we know who from our side will join.
```

**Expected outcome**:
- `leadScore.band` → `warm` (timeline defined signal detected; no agreed next step since the next meeting is not confirmed)
- `leadScore.score` → 15 (only sig-timeline-defined at 15 points)
- `leadScore.detectedSignals` contains sig-timeline-defined with evidence about year-end timeline
- `contact.email` → undefined
- `contact.confidence` → `low`
- Review screen flags email field for manual entry

---

## Scenario 3 — COLD lead

**Input transcript**:

```
Mark Lee (KaffaX): Thank you for your time. We'd love to show you how our platform could help.

Sarah Park (Prospect): We appreciate the demo. Unfortunately, our budget has been frozen this quarter due to restructuring. No budget at all for new tools.

Mark Lee (KaffaX): Understood. Would you like us to follow up in Q1?

Sarah Park (Prospect): Possibly. We'll reach out when things open up internally.
```

**Expected outcome**:
- `leadScore.band` → `cold` (cold-weight signal detected, no qualifying signals)
- `leadScore.score` → 0 (sig-no-budget pointValue is 0; no warm or hot signals)
- `leadScore.rationale` explains COLD assignment and references the budget freeze signal
- `summary.narrative` references the COLD outcome

---

## Scenario 4 — Score capped at 100

**Setup**: Temporarily set `pointValue` to 60 on both `sig-budget-approved` and `sig-poc-agreed` (total would be 120).

**Input**: Same transcript as Scenario 1.

**Expected outcome**:
- `leadScore.score` → 100 (capped, not 120)
- Review screen shows score as 100/100

**Restore**: Reset pointValues to 40 and 35 after this check.

---

## Scenario 5 — Validation failure (simulated)

**How to trigger**: Temporarily break the `output_config.format.schema` by adding a required field that the prompt does not ask the AI to return (e.g., add `"requiredFakeField": { "type": "string" }` to the schema). This simulates a Zod validation mismatch.

**Expected outcome**:
- Transcript status → `failed`
- Review screen shows a clear error state — not blank, not partially rendered
- Server logs contain a structured error with the Zod validation details
- No malformed data written to the `transcripts` collection
- The raw AI response is NOT exposed to the client

**Restore**: Remove the temporary field from the schema.

---

## Scenario 6 — mailto URL verification

After completing Scenario 1:

1. Open the transcript review screen
2. Click the Email button
3. Verify Outlook (or default mail client) opens with:
   - `To:` field pre-filled with `alice.smith@acmecorp.com`
   - `Subject:` contains "Meeting Follow-Up: " and the meeting title
   - `Body:` contains the narrative paragraph, Topics Covered section, Decisions section, and Action Items section
   - Action item "Send data migration playbook" with owner "Jane Doe" and due "end of week" is present
4. Verify no email is sent automatically — the compose window is open but not submitted

---

## Scenario 7 — Rubric signal update reflects immediately

1. Add a new signal to MongoDB: `{ signalId: "sig-security-concern", label: "Security concern raised", weight: "warm", pointValue: 20, isActive: true, hints: ["security audit", "compliance required", "data privacy"] }`
2. Process Scenario 1 transcript again (new transcript record)
3. Verify the new signal appears in `leadScore.detectedSignals` if the transcript mentions security — or confirm it is absent if not mentioned
4. Confirm the score reflects the new signal's pointValue if detected

This validates FR-016 (fresh rubric fetch per run) and FR-005 (SC-005).

---

## Reference: Key Requirements → Scenarios

| Requirement | Validated by |
|---|---|
| FR-001 — Versioned prompt template | All scenarios (same prompt used every run) |
| FR-016 — Fresh rubric per run | Scenario 7 |
| FR-020 — Deterministic banding | Scenarios 1, 2, 3 |
| FR-021 — Score = sum of pointValues capped at 100 | Scenarios 1, 4 |
| FR-022 — Band and score are independent | Scenario 3 (score 0 but band determined by rules, not threshold) |
| FR-025 — AI band verified by app logic | Scenario 1 (HOT requires both hot signal AND agreed next step) |
| FR-026/FR-027 — Email extraction with confidence | Scenarios 1 (high), 2 (low) |
| FR-030 — mailto opens Outlook, no auto-send | Scenario 6 |
| FR-031–FR-033 — Strict Zod validation | Scenario 5 |
| FR-034 — Graceful failure state | Scenario 5 |
| SC-002 — Review screen within 60 seconds | All scenarios (check elapsed time) |
| SC-008 — Score arithmetic verifiable | Scenario 1, 4 |
