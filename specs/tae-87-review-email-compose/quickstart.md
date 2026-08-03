# Quickstart: Review Email Compose

**Feature**: [spec.md](spec.md) | **Date**: 2026-08-03 (v4 — no truncation, no heading separators, decisions numbered)

## Prerequisites

- Node.js and npm installed
- Project dependencies installed (`npm install`)
- Development server running (`npm run dev`)
- Desktop email client (Outlook or default mail handler) installed

## Validation Scenarios

### Scenario 1: Full Email Compose (Happy Path)

1. Open the app at `http://localhost:3000`
2. Navigate to a meeting that has a completed AI analysis (all sections populated)
3. Verify the Review screen displays: Summary, What We Heard, What Was Covered, What Was Decided, Action Items
4. Click the **"Email"** button in the top-right action cluster

**Expected result:**
- The desktop mail client opens directly with a new compose window (no intermediate steps — no toast, no download, no popup)
- The subject line reads: `Meeting Follow-Up: {meeting title}`
- The email body contains structured plain text with:
  - Greeting: `Hi,`
  - Narrative paragraph
  - `WHAT WE HEARD` heading (no separator line) with signals grouped under `Hot:`, `Warm:`, `Cold:` sub-labels
  - `WHAT WAS COVERED` heading with numbered topics
  - `WHAT WAS DECIDED` heading with numbered decisions
  - `ACTION ITEMS` heading with numbered items showing owner and due date
  - Sign-off with KaffaX rep name
- All recipient fields (To, CC, BCC) are empty
- Content matches the data displayed on the Review screen
- Lead score and band are NOT present in the email body

### Scenario 2: Partial Data (Empty Sections)

1. Navigate to a meeting where some sections are empty (e.g., no decisions, no action items)
2. Click the **"Email"** button

**Expected result:**
- Mail client opens directly with compose window
- Only populated sections appear in the body — no orphaned headings, no empty sections
- Sections with no data are completely absent from the email

### Scenario 3: Special Characters

1. Navigate to a meeting where the title or content contains special characters (`&`, `<`, `>`, quotes, non-ASCII characters)
2. Click the **"Email"** button

**Expected result:**
- Subject line displays special characters correctly in the compose window
- Body content renders special characters correctly (no URL encoding artifacts visible)
- No broken formatting

### Scenario 4: Long Content (No Truncation)

1. Navigate to a meeting with extensive content (e.g., 10+ topics, many decisions, many action items)
2. Click the **"Email"** button

**Expected result:**
- Mail client opens with compose window
- Every populated section appears in full — all topics, all decisions, all action items are present with no `[... and N more]` notes and no items cut off
- This holds true regardless of how long the resulting mailto URL becomes (zero data loss per FR-014/SC-002)

## Validation Checklist

- [ ] Email button click directly opens mail client compose window (no intermediate steps)
- [ ] No toast notification appears
- [ ] No file download occurs
- [ ] Subject line format: `Meeting Follow-Up: {title}`
- [ ] All recipient fields are empty
- [ ] Body has UPPERCASE section headings with no separator line beneath them
- [ ] Signals grouped under Hot/Warm/Cold labels (bulleted)
- [ ] Topics rendered as numbered list
- [ ] Decisions rendered as numbered list
- [ ] Action items show owner and due date
- [ ] Empty sections are omitted (no orphaned headings)
- [ ] Sign-off includes KaffaX rep name
- [ ] Lead score and band are NOT in the email body
- [ ] Special characters render correctly in subject and body
- [ ] Long content (10+ topics/decisions/action items) is included in full — no truncation notes, no missing items

## Type Checking

```bash
npm run type-check
```

Verify zero type errors after implementation.

## Lint & Format

```bash
npm run lint
```

Verify zero warnings (CI runs `--max-warnings=0`).
