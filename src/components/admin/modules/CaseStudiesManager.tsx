import { useEffect, useState } from 'react';
import { api } from '../../../lib/admin/api-client';
import ResourceManager, { type FieldConfig } from '../ResourceManager';
import StatusBadge from '../ui/StatusBadge';
import type { Column } from '../ui/Table';

interface CaseStudy {
  id: string;
  portfolioProjectId: string | null;
  slug: string;
  title: string;
  client: string | null;
  industry: string | null;
  challenge: string | null;
  solution: string | null;
  results: string | null;
  content: string | null;
  featuredImageId: string | null;
  isPublished: boolean;
  publishedAt: string | null;
}

interface PortfolioProject {
  id: string;
  title: string;
}

export default function CaseStudiesManager({
  canWrite,
  canDelete,
}: {
  canWrite: boolean;
  canDelete: boolean;
}) {
  const [projects, setProjects] = useState<PortfolioProject[]>([]);

  useEffect(() => {
    api
      .list<PortfolioProject>('/api/portfolio-projects', { page: 1, pageSize: 100 })
      .then((res) => setProjects(res.data))
      .catch(() => setProjects([]));
  }, []);

  const fields: FieldConfig[] = [
    { name: 'title', label: 'Title', type: 'text', required: true },
    { name: 'slug', label: 'Slug', type: 'text', required: true },
    { name: 'client', label: 'Client', type: 'text' },
    { name: 'industry', label: 'Industry', type: 'text' },
    {
      name: 'portfolioProjectId',
      label: 'Related portfolio project',
      type: 'select',
      options: projects.map((p) => ({ value: p.id, label: p.title })),
    },
    { name: 'featuredImageId', label: 'Featured image', type: 'media' },
    { name: 'challenge', label: 'Challenge', type: 'textarea', fullWidth: true },
    { name: 'solution', label: 'Solution', type: 'textarea', fullWidth: true },
    { name: 'results', label: 'Results', type: 'textarea', fullWidth: true },
    { name: 'content', label: 'Full story', type: 'richtext', fullWidth: true },
    { name: 'isPublished', label: 'Published', type: 'checkbox' },
    { name: 'publishedAt', label: 'Publish date', type: 'date' },
  ];

  const columns: Column<CaseStudy>[] = [
    { key: 'title', label: 'Title', sortable: true },
    { key: 'client', label: 'Client' },
    { key: 'industry', label: 'Industry' },
    {
      key: 'isPublished',
      label: 'Status',
      render: (row) =>
        row.isPublished ? (
          <StatusBadge tone="success" label="Published" />
        ) : (
          <StatusBadge tone="neutral" label="Draft" />
        ),
    },
  ];

  return (
    <ResourceManager<CaseStudy>
      title="Case Study"
      description="Challenge, solution, and results write-ups for portfolio projects."
      endpoint="/api/case-studies"
      columns={columns}
      searchPlaceholder="Search case studies…"
      fields={fields}
      defaultValues={{
        title: '',
        slug: '',
        client: '',
        industry: '',
        portfolioProjectId: '',
        featuredImageId: null,
        challenge: '',
        solution: '',
        results: '',
        content: '',
        isPublished: false,
        publishedAt: '',
      }}
      canWrite={canWrite}
      canDelete={canDelete}
      defaultSortBy="createdAt"
      emptyIcon="filetext"
      filters={[
        {
          key: 'isPublished',
          label: 'Status',
          options: [
            { value: 'true', label: 'Published' },
            { value: 'false', label: 'Draft' },
          ],
        },
      ]}
      transformSubmit={(values, isEdit) => ({
        ...values,
        portfolioProjectId: values.portfolioProjectId || null,
        isPublished: Boolean(values.isPublished),
        publishedAt:
          values.isPublished && !values.publishedAt && !isEdit
            ? new Date().toISOString()
            : values.publishedAt,
      })}
      deleteWarning={(row) => `"${row.title}" will be permanently removed.`}
    />
  );
}
