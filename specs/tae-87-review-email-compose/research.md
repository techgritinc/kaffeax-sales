# Research: Review Email Compose

**Feature**: [spec.md](spec.md) | **Date**: 2026-08-03 (v3 — revised for mailto plain-text approach)

## Problem Statement

The spec requires that clicking the Email button on the Review screen opens the desktop mail client with a pre-filled subject line and a structured body containing all review sections. Three hard constraints from clarification:

- **FR-012**: Single direct action — click Email → compose window opens. No toast notifications, no file downloads, no intermediate steps of any kind.
- **FR-003**: Body must be automatically pre-filled. No clipboard, no paste, no manual content transfer.
- **FR-004**: Section headings must be visually distinguished using plain-text conventions (uppercase headings, separator lines).

## Approaches Evaluated

### Approach A: mailto with Structured Plain Text (Chosen)

Use `mailto:` URL with `encodeURIComponent()` to pass a well-structured plain-text body.

**Pros:**
- Single-click: mail client opens immediately with content in the body — **satisfies FR-012**
- Subject and body both auto-filled — **satisfies FR-003**
- Zero new APIs, browser permissions, or dependencies
- No file downloads, no toast notifications, no intermediate steps
- Works with any mail client (Outlook, Thunderbird, Apple Mail, web clients)
- Entirely client-side, no server infrastructure

**Cons:**
- Cannot deliver bold, italic, or HTML styling — mitigated by using UPPERCASE headings, bullet characters, and numbered lists for clear visual hierarchy — **satisfies FR-004** (clarification confirmed plain text is acceptable)
- URL length limit (~2,000 characters for fully-encoded URL) may truncate very long meeting content — mitigated by progressive truncation strategy

**Verdict:** Chosen approach. User explicitly confirmed that direct single-click flow with structured plain text is the priority over rich HTML formatting.

### Approach B: Clipboard HTML + mailto (Rejected)

Copy rich HTML to clipboard, open `mailto:` with subject only, instruct user to paste.

**Verdict:** Fails FR-012. User explicitly rejected: "it should auto fill the subject line along with the body of the email, no manual copy of the data into the body of the email."

### Approach C: EML File Generation (Rejected)

Generate a `.eml` file (RFC 2822 MIME) with HTML body and `X-Unsent: 1` header. Trigger download via Blob URL.

**Verdict:** Fails FR-012. User explicitly rejected: "no toast is required, no download is required of the .eml file, as soon as the user clicks on the 'Email' button, it should directly open the outlook with the pre-filled content, just a straight forward flow, no toast nothing."

### Approach D: Microsoft Graph API (Rejected)

Create a draft email via Microsoft Graph API server-side.

**Verdict:** Disproportionate infrastructure. Requires Microsoft OAuth, Graph API permissions, server-side routes. Eliminated.

## Decision

**Approach A: mailto with Structured Plain Text** is the chosen approach.

### Rationale

1. It is the **only** approach that satisfies FR-012 (single direct action, no intermediate steps) while also auto-filling the body (FR-003).
2. The user explicitly confirmed that structured plain text (uppercase headings, bullet characters, numbered lists) is acceptable over HTML formatting — making the rich formatting limitation a non-issue.
3. The implementation is minimal: a pure function builds a plain-text string, `encodeURIComponent()` encodes it, and `window.location.href` opens the mail client. No Blob, no MIME, no Clipboard API.
4. The existing `mailto-url.md` contract from `tae-73-transcript-ai-analysis` provides a proven reference pattern for body format, section omission, and truncation rules.

### Tradeoff Accepted

Plain-text body (no bold/italic/colors) in exchange for a zero-intermediate-step flow. The user made this choice explicitly when presented with the tradeoff.

## Technical Details

### mailto URL Format

```
mailto:?subject={encodedSubject}&body={encodedBody}
```

- No `to` parameter — recipient fields are empty per FR-006
- `subject`: `encodeURIComponent("Meeting Follow-Up: " + meetingTitle)`
- `body`: `encodeURIComponent(structuredPlainTextBody)`

### Content Generation Strategy

The email body is generated at button-click time from the `MeetingRecord` object already available as the `draft` prop in ReviewScreen. No server round-trip, no stored `recapEmail` field. A pure utility function: `MeetingRecord` in, `{ subject, body }` out.

### Length Constraint

`mailto:` URLs are subject to browser and mail-client length limits. A practical safe limit is **2,000 characters** for the fully-encoded URL. The formatter applies progressive truncation (action items → topics/decisions → narrative) when the URL exceeds this limit. See `contracts/email-body-template.md` for the truncation algorithm.

### Existing Code Reference

The `tae-73-transcript-ai-analysis` feature has an existing `mailto-url.md` contract at `specs/tae-73-transcript-ai-analysis/contracts/mailto-url.md` that documents a similar pattern. The new implementation extends this with additional sections (signals, commitments) and the updated body format.

## Open Questions (Resolved)

| Question | Resolution |
|----------|------------|
| Should the `recapEmail` DB field be updated? | No. Generate content on-the-fly from MeetingRecord. |
| Should the recipient be pre-filled? | No. Per FR-006, all recipient fields are empty. |
| What about the 2,000-char mailto URL limit? | Progressive truncation strategy applied. |
| Include lead score/band in email? | No. Per FR-013, internal metrics excluded. |
| Is plain text acceptable instead of HTML? | Yes. User explicitly chose plain text for direct-open flow. |
| Is a toast notification needed? | No. User explicitly rejected any intermediate steps. |

## Amendment (2026-08-03): Truncation Removed

The original v3 research above proposed a progressive truncation strategy (cap list sections at 5 items with a `[... and N more]` note) to keep the `mailto:` URL under ~2,000 characters. Once implemented, this was found to directly contradict `spec.md`'s Edge Cases ("content should still be included in full") and SC-002 ("zero data loss"). A user testing the feature hit this exact contradiction: a 10-item "What Was Covered" list showed only 5 real topics plus a synthetic truncation-note line.

**Resolution**: Truncation has been removed entirely (FR-014 added to spec.md). The email body always includes every populated section in full, regardless of the resulting `mailto:` URL length. This is an explicit, accepted tradeoff — zero data loss outranks URL-length convenience. See `contracts/email-body-template.md` v4 for the corrected contract.
