# Contract: Outlook mailto URL

**Feature**: [Transcript AI Analysis & Scoring](../spec.md) | **Date**: 2026-07-24

Defines the `mailto:` URL format assembled by `email-formatter.ts` when the rep clicks the Email button. No email is sent by the system — the URL opens Outlook (or the default mail client) with a pre-filled compose window.

---

## URL Format

```
mailto:{to}?subject={subject}&body={body}
```

All three components are optional in the `mailto:` RFC, but the application populates `subject` and `body` always. `to` is populated only when the prospect's email was extracted with `confidence !== 'low'`.

| Parameter | Source | Encoding |
|---|---|---|
| `to` | `transcript.contact.email` (if confidence is `high` or `medium`) | Raw — email address |
| `subject` | `"Meeting Follow-Up: " + transcript.title` | `encodeURIComponent()` |
| `body` | Assembled body string (see Body Format below) | `encodeURIComponent()` |

### Example

```
mailto:jane.doe@prospect.com?subject=Meeting%20Follow-Up%3A%20HOT%3A%20Platform%20Demo&body=Hi%20Jane%2C%0A%0A...
```

---

## Body Format

The body string (before URL encoding) follows this template:

```
Hi [prospect first name or "there" if unknown],

[narrative paragraph from summary.narrative]

---

Topics Covered:
• [whatWasCovered[0]]
• [whatWasCovered[1]]
...

Decisions:
• [whatWasDecided[0]]
• [whatWasDecided[1]]
...

Action Items:
1. [actionItems[0].description] — [actionItems[0].owner] (due: [actionItems[0].dueDate || "TBD"])
2. [actionItems[1].description] — [actionItems[1].owner] (due: [actionItems[1].dueDate || "TBD"])
...

Looking forward to our next steps.

Best regards,
[KaffaX rep name — from attendees where side === 'kaffeax']
```

### Greeting logic

- If `contact.email` is present and an attendee name is associated with the prospect side: use their first name
- Otherwise: use "there"

### Section omission rules

- If `whatWasCovered` is empty: omit the "Topics Covered" section entirely
- If `whatWasDecided` is empty: omit the "Decisions" section entirely
- If `actionItems` is empty: omit the "Action Items" section entirely
- Each section separator (`---`) appears only between populated sections

### `dueDate` display

- If `dueDate` is present: display as-is (it's the literal string from the transcript)
- If `dueDate` is absent: display `"TBD"`

---

## Length Constraint

`mailto:` body URLs are subject to browser and mail-client length limits. A practical safe limit is **2,000 characters** for the fully-encoded URL (including scheme, recipient, subject, and body).

### Handling oversized bodies

`email-formatter.ts` calculates the encoded URL length before returning. If the full URL exceeds 2,000 characters:

1. Truncate `actionItems` to the first 5 items, appending `\n[... and N more action items]`
2. Re-check length; if still over 2,000, truncate `whatWasCovered` and `whatWasDecided` to the first 5 items each with the same `[... and N more]` suffix
3. Re-check length; if still over 2,000, truncate the `narrative` to 500 characters with `"..."` suffix
4. Never omit the narrative entirely — it is the minimum viable body content

This truncation is best-effort. The rep can edit the email body in Outlook before sending.

---

## Security Note

The `mailto:` URL is constructed from transcript data that has already been validated and stored. No raw AI output is concatenated directly into the URL — all content comes from the validated `TranscriptSummary` and `TranscriptLeadScore` records. `encodeURIComponent()` prevents header injection.
