import { testimonials } from '../db/schema';
import { createTestimonialSchema, updateTestimonialSchema } from '../validation/content';
import { createCrudResource, tableColumns } from '../http/crud';
import { PERMISSIONS } from '../auth/permissions';

export const testimonialResource = createCrudResource({
  resourceName: 'testimonial',
  table: testimonials,
  idColumn: testimonials.id,
  columns: tableColumns(testimonials),
  searchableColumns: [testimonials.clientName, testimonials.clientCompany, testimonials.content],
  sortableColumns: ['clientName', 'orderIndex', 'createdAt', 'rating'],
  defaultSortColumn: 'orderIndex',
  createSchema: createTestimonialSchema,
  updateSchema: updateTestimonialSchema,
  filterParams: {
    isPublished: testimonials.isPublished,
    portfolioProjectId: testimonials.portfolioProjectId,
  },
  permissions: {
    read: PERMISSIONS.TESTIMONIALS_READ,
    write: PERMISSIONS.TESTIMONIALS_WRITE,
    delete: PERMISSIONS.TESTIMONIALS_DELETE,
  },
});
