/**
 * Mock canned-response engine — verbatim keyword map from the prototype
 * ChatPanel (lines 2653–2661). Pure function, no client directive needed.
 */
export function cannedResponse(question: string): string {
  const lc = question.toLowerCase();
  if (lc.includes('pric'))
    return "They said they have no visibility on wholesale pricing — cold-emailing cafes without benchmarks means they're either too expensive or leaving money on the table. That's a wholesale-gap Kaffea-X closes directly with the marketplace pricing view.";
  if (lc.includes('next') || lc.includes('step') || lc.includes('follow'))
    return "Two commitments landed on the call: Mohan will send the onboarding walkthrough with sample listings, and the follow-up is a 30-min call Thursday next week. The calendar invite is Mohan's action to send.";
  if (lc.includes('competitor') || lc.includes('compet'))
    return "No competing platforms named on the call. Their current 'channel' is farmers markets and a trickle of online orders — the pain is the absence of a channel, not competition between channels.";
  if (lc.includes('budget') || lc.includes('spend'))
    return "Budget was mentioned but not sized — 'set aside some budget, nothing huge, but we're serious.' That's a WARM signal in the rubric, not HOT. Worth confirming a number before the Thursday call.";
  if (lc.includes('timeline') || lc.includes('when'))
    return "They want something in place before the fall buying season — 'realistically the next six to eight weeks.' Concrete enough to score as a warm timeline signal.";
  return 'Let me check the transcript… based on what was said, the strongest signals are distribution pain, price-transparency pain, and a listing/marketplace need. Anything specific you want me to pull evidence for?';
}
