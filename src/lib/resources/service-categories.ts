import { serviceCategories } from '../db/schema';
import { createServiceCategorySchema, updateServiceCategorySchema } from '../validation/content';
import { createCrudResource, tableColumns } from '../http/crud';
import { PERMISSIONS } from '../auth/permissions';

export const serviceCategoryResource = createCrudResource({
  resourceName: 'service_category',
  table: serviceCategories,
  idColumn: serviceCategories.id,
  columns: tableColumns(serviceCategories),
  searchableColumns: [serviceCategories.name, serviceCategories.slug],
  sortableColumns: ['name', 'slug', 'orderIndex'],
  defaultSortColumn: 'orderIndex',
  createSchema: createServiceCategorySchema,
  updateSchema: updateServiceCategorySchema,
  permissions: {
    read: PERMISSIONS.SERVICES_READ,
    write: PERMISSIONS.SERVICES_WRITE,
    delete: PERMISSIONS.SERVICES_DELETE,
  },
});
