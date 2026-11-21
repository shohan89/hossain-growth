import { websitePages } from '../db/schema';
import { createWebsitePageSchema, updateWebsitePageSchema } from '../validation/pages';
import { createCrudResource, tableColumns } from '../http/crud';
import { PERMISSIONS } from '../auth/permissions';

export const websitePageResource = createCrudResource({
  resourceName: 'website_page',
  table: websitePages,
  idColumn: websitePages.id,
  columns: tableColumns(websitePages),
  searchableColumns: [websitePages.title, websitePages.slug],
  sortableColumns: ['title', 'slug', 'createdAt', 'updatedAt'],
  defaultSortColumn: 'updatedAt',
  createSchema: createWebsitePageSchema,
  updateSchema: updateWebsitePageSchema,
  filterParams: { isPublished: websitePages.isPublished },
  permissions: {
    read: PERMISSIONS.PAGES_READ,
    write: PERMISSIONS.PAGES_WRITE,
    delete: PERMISSIONS.PAGES_DELETE,
  },
});
