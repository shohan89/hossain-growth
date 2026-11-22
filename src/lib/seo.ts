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

export interface SeoOverrideRow {
  metaTitle: string | null;
  metaDescription: string | null;
  canonicalUrl: string | null;
  ogImageId: string | null;
  noIndex: boolean;
}

export interface ResolvedSeo {
  title: string;
  description?: string;
  canonicalUrl: string;
  ogImageUrl?: string;
  noindex: boolean;
}

/**
 * Merges an admin-set SEO override (from the dashboard's SEO Manager, on
 * top of the `seo_metadata` table) with this page's own computed
 * defaults. The override always wins field-by-field when present, but
 * never leaves a field blank — a page always has a sensible title,
 * description, and canonical URL even if nobody ever opened the SEO
 * Manager for it.
 */
export function resolveSeo(input: {
  origin: string;
  defaultTitle: string;
  defaultDescription?: string;
  defaultPath: string;
  /** Falls back to this media asset id for the OG/Twitter image when the override doesn't set one. */
  defaultImageId?: string | null;
  override?: SeoOverrideRow | null;
}): ResolvedSeo {
  const imageId = input.override?.ogImageId ?? input.defaultImageId ?? null;
  return {
    title: input.override?.metaTitle || input.defaultTitle,
    description: input.override?.metaDescription || input.defaultDescription,
    canonicalUrl:
      input.override?.canonicalUrl || new URL(input.defaultPath, input.origin).toString(),
    ogImageUrl: imageId ? new URL(`/media/${imageId}`, input.origin).toString() : undefined,
    noindex: input.override?.noIndex ?? false,
  };
}

export function professionalServiceSchema(input: { origin: string; description?: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    name: SITE_NAME,
    url: input.origin,
    description: input.description ?? DEFAULT_DESCRIPTION,
    priceRange: '$$',
    areaServed: { '@type': 'Place', name: 'Worldwide' },
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
