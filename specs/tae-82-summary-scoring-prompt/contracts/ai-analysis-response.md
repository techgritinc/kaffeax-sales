# Contract: AI Analysis Response

**Feature**: tae-82-summary-scoring-prompt | **Date**: 2026-07-27

## Overview

This contract defines the structured JSON response the AI model must return when given a transcript and rubric signals. It is the interface between the AI processing step and the application's data layer.

Per §XVIII of the constitution, all fields use camelCase — no snake_case mapping is needed.

## Response Schema

The AI model returns a single JSON object with the following shape:

```json
{
  "narrative": "string — prose overview of the meeting in 2-4 paragraphs",
  "whatWeHeard": [
    "string — prospect pain point, need, or sentiment expressed"
  ],
  "whatWasCovered": [
    "string — topic discussed during the meeting"
  ],
  "whatWasDecided": [
    "string — decision made or agreement reached"
  ],
  "actionItems": [
    {
      "description": "string — what needs to happen",
      "owner": "string — person responsible",
      "dueDate": "string | null — optional deadline"
    }
  ],
  "attendees": [
    {
      "name": "string — person's name",
      "side": "kaffeax | prospect"
    }
  ],
  "detectedSignals": [
    {
      "id": "string — must match a signal ID from the input rubric",
      "label": "string — the signal's label text",
      "evidence": "string — quote or paraphrase from the transcript"
    }
  ],
  "leadScoreBand": "hot | warm | cold",
  "scoreRationale": "string — explanation citing detected signals"
}
```

## Field Constraints

| Field | Required | Default if Absent | Constraint |
|-------|----------|-------------------|------------|
| narrative | Yes | — | Non-empty string, 2-4 paragraphs |
| whatWeHeard | Yes | `[]` | Array of strings |
| whatWasCovered | Yes | `[]` | Array of strings |
| whatWasDecided | Yes | `[]` | Array of strings |
| actionItems | Yes | `[]` | Array of objects |
| actionItems[].description | Yes | — | Non-empty string |
| actionItems[].owner | Yes | — | Non-empty string |
| actionItems[].dueDate | No | `null` | String or null |
| attendees | Yes | `[]` | Array of objects |
| attendees[].name | Yes | — | Non-empty string |
| attendees[].side | Yes | — | One of: "kaffeax", "prospect" |
| detectedSignals | Yes | `[]` | Array of objects |
| detectedSignals[].id | Yes | — | Must match an ID from the input rubric signals |
| detectedSignals[].label | Yes | — | Signal label text |
| detectedSignals[].evidence | Yes | — | Transcript excerpt or close paraphrase |
| leadScoreBand | Yes | — | One of: "hot", "warm", "cold" |
| scoreRationale | Yes | — | Non-empty string |

## Direct Mapping to Application Types

The AI response uses camelCase field names that map directly to the application's TypeScript types — no transformation layer needed:

| AI Field | Application Type | Application Field |
|----------|-----------------|-------------------|
| narrative | TranscriptSummary | narrative |
| whatWeHeard | TranscriptSummary | whatWeHeard |
| whatWasCovered | TranscriptSummary | whatWasCovered |
| whatWasDecided | TranscriptSummary | whatWasDecided |
| actionItems | TranscriptSummary | actionItems |
| actionItems[].dueDate | ActionItem | dueDate |
| attendees | TranscriptSummary | attendees |
| detectedSignals | TranscriptLeadScore | detectedSignals |
| leadScoreBand | TranscriptLeadScore | band (advisory — recomputed by code) |
| scoreRationale | TranscriptLeadScore | rationale |

## Input Contract

The AI receives two inputs:

### System Prompt

Contains:
1. Role and behavioral instructions
2. Output format specification (this schema)
3. Scoring rules and signal matching instructions
4. The simplified rubric signals as a JSON array

### User Message

Contains:
1. The meeting transcript as plain text

### Simplified Signal Input Format

```json
[
  {
    "id": "hot-distribution-challenge",
    "label": "Prospect expressed challenges distributing or building a pipeline of leads to market to",
    "tier": "hot"
  },
  {
    "id": "hot-listing-frustration",
    "label": "Frustration listing their coffee due to lack of a proper channel",
    "tier": "hot",
    "hints": ["listing", "channel", "frustration"]
  }
]
```

Note: The `hints` field is only included when the signal has a non-empty hints array.

## Error Cases

| Scenario | Behavior |
|----------|----------|
| AI returns non-JSON text | Strip markdown fences, retry parse. If still invalid, return structured error |
| AI returns valid JSON that fails Zod validation | Return structured error with validation details (logged, not exposed to user) |
| AI hallucinates a signal ID not in input | Zod validation strips it via refinement; logged as a warning |
| AI omits optional arrays | Zod defaults them to `[]` |
| AI returns empty narrative | Zod validation fails — narrative is required non-empty |
