export const LEAD_STATUSES = [
  'new',
  'contacted',
  'qualified',
  'proposal_sent',
  'won',
  'lost',
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];
