import { eq } from 'drizzle-orm';
import { blogPostTags } from './db/schema';
import type { AppDb } from './db/client';

export async function syncBlogPostTags(
  db: AppDb,
  blogPostId: string,
  tagIds: string[],
): Promise<void> {
  await db.delete(blogPostTags).where(eq(blogPostTags.blogPostId, blogPostId));
  if (tagIds.length === 0) return;

  await db.insert(blogPostTags).values(tagIds.map((tagId) => ({ blogPostId, tagId })));
}
