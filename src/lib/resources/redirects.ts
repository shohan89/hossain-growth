import { env } from 'cloudflare:workers';
import { redirects } from '../db/schema';
import { createRedirectSchema, updateRedirectSchema } from '../validation/settings';
import { createCrudResource, tableColumns } from '../http/crud';
import { PERMISSIONS } from '../auth/permissions';
import { REDIRECTS_CACHE_KEY } from '../redirect-cache';

export const redirectResource = createCrudResource({
  resourceName: 'redirect',
  table: redirects,
  idColumn: redirects.id,
  columns: tableColumns(redirects),
  searchableColumns: [redirects.fromPath, redirects.toPath],
  sortableColumns: ['fromPath', 'createdAt'],
  defaultSortColumn: 'createdAt',
  createSchema: createRedirectSchema,
  updateSchema: updateRedirectSchema,
  permissions: {
    read: PERMISSIONS.REDIRECTS_WRITE,
    write: PERMISSIONS.REDIRECTS_WRITE,
    delete: PERMISSIONS.REDIRECTS_WRITE,
  },
  // Make a create/edit/delete take effect immediately rather than
  // waiting out the cache TTL middleware uses for the redirect lookup.
  onMutate: () => env.CACHE.delete(REDIRECTS_CACHE_KEY),
});
