import { eq } from 'drizzle-orm';
import { portfolioProjectImages } from './db/schema';
import type { AppDb } from './db/client';

export async function syncPortfolioProjectImages(
  db: AppDb,
  portfolioProjectId: string,
  mediaAssetIds: string[],
): Promise<void> {
  await db
    .delete(portfolioProjectImages)
    .where(eq(portfolioProjectImages.portfolioProjectId, portfolioProjectId));
  if (mediaAssetIds.length === 0) return;

  await db.insert(portfolioProjectImages).values(
    mediaAssetIds.map((mediaAssetId, index) => ({
      id: crypto.randomUUID(),
      portfolioProjectId,
      mediaAssetId,
      orderIndex: index,
    })),
  );
}
