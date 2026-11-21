import { caseStudies } from '../db/schema';
import { createCaseStudySchema, updateCaseStudySchema } from '../validation/content';
import { createCrudResource, tableColumns } from '../http/crud';
import { PERMISSIONS } from '../auth/permissions';

export const caseStudyResource = createCrudResource({
  resourceName: 'case_study',
  table: caseStudies,
  idColumn: caseStudies.id,
  columns: tableColumns(caseStudies),
  searchableColumns: [caseStudies.title, caseStudies.slug, caseStudies.client],
  sortableColumns: ['title', 'slug', 'createdAt', 'updatedAt', 'publishedAt'],
  defaultSortColumn: 'createdAt',
  createSchema: createCaseStudySchema,
  updateSchema: updateCaseStudySchema,
  filterParams: {
    isPublished: caseStudies.isPublished,
    portfolioProjectId: caseStudies.portfolioProjectId,
  },
  permissions: {
    read: PERMISSIONS.CASE_STUDIES_READ,
    write: PERMISSIONS.CASE_STUDIES_WRITE,
    delete: PERMISSIONS.CASE_STUDIES_DELETE,
  },
});
