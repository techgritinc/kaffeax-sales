import type { Contact, Summary } from '@/types/meeting.types';

export const CURATED: { contact: Contact; summary: Summary } = {
  contact: {
    name: { value: '', confidence: 'low' },
    company: { value: 'Cascade Ember', confidence: 'high' },
    title: { value: 'Owner / Founder', confidence: 'medium' },
    email: { value: '', confidence: 'low' },
  },
  summary: {
    meeting_title: 'Discovery call — Cascade Ember distribution',
    narrative:
      "Cascade Ember, a small Portland roastery, walked the team through the shape of their business and where growth is stuck. The founder was direct: the coffee sells fine at farmers markets, but there is no wholesale channel, no visibility into what other roasters charge, and no way to get lots in front of buyers systematically. Kaffea-X's marketplace matched what they were describing almost line for line, budget is set aside for the next six to eight weeks, and a walkthrough is booked for Thursday.",
    attendees: [
      { name: 'Mohan', side: 'kaffea_x' },
      { name: 'Prospect (Cascade Ember)', side: 'prospect' },
    ],
    topics: [
      'Small Portland roastery — single-origin Ethiopian & Colombian',
      'No distribution channel beyond farmers markets and online',
      'No visibility on wholesale pricing',
      'Wants a marketplace to list lots and reach buyers',
    ],
    decisions: [
      'Kaffea-X to share an onboarding walkthrough with sample listings',
      'Follow-up meeting set for Thursday next week',
    ],
    open_questions: ['Prospect contact name and email not captured on the call'],
    next_steps: [
      {
        description:
          "Send the onboarding walkthrough deck plus three sample listings that reflect Cascade Ember's product mix, so they can see how their catalog would appear to wholesale buyers on the platform",
        owner: 'Mohan',
        due_date: 'by Monday',
      },
      {
        description:
          'Schedule a 30-minute follow-up call to review the sample listings together and answer any pricing-visibility questions before they commit to a pilot',
        owner: 'Mohan',
        due_date: 'Thursday next week',
      },
    ],
    commitments: [
      {
        side: 'kaffea_x',
        description:
          'Email the pricing benchmarks deck along with a calendar invite offering two time windows in their timezone for the Thursday follow-up',
      },
      {
        side: 'prospect',
        description:
          'Attend the Thursday follow-up after reviewing the walkthrough materials, and share any concerns about wholesale volume commitments ahead of the call',
      },
    ],
  },
};
