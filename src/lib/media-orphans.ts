import { and, isNotNull, notInArray, lt } from 'drizzle-orm';
import type { AppDb } from './db/client';
import {
  mediaAssets,
  portfolioProjects,
  portfolioProjectImages,
  caseStudies,
  blogPosts,
  testimonials,
  seoMetadata,
} from './db/schema';

/**
 * A media asset is "orphaned" if no content record points at it through
 * any of its featured-image/avatar/gallery/OG-image columns. Uploads
 * younger than `minAgeMs` are excluded even if currently unreferenced —
 * an admin may have just uploaded a file in the media picker a moment
 * before attaching it to the record they're editing.
 */
const DEFAULT_MIN_AGE_MS = 60 * 60 * 1000; // 1 hour

export async function findOrphanedMediaIds(
  db: AppDb,
  minAgeMs = DEFAULT_MIN_AGE_MS,
): Promise<string[]> {
  const [featuredPortfolio, galleryImages, featuredCaseStudy, featuredBlog, avatars, ogImages] =
    await Promise.all([
      db
        .select({ id: portfolioProjects.featuredImageId })
        .from(portfolioProjects)
        .where(isNotNull(portfolioProjects.featuredImageId)),
      db.select({ id: portfolioProjectImages.mediaAssetId }).from(portfolioProjectImages),
      db
        .select({ id: caseStudies.featuredImageId })
        .from(caseStudies)
        .where(isNotNull(caseStudies.featuredImageId)),
      db
        .select({ id: blogPosts.featuredImageId })
        .from(blogPosts)
        .where(isNotNull(blogPosts.featuredImageId)),
      db
        .select({ id: testimonials.avatarMediaId })
        .from(testimonials)
        .where(isNotNull(testimonials.avatarMediaId)),
      db
        .select({ id: seoMetadata.ogImageId })
        .from(seoMetadata)
        .where(isNotNull(seoMetadata.ogImageId)),
    ]);

  const referenced = new Set<string>();
  for (const rows of [
    featuredPortfolio,
    galleryImages,
    featuredCaseStudy,
    featuredBlog,
    avatars,
    ogImages,
  ]) {
    for (const row of rows) {
      if (row.id) referenced.add(row.id);
    }
  }

  const cutoff = new Date(Date.now() - minAgeMs);
  const clauses = [lt(mediaAssets.createdAt, cutoff)];
  if (referenced.size > 0) clauses.push(notInArray(mediaAssets.id, [...referenced]));

  const candidates = await db
    .select({ id: mediaAssets.id })
    .from(mediaAssets)
    .where(clauses.length > 1 ? and(...clauses) : clauses[0]);

  return candidates.map((row) => row.id);
}
