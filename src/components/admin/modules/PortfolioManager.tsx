import { useEffect, useState } from 'react';
import { api } from '../../../lib/admin/api-client';
import ResourceManager, { type FieldConfig } from '../ResourceManager';
import StatusBadge from '../ui/StatusBadge';
import type { Column } from '../ui/Table';

interface PortfolioProject {
  id: string;
  slug: string;
  title: string;
  clientName: string | null;
  industry: string | null;
  projectUrl: string | null;
  summary: string | null;
  content: string | null;
  serviceIds: string[];
  resultsMetrics: Record<string, string>;
  featuredImageId: string | null;
  isFeatured: boolean;
  isPublished: boolean;
  publishedAt: string | null;
}

interface Service {
  id: string;
  title: string;
}

export default function PortfolioManager({
  canWrite,
  canDelete,
}: {
  canWrite: boolean;
  canDelete: boolean;
}) {
  const [services, setServices] = useState<Service[]>([]);

  useEffect(() => {
    api
      .list<Service>('/api/services', { page: 1, pageSize: 100 })
      .then((res) => setServices(res.data))
      .catch(() => setServices([]));
  }, []);

  const fields: FieldConfig[] = [
    { name: 'title', label: 'Project title', type: 'text', required: true },
    { name: 'slug', label: 'Slug', type: 'text', required: true },
    { name: 'clientName', label: 'Client name', type: 'text' },
    { name: 'industry', label: 'Industry', type: 'text' },
    { name: 'projectUrl', label: 'Project URL', type: 'url', hint: 'Live site, if public' },
    { name: 'featuredImageId', label: 'Featured image', type: 'media' },
    { name: 'summary', label: 'Summary', type: 'textarea', fullWidth: true },
    {
      name: 'serviceIds',
      label: 'Services provided',
      type: 'tags',
      fullWidth: true,
      tagOptions: services.map((s) => ({ id: s.id, label: s.title })),
    },
    {
      name: 'resultsMetrics',
      label: 'Project outcomes',
      type: 'json-kv',
      fullWidth: true,
      hint: 'Qualitative outcomes shown on the project page (e.g. "Scope" → "SEO + paid search").',
    },
    { name: 'imageIds', label: 'Project images', type: 'gallery', fullWidth: true },
    { name: 'content', label: 'Full write-up', type: 'richtext', fullWidth: true },
    { name: 'isFeatured', label: 'Featured on homepage', type: 'checkbox' },
    { name: 'isPublished', label: 'Published', type: 'checkbox' },
    { name: 'publishedAt', label: 'Publish date', type: 'date' },
  ];

  const columns: Column<PortfolioProject>[] = [
    { key: 'title', label: 'Title', sortable: true },
    { key: 'clientName', label: 'Client' },
    { key: 'industry', label: 'Industry' },
    {
      key: 'isFeatured',
      label: 'Featured',
      render: (row) => (row.isFeatured ? <StatusBadge tone="info" label="Featured" /> : '—'),
    },
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
    <ResourceManager<PortfolioProject>
      title="Portfolio Project"
      description="Client work shown on /portfolio and linked case studies."
      endpoint="/api/portfolio-projects"
      columns={columns}
      searchPlaceholder="Search projects…"
      fields={fields}
      defaultValues={{
        title: '',
        slug: '',
        clientName: '',
        industry: '',
        projectUrl: '',
        featuredImageId: null,
        summary: '',
        serviceIds: [],
        resultsMetrics: {},
        imageIds: [],
        content: '',
        isFeatured: false,
        isPublished: false,
        publishedAt: '',
      }}
      canWrite={canWrite}
      canDelete={canDelete}
      defaultSortBy="createdAt"
      emptyIcon="image"
      filters={[
        {
          key: 'isPublished',
          label: 'Status',
          options: [
            { value: 'true', label: 'Published' },
            { value: 'false', label: 'Draft' },
          ],
        },
        {
          key: 'isFeatured',
          label: 'Featured',
          options: [
            { value: 'true', label: 'Featured' },
            { value: 'false', label: 'Not featured' },
          ],
        },
      ]}
      beforeEdit={(row) =>
        api
          .get<PortfolioProject & { images: { id: string }[] }>(`/api/portfolio-projects/${row.id}`)
          .then((full) => ({ imageIds: full.images.map((img) => img.id) }))
      }
      deleteWarning={(row) => `"${row.title}" will be permanently removed.`}
    />
  );
}
