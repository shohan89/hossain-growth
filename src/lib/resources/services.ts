import { services } from '../db/schema';
import { createServiceSchema, updateServiceSchema } from '../validation/content';
import { createCrudResource, tableColumns } from '../http/crud';
import { PERMISSIONS } from '../auth/permissions';

export const serviceResource = createCrudResource({
  resourceName: 'service',
  table: services,
  idColumn: services.id,
  columns: tableColumns(services),
  searchableColumns: [services.title, services.slug, services.summary],
  sortableColumns: ['title', 'slug', 'orderIndex', 'createdAt', 'updatedAt'],
  defaultSortColumn: 'orderIndex',
  createSchema: createServiceSchema,
  updateSchema: updateServiceSchema,
  filterParams: { categoryId: services.categoryId, isPublished: services.isPublished },
  permissions: {
    read: PERMISSIONS.SERVICES_READ,
    write: PERMISSIONS.SERVICES_WRITE,
    delete: PERMISSIONS.SERVICES_DELETE,
  },
});
