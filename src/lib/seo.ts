export const SITE_NAME = 'Hossain Growth';
export const DEFAULT_DESCRIPTION =
  'Hossain Growth is your business growth partner — strategic digital marketing and technology that helps ambitious businesses build, grow, and scale.';

export interface SeoProps {
  title: string;
  description?: string;
  canonicalUrl: string;
  ogImageUrl?: string;
  noindex?: boolean;
}

export function organizationSchema(origin: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: origin,
    description: DEFAULT_DESCRIPTION,
    sameAs: [],
  };
}

export function articleSchema(input: {
  headline: string;
  description?: string;
  url: string;
  imageUrl?: string;
  datePublished?: string;
  dateModified?: string;
  authorName?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: input.headline,
    description: input.description,
    url: input.url,
    image: input.imageUrl ? [input.imageUrl] : undefined,
    datePublished: input.datePublished,
    dateModified: input.dateModified ?? input.datePublished,
    author: input.authorName ? { '@type': 'Person', name: input.authorName } : undefined,
    publisher: { '@type': 'Organization', name: SITE_NAME },
  };
}

export function serviceSchema(input: { name: string; description?: string; url: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    serviceType: input.name,
    name: input.name,
    description: input.description,
    url: input.url,
    provider: { '@type': 'Organization', name: SITE_NAME },
  };
}
