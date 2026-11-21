import { navigationItems } from '../db/schema';
import { createNavigationItemSchema, updateNavigationItemSchema } from '../validation/pages';
import { createCrudResource, tableColumns } from '../http/crud';
import { PERMISSIONS } from '../auth/permissions';

export const navigationItemResource = createCrudResource({
  resourceName: 'navigation_item',
  table: navigationItems,
  idColumn: navigationItems.id,
  columns: tableColumns(navigationItems),
  sortableColumns: ['orderIndex', 'label', 'location'],
  defaultSortColumn: 'orderIndex',
  createSchema: createNavigationItemSchema,
  updateSchema: updateNavigationItemSchema,
  filterParams: { location: navigationItems.location, parentId: navigationItems.parentId },
  // Navigation has no dedicated read permission — it's a low-traffic admin
  // config resource, gated entirely behind the same write permission.
  permissions: {
    read: PERMISSIONS.NAVIGATION_WRITE,
    write: PERMISSIONS.NAVIGATION_WRITE,
    delete: PERMISSIONS.NAVIGATION_WRITE,
  },
});
