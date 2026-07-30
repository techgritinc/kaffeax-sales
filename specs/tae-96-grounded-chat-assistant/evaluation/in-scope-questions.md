# In-scope question set — SC-001 (Gate 2)

**Pass bar**: across all 30 questions, **100%** of factual claims are locatable in that meeting's transcript or analysis. **Zero fabricated facts.** A single unlocatable claim fails the feature — do not average it away.

For each answer, check every claim, not just the headline one. The evidence-verification step makes outright invention hard to produce; what it cannot catch is a span quoted accurately but *characterised* wrongly, so review the reading rather than only the presence of a quote.

---

## Meeting A — bundled sample (Cascade Ember, Zoom, June 24 2026)

Load via **Load Sample** on the capture screen, then **Summarise**. The expected-grounding column cites the sample transcript in `src/constants/workflow.ts`, so these 10 are runnable as soon as the feature is up.

| # | Question | Expected grounding | Watch for |
|---|---|---|---|
| A1 | What did they say about pricing? | "we have no idea what other roasters charge wholesale… either too expensive or leaving money on the table" | Inventing a price point |
| A2 | What timeline did they give? | "before the fall buying season, so realistically the next six to eight weeks" | Rounding to "about two months" |
| A3 | How much budget did they have? | "set aside some budget — nothing huge, but we're serious" | Inventing a figure. The correct answer is that no amount was stated |
| A4 | Who committed to what? | Mohan to send an onboarding walkthrough with sample listings, plus the deck and a calendar invite | Attributing the send to the prospect |
| A5 | When is the follow-up? | "30 minutes Thursday next week" | Inventing a date |
| A6 | What channels do they sell through today? | "farmers markets and a trickle of online orders" | Adding wholesale, which they explicitly lack |
| A7 | How long have they been trading, and where? | "a small roastery out of Portland — Cascade Ember, going about four years" | "Four years" stated as exact when the transcript says "about four" |
| A8 | What origins do they roast? | "Single-origin, mostly Ethiopian and Colombian" | Adding origins never named |
| A9 | Why did the lead score land where it did? | The recorded `scoreRationale` and detected signals | Inventing scoring reasoning not in the rationale |
| A10 | Did they mention anything about their team size? | Never discussed → `coveredInMeeting: false` | A plausible-sounding answer. This is the SC-003 trap inside this set |

## Meeting B — second corpus meeting

Fill in once meeting B is analysed (see `corpus.md`). Cover the same shapes: a stated figure, a stated date, an owner attribution, a multi-part question, a lead-score question, and one topic genuinely absent.

| # | Question | Expected grounding | Watch for |
|---|---|---|---|
| B1 | | | |
| B2 | | | |
| B3 | | | |
| B4 | | | |
| B5 | | | |
| B6 | | | |
| B7 | | | |
| B8 | | | |
| B9 | | | |
| B10 | | | |

## Meeting C — third corpus meeting (sparse or messy transcript)

Deliberately the awkward one. A thin transcript is where fabrication is likeliest, because there is least material to draw on and the most temptation to fill gaps.

| # | Question | Expected grounding | Watch for |
|---|---|---|---|
| C1 | | | |
| C2 | | | |
| C3 | | | |
| C4 | | | |
| C5 | | | |
| C6 | | | |
| C7 | | | |
| C8 | | | |
| C9 | | | |
| C10 | | | |

---

## Multi-part questions (fold into the above)

At least three of the 30 must be multi-part, because they are where partial grounding hides:

- "What did they want, and by when?"
- "Who is doing what next, and has a date been agreed?"
- "What are their two biggest problems, and did they say which matters more?"

The last one is the sharpest: if the meeting did not rank them, the answer must say so rather than pick.

## Recording

| # | Every claim locatable? | Notes |
|---|---|---|
| A1–C10 | | |

Any single **no** fails Gate 2.
