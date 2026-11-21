export interface Industry {
  slug: string;
  name: string;
  description: string;
}

export const INDUSTRIES: Industry[] = [
  {
    slug: 'ecommerce-retail',
    name: 'E-commerce & Retail',
    description:
      'Full-funnel acquisition and conversion strategy for online stores competing on margin, speed, and customer experience.',
  },
  {
    slug: 'saas-technology',
    name: 'SaaS & Technology',
    description:
      'Demand generation and lifecycle marketing built for recurring revenue — from trial sign-up to expansion.',
  },
  {
    slug: 'healthcare-wellness',
    name: 'Healthcare & Wellness',
    description:
      'Compliant, trust-first marketing that helps patients and clients find and choose your practice with confidence.',
  },
  {
    slug: 'real-estate-property',
    name: 'Real Estate & Property',
    description:
      'Lead generation and brand presence for agencies, developers, and property managers in competitive local markets.',
  },
  {
    slug: 'professional-financial-services',
    name: 'Professional & Financial Services',
    description:
      'Authority-driven content and paid strategy for firms where trust and expertise decide the sale.',
  },
  {
    slug: 'hospitality-travel',
    name: 'Hospitality & Travel',
    description:
      'Seasonal campaign planning and booking-focused websites that turn browsers into guests.',
  },
  {
    slug: 'education-elearning',
    name: 'Education & E-learning',
    description:
      'Enrollment funnels and content strategy that make programs easy to discover, compare, and commit to.',
  },
  {
    slug: 'manufacturing-logistics',
    name: 'Manufacturing & Logistics',
    description:
      'B2B pipeline and positioning for long sales cycles, technical buyers, and distributor networks.',
  },
];
