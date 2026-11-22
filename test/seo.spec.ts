import { describe, expect, it } from 'vitest';
import { resolveSeo } from '../src/lib/seo';

const BASE = {
  origin: 'https://hossaingrowth.com',
  defaultTitle: 'Default Title',
  defaultDescription: 'Default description.',
  defaultPath: '/services/web-development',
};

describe('resolveSeo', () => {
  it('falls back to the page defaults when there is no override', () => {
    const seo = resolveSeo({ ...BASE, override: null });
    expect(seo).toEqual({
      title: 'Default Title',
      description: 'Default description.',
      canonicalUrl: 'https://hossaingrowth.com/services/web-development',
      ogImageUrl: undefined,
      noindex: false,
    });
  });

  it('lets an admin-set override win field by field', () => {
    const seo = resolveSeo({
      ...BASE,
      override: {
        metaTitle: 'Custom SEO Title',
        metaDescription: null,
        canonicalUrl: 'https://hossaingrowth.com/custom-canonical',
        ogImageId: 'media_123',
        noIndex: true,
      },
    });
    expect(seo.title).toBe('Custom SEO Title');
    expect(seo.description).toBe('Default description.'); // null override falls back
    expect(seo.canonicalUrl).toBe('https://hossaingrowth.com/custom-canonical');
    expect(seo.ogImageUrl).toBe('https://hossaingrowth.com/media/media_123');
    expect(seo.noindex).toBe(true);
  });

  it('falls back to a default image id when the override does not set one', () => {
    const seo = resolveSeo({
      ...BASE,
      defaultImageId: 'media_default',
      override: {
        metaTitle: null,
        metaDescription: null,
        canonicalUrl: null,
        ogImageId: null,
        noIndex: false,
      },
    });
    expect(seo.ogImageUrl).toBe('https://hossaingrowth.com/media/media_default');
  });

  it('prefers the override image over the default image', () => {
    const seo = resolveSeo({
      ...BASE,
      defaultImageId: 'media_default',
      override: {
        metaTitle: null,
        metaDescription: null,
        canonicalUrl: null,
        ogImageId: 'media_override',
        noIndex: false,
      },
    });
    expect(seo.ogImageUrl).toBe('https://hossaingrowth.com/media/media_override');
  });
});
