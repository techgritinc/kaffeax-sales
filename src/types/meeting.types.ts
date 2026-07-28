import type { Band } from './rubric.types';
import type { LeadScore } from './scoring.types';

/** Extraction confidence for a captured contact field. */
export type Confidence = 'high' | 'medium' | 'low';

/** Which side of the table an attendee or commitment belongs to. */
export type Side = 'kaffea_x' | 'prospect';

/** A single value carried alongside its extraction confidence. */
export interface ConfidentField<T = string> {
  value: T;
  confidence: Confidence;
}

/** The prospect contact, each field carried with a confidence level. */
export interface Contact {
  name: ConfidentField;
  company: ConfidentField;
  title: ConfidentField;
  email: ConfidentField;
}

export interface Attendee {
  name: string;
  side: Side;
}

export interface NextStep {
  description: string;
  owner: string;
  due_date: string;
}

export interface Commitment {
  side: Side;
  description: string;
}

/** The structured meeting summary produced by the extraction. */
export interface Summary {
  meeting_title: string;
  narrative: string;
  attendees: Attendee[];
  topics: string[];
  decisions: string[];
  open_questions: string[];
  next_steps: NextStep[];
  commitments: Commitment[];
}

export interface RecapEmail {
  subject: string;
  body: string;
}

/** The central record — a captured meeting, as a draft or a committed CRM record. */
export interface MeetingRecord {
  id: string;
  when: string;
  committed: boolean;
  band: Band;
  contact: Contact;
  summary: Summary;
  lead_score: LeadScore;
  recap_email: RecapEmail;
}

export interface TranscriptPresentation {
  when: string;
  recapSubject: string;
  contact: {
    name: ConfidentField;
    company: ConfidentField;
    title: ConfidentField;
    emailConfidence: Confidence;
  };
  summary: {
    openQuestions: string[];
    commitments: Commitment[];
  };
}
