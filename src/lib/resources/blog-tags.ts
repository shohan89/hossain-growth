import { blogTags } from '../db/schema';
import { createBlogTagSchema, updateBlogTagSchema } from '../validation/content';
import { createCrudResource, tableColumns } from '../http/crud';
import { PERMISSIONS } from '../auth/permissions';

export const blogTagResource = createCrudResource({
  resourceName: 'blog_tag',
  table: blogTags,
  idColumn: blogTags.id,
  columns: tableColumns(blogTags),
  searchableColumns: [blogTags.name, blogTags.slug],
  sortableColumns: ['name', 'slug'],
  defaultSortColumn: 'name',
  createSchema: createBlogTagSchema,
  updateSchema: updateBlogTagSchema,
  permissions: {
    read: PERMISSIONS.BLOG_READ,
    write: PERMISSIONS.BLOG_WRITE,
    delete: PERMISSIONS.BLOG_DELETE,
  },
});
