import { blogCategories } from '../db/schema';
import { createBlogCategorySchema, updateBlogCategorySchema } from '../validation/content';
import { createCrudResource, tableColumns } from '../http/crud';
import { PERMISSIONS } from '../auth/permissions';

export const blogCategoryResource = createCrudResource({
  resourceName: 'blog_category',
  table: blogCategories,
  idColumn: blogCategories.id,
  columns: tableColumns(blogCategories),
  searchableColumns: [blogCategories.name, blogCategories.slug],
  sortableColumns: ['name', 'slug'],
  defaultSortColumn: 'name',
  createSchema: createBlogCategorySchema,
  updateSchema: updateBlogCategorySchema,
  permissions: {
    read: PERMISSIONS.BLOG_READ,
    write: PERMISSIONS.BLOG_WRITE,
    delete: PERMISSIONS.BLOG_DELETE,
  },
});
